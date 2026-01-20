/**
 * OCR Manager
 * Manages OCR recognition with manual input fallback
 *
 * Strategy:
 * - Primary: OpenAI GPT-4 Vision (fast, accurate, requires API key)
 * - Fallback: Manual input mode (empty form for user to fill)
 *
 * When OpenAI is unavailable (not configured, offline, errors),
 * returns an empty result so the user can manually enter ticket data.
 * The image is still captured for reference.
 */

import { openaiOcrService } from './openaiOcrService';
import { isOpenAIConfigured } from '../config/openai';
import {
  OCRFallbackError,
  OCRNonFallbackError,
  type OCREngineType,
  type OCRResultWithMeta,
} from '../types/ocr';
import type { OCRResult } from '../types/ticket';

/**
 * Create an empty OCR result for manual input mode
 */
function createEmptyResult(): OCRResult {
  return {
    ticketNumber: null,
    travelDate: null,
    travelTime: null,
    direction: null,
    departure: null,
    destination: null,
    confidence: 0,
    rawText: '',
  };
}

/**
 * OCR Manager class
 * Provides unified OCR interface with manual input fallback
 */
class OCRManager {
  /**
   * Recognize ticket information from image
   * Falls back to manual input when OpenAI is unavailable
   *
   * @param file - Image file to process
   * @returns Promise<OCRResultWithMeta> - OCR result with engine metadata
   */
  async recognizeTicket(file: File): Promise<OCRResultWithMeta> {
    // If OpenAI is not configured, return empty result for manual input
    if (!isOpenAIConfigured()) {
      console.log('OCRManager: OpenAI not configured, switching to manual input mode');
      return this.wrapResult(createEmptyResult(), 'manual', false, 'OpenAI API 未設定');
    }

    // Try OpenAI
    try {
      console.log('OCRManager: Attempting OpenAI OCR...');
      const result = await openaiOcrService.recognizeTicket(file);
      console.log('OCRManager: OpenAI OCR successful');
      return this.wrapResult(result, 'openai', false);
    } catch (error) {
      // Check if we should fall back to manual input
      if (error instanceof OCRFallbackError) {
        console.warn(`OCRManager: OpenAI failed: ${error.message}`);
        console.log('OCRManager: Falling back to manual input mode');
        return this.wrapResult(createEmptyResult(), 'manual', true, error.message);
      }

      // Non-fallback error (e.g., invalid API key) - still allow manual input
      if (error instanceof OCRNonFallbackError) {
        console.error(`OCRManager: OpenAI error: ${error.message}`);
        // For non-fallback errors, we still allow manual input but show the error
        return this.wrapResult(createEmptyResult(), 'manual', true, error.message);
      }

      // Unknown error - fall back to manual input
      console.error('OCRManager: Unknown error:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      return this.wrapResult(createEmptyResult(), 'manual', true, errorMessage);
    }
  }

  /**
   * Wrap OCRResult with metadata
   */
  private wrapResult(
    result: OCRResult,
    engineUsed: OCREngineType,
    fallbackUsed: boolean,
    fallbackReason?: string
  ): OCRResultWithMeta {
    return {
      ...result,
      engineUsed,
      fallbackUsed,
      fallbackReason,
    };
  }

  /**
   * Get the display name for an OCR engine
   */
  getEngineDisplayName(engineType: OCREngineType): string {
    switch (engineType) {
      case 'openai':
        return 'GPT-4o';
      case 'manual':
        return '手動輸入';
      default:
        return engineType;
    }
  }

  /**
   * Check if OpenAI OCR is available
   */
  isOpenAIAvailable(): boolean {
    return isOpenAIConfigured();
  }
}

// Export singleton instance
export const ocrManager = new OCRManager();

// Export class for testing
export { OCRManager };
