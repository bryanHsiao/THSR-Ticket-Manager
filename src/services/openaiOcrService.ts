/**
 * OpenAI OCR Service
 * Uses GPT-4 Vision API for ticket OCR recognition
 *
 * Much faster and more accurate than Tesseract.js
 */

import { OPENAI_API_KEY, OPENAI_API_BASE, isOpenAIConfigured } from '../config/openai';
import { blobToBase64 } from '../utils/imageUtils';
import type { OCRResult, TravelDirection } from '../types/ticket';

/**
 * THSR station names for validation
 */
const THSR_STATIONS = [
  '南港', '台北', '板橋', '桃園', '新竹', '苗栗',
  '台中', '彰化', '雲林', '嘉義', '台南', '左營',
];

/**
 * Station index for direction detection
 */
const STATION_INDEX: Record<string, number> = {
  '南港': 0, '台北': 1, '板橋': 2, '桃園': 3, '新竹': 4, '苗栗': 5,
  '台中': 6, '彰化': 7, '雲林': 8, '嘉義': 9, '台南': 10, '左營': 11,
};

/**
 * OpenAI OCR Service class
 */
class OpenAIOcrService {
  /**
   * Recognize ticket information from image using GPT-4 Vision
   *
   * @param file - Image file to process
   * @returns Promise<OCRResult> - Extracted ticket information
   */
  async recognizeTicket(file: File): Promise<OCRResult> {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI API 未設定。請在 .env 檔案中設定 VITE_OPENAI_API_KEY。');
    }

    // Convert image to base64
    const base64Image = await blobToBase64(file);

    // Call GPT-4 Vision API
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `你是台灣高鐵車票 OCR 辨識專家。請從車票圖片中提取以下資訊並以 JSON 格式回傳：
- ticketNumber: 交易序號，格式為 XX-X-XX-X-XXX-XXXX（6組數字用連字號分隔），例如 02-1-18-1-364-0235 或 12-1-31-1-345-0036。通常在「信用卡」文字旁邊或下方。
- travelDate: 乘車日期 (格式: YYYY-MM-DD)
- travelTime: 發車時間 (格式: HH:mm)，自由座車票沒有時間則設為 null
- departure: 起站 (必須是以下之一: 南港, 台北, 板橋, 桃園, 新竹, 苗栗, 台中, 彰化, 雲林, 嘉義, 台南, 左營)
- destination: 迄站 (必須是以下之一: 南港, 台北, 板橋, 桃園, 新竹, 苗栗, 台中, 彰化, 雲林, 嘉義, 台南, 左營)

重要：
1. ticketNumber 是含有 5 個連字號的交易序號（如 XX-X-XX-X-XXX-XXXX），不是 8 位數的乘客編號
2. 請務必找出這組含連字號的號碼

只回傳 JSON，不要有其他文字。如果無法辨識某欄位，該欄位設為 null。`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: '請辨識這張高鐵車票的資訊',
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API 錯誤: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    return this.parseResponse(content);
  }

  /**
   * Parse GPT response into OCRResult
   */
  private parseResponse(content: string): OCRResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr.trim());

      // Validate and normalize station names
      const departure = this.normalizeStation(parsed.departure);
      const destination = this.normalizeStation(parsed.destination);

      // Determine direction based on stations
      const direction = this.detectDirection(departure, destination);

      // Validate ticket number (13 digits)
      const ticketNumber = this.normalizeTicketNumber(parsed.ticketNumber);

      // Validate and normalize date
      const travelDate = this.normalizeDate(parsed.travelDate);

      // Validate and normalize time
      const travelTime = this.normalizeTime(parsed.travelTime);

      return {
        ticketNumber,
        travelDate,
        travelTime,
        direction,
        departure,
        destination,
        confidence: 0.95, // GPT-4 Vision is generally very accurate
        rawText: content,
      };
    } catch (error) {
      console.error('Failed to parse GPT response:', content, error);
      return {
        ticketNumber: null,
        travelDate: null,
        travelTime: null,
        direction: null,
        departure: null,
        destination: null,
        confidence: 0,
        rawText: content,
      };
    }
  }

  /**
   * Normalize station name to match expected values
   */
  private normalizeStation(station: string | null): string | null {
    if (!station) return null;

    // Direct match
    if (THSR_STATIONS.includes(station)) {
      return station;
    }

    // Try to find partial match
    const normalized = station.trim();
    for (const s of THSR_STATIONS) {
      if (normalized.includes(s) || s.includes(normalized)) {
        return s;
      }
    }

    return station;
  }

  /**
   * Detect travel direction based on station positions
   */
  private detectDirection(departure: string | null, destination: string | null): TravelDirection | null {
    if (!departure || !destination) return null;

    const depIndex = STATION_INDEX[departure];
    const destIndex = STATION_INDEX[destination];

    if (depIndex === undefined || destIndex === undefined) return null;

    return depIndex < destIndex ? 'southbound' : 'northbound';
  }

  /**
   * Normalize ticket number to 13 digits
   * Input format: XX-X-XX-X-XXX-XXXX (e.g., 02-1-17-0-348-0260)
   * Output: digits only (e.g., 0211703480260)
   */
  private normalizeTicketNumber(ticketNumber: string | null): string | null {
    if (!ticketNumber) return null;

    // Remove all non-digit characters (hyphens, spaces, etc.)
    const digits = ticketNumber.replace(/\D/g, '');

    // Return if we have 13 digits
    if (digits.length === 13) {
      return digits;
    }

    return digits || ticketNumber;
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private normalizeDate(date: string | null): string | null {
    if (!date) return null;

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // Try to parse various formats
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return date;
  }

  /**
   * Normalize time to HH:mm format
   */
  private normalizeTime(time: string | null): string | null {
    if (!time) return null;

    // Already in correct format
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time;
    }

    // Try to extract HH:mm
    const match = time.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = match[2];
      return `${hours}:${minutes}`;
    }

    return time;
  }
}

// Export singleton instance
export const openaiOcrService = new OpenAIOcrService();

// Export class for testing
export { OpenAIOcrService };
