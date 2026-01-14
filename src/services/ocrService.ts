/**
 * OCR Service
 * Task 14: OCR Service Initialization
 * Task 15: Ticket Recognition Logic (parseTicketText detailed implementation)
 *
 * Uses tesseract.js for optical character recognition
 * Implements Tesseract worker initialization with Traditional Chinese + English language support
 *
 * Requirements: 1.2 (OCR recognition for THSR ticket images)
 * Requirements: 1.3 (Extract travel date and time)
 * Requirements: 1.4 (Recognize travel direction)
 *
 * Features:
 * - Initializes Tesseract worker with Traditional Chinese (chi_tra) + English (eng) language packs
 * - Provides worker lifecycle management (initialize/terminate)
 * - Recognizes ticket images and extracts structured information
 * - Handles HEIC format conversion using heic2any
 * - Provides progress reporting mechanism
 * - Returns empty OCRResult on recognition failure (no throw)
 */

import Tesseract from 'tesseract.js';
import type { OCRResult, TravelDirection } from '../types/ticket';
import { prepareImageForOCR } from '../utils/imageUtils';
import {
  parseTicketNumber,
  parseDirection,
  parseDateTime,
  normalizeStation,
  getDirectionFromStations,
  STATIONS,
  STATION_ALIASES,
} from '../utils/ticketParser';

/**
 * Language configuration for Tesseract
 * Traditional Chinese + English for better recognition of mixed content
 */
const LANGUAGES = 'chi_tra+eng';

/**
 * Progress callback type for OCR operations
 */
export type OCRProgressCallback = (progress: number, status: string) => void;

/**
 * OCR Service
 *
 * Provides methods for OCR operations including:
 * - initialize(): Initializes Tesseract worker with Traditional Chinese + English language packs
 * - recognizeTicket(): Recognizes ticket image and extracts information
 * - terminate(): Releases Tesseract worker resources
 */
class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private progressCallback: OCRProgressCallback | null = null;

  /**
   * Set progress callback for OCR operations
   *
   * @param callback - Function to receive progress updates (progress: 0-100, status: string)
   */
  setProgressCallback(callback: OCRProgressCallback | null): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress to callback if set
   *
   * @param progress - Progress value (0-100)
   * @param status - Status message
   */
  private reportProgress(progress: number, status: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, status);
    }
  }

  /**
   * Initialize the Tesseract worker with Traditional Chinese + English language support
   *
   * Creates a Tesseract worker and loads the Traditional Chinese (chi_tra) + English (eng) language packs.
   * This method is idempotent - calling it multiple times will only initialize once.
   *
   * @returns Promise<void> - Resolves when worker is ready
   * @throws Error if worker initialization fails
   */
  async initialize(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Skip if already initialized
    if (this.isInitialized && this.worker) {
      return;
    }

    // Create initialization promise for concurrent calls
    this.initializationPromise = this.createWorker();

    try {
      await this.initializationPromise;
    } finally {
      // Clear the promise after completion (success or failure)
      this.initializationPromise = null;
    }
  }

  /**
   * Create and initialize the Tesseract worker
   *
   * @returns Promise<void>
   */
  private async createWorker(): Promise<void> {
    try {
      console.log('OCRService: Initializing Tesseract worker with chi_tra + eng language packs...');
      this.reportProgress(0, '正在初始化 OCR 引擎...');

      // Create worker with Traditional Chinese + English languages
      // tesseract.js v7 uses createWorker with language parameter
      this.worker = await Tesseract.createWorker(LANGUAGES, Tesseract.OEM.LSTM_ONLY, {
        logger: (message) => {
          // Log progress for debugging and UI progress display
          if (message.status === 'loading tesseract core') {
            const percent = Math.round(message.progress * 20);
            console.log(`OCRService: Loading Tesseract core (${percent}%)`);
            this.reportProgress(percent, '載入 OCR 核心...');
          } else if (message.status === 'initializing tesseract') {
            const percent = 20 + Math.round(message.progress * 20);
            console.log(`OCRService: Initializing Tesseract (${percent}%)`);
            this.reportProgress(percent, '初始化 OCR...');
          } else if (message.status === 'loading language traineddata') {
            const percent = 40 + Math.round(message.progress * 40);
            console.log(`OCRService: Loading language data (${percent}%)`);
            this.reportProgress(percent, '載入語言包...');
          }
        },
      });

      this.isInitialized = true;
      this.reportProgress(100, 'OCR 引擎已就緒');
      console.log('OCRService: Tesseract worker initialized successfully with chi_tra + eng');
    } catch (error) {
      this.worker = null;
      this.isInitialized = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OCRService: Failed to initialize Tesseract worker:', errorMessage);
      throw new Error(`Failed to initialize OCR service: ${errorMessage}`);
    }
  }

  /**
   * Recognize ticket image and extract information
   *
   * Performs OCR on the provided ticket image using Tesseract.js with
   * Traditional Chinese + English language support, then parses the recognized text
   * to extract structured ticket information.
   *
   * Features:
   * - Handles HEIC format conversion automatically
   * - Reports progress through callback
   * - Returns empty OCRResult on failure instead of throwing
   *
   * @param imageFile - The ticket image file to recognize
   * @returns Promise<OCRResult> - The recognition result with parsed ticket fields
   */
  async recognizeTicket(imageFile: File): Promise<OCRResult> {
    // Ensure worker is initialized
    if (!this.isInitialized || !this.worker) {
      console.warn('OCRService: Worker not initialized, attempting to initialize...');
      try {
        await this.initialize();
      } catch {
        console.error('OCRService: Failed to initialize worker for recognition');
        return this.createEmptyResult();
      }
    }

    try {
      console.log('OCRService: Starting ticket recognition...');
      this.reportProgress(0, '準備圖片...');

      // Process image: convert HEIC if needed
      let processedFile: File;
      try {
        processedFile = await prepareImageForOCR(imageFile);
        this.reportProgress(10, '圖片處理完成');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('OCRService: Failed to process image:', errorMessage);
        return this.createEmptyResult();
      }

      this.reportProgress(20, '正在辨識文字...');

      // Perform OCR recognition
      const result = await this.worker!.recognize(processedFile);
      const rawText = result.data.text;

      this.reportProgress(80, '解析辨識結果...');
      console.log('OCRService: OCR completed, parsing text...');

      // Parse the recognized text to extract ticket information
      const ocrResult = this.parseTicketText(rawText);

      this.reportProgress(100, '辨識完成');
      console.log('OCRService: Ticket recognition completed with confidence:', ocrResult.confidence);

      return ocrResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('OCRService: Failed to recognize ticket:', errorMessage);
      // Return empty result instead of throwing
      return this.createEmptyResult();
    }
  }

  /**
   * Create an empty OCRResult for error cases
   *
   * @returns OCRResult - Empty result with confidence 0
   */
  private createEmptyResult(): OCRResult {
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
   * Parse recognized text to extract ticket information
   *
   * Uses the ticketParser utilities to extract structured information:
   * - Ticket number (13 digits)
   * - Travel date and time
   * - Direction (northbound/southbound)
   * - Departure and destination stations
   *
   * Confidence is calculated as: number of successfully parsed fields / total fields
   * Total fields considered: ticketNumber, travelDate, travelTime, direction, departure, destination (6 fields)
   *
   * @param text - The raw OCR text to parse
   * @returns OCRResult - Parsed ticket information with confidence score
   */
  private parseTicketText(text: string): OCRResult {
    // Parse ticket number
    const ticketNumber = parseTicketNumber(text);

    // Parse date and time
    const dateTime = parseDateTime(text);
    const travelDate = dateTime?.date || null;
    const travelTime = dateTime?.time || null;

    // Parse stations from text
    const stations = this.extractStations(text);
    const departure = stations.departure;
    const destination = stations.destination;

    // Parse direction - first try explicit keywords, then infer from stations
    let direction: TravelDirection | null = parseDirection(text);
    if (!direction && departure && destination) {
      direction = getDirectionFromStations(departure, destination);
    }

    // Calculate confidence based on successfully parsed fields
    const confidence = this.calculateConfidence({
      ticketNumber,
      travelDate,
      travelTime,
      direction,
      departure,
      destination,
    });

    return {
      ticketNumber,
      travelDate,
      travelTime,
      direction,
      departure,
      destination,
      confidence,
      rawText: text,
    };
  }

  /**
   * Extract departure and destination stations from OCR text
   *
   * Scans the text for known THSR station names (including English names) and returns
   * the first two unique stations found (ordered by position in text) as departure and destination.
   *
   * @param text - The raw OCR text to parse
   * @returns Object with departure and destination station names (or null if not found)
   */
  private extractStations(text: string): { departure: string | null; destination: string | null } {
    if (!text) {
      return { departure: null, destination: null };
    }

    // Find all station mentions in the text
    const foundStations: { name: string; position: number }[] = [];

    // First check standard Chinese station names
    for (const station of STATIONS) {
      const idx = text.indexOf(station);
      if (idx !== -1) {
        foundStations.push({
          name: station,
          position: idx,
        });
      }
    }

    // Also check aliases (including English names)
    for (const [alias, standard] of Object.entries(STATION_ALIASES)) {
      // Case insensitive search for English names
      const lowerText = text.toLowerCase();
      const lowerAlias = alias.toLowerCase();
      const idx = lowerText.indexOf(lowerAlias);
      if (idx !== -1) {
        // Check if this position is already found by a standard name
        const alreadyFound = foundStations.some(
          s => Math.abs(s.position - idx) < 3 && normalizeStation(s.name) === standard
        );
        if (!alreadyFound) {
          foundStations.push({
            name: standard,
            position: idx,
          });
        }
      }
    }

    // Sort by position in text
    foundStations.sort((a, b) => a.position - b.position);

    // Remove duplicates (keep first occurrence of each normalized name)
    const uniqueStations: string[] = [];
    for (const station of foundStations) {
      const normalized = normalizeStation(station.name);
      if (!uniqueStations.includes(normalized)) {
        uniqueStations.push(normalized);
      }
    }

    // First station is departure, second is destination
    return {
      departure: uniqueStations.length > 0 ? uniqueStations[0] : null,
      destination: uniqueStations.length > 1 ? uniqueStations[1] : null,
    };
  }

  /**
   * Calculate recognition confidence based on successfully parsed fields
   *
   * Confidence formula: number of non-null fields / total fields (6)
   * Fields considered:
   * - ticketNumber (13-digit ticket number)
   * - travelDate (YYYY-MM-DD format)
   * - travelTime (HH:mm format)
   * - direction (northbound/southbound)
   * - departure (station name)
   * - destination (station name)
   *
   * @param fields - Object containing parsed field values
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidence(fields: {
    ticketNumber: string | null;
    travelDate: string | null;
    travelTime: string | null;
    direction: TravelDirection | null;
    departure: string | null;
    destination: string | null;
  }): number {
    const totalFields = 6;
    let parsedFields = 0;

    if (fields.ticketNumber) parsedFields++;
    if (fields.travelDate) parsedFields++;
    if (fields.travelTime) parsedFields++;
    if (fields.direction) parsedFields++;
    if (fields.departure) parsedFields++;
    if (fields.destination) parsedFields++;

    // Return confidence as a decimal (0-1)
    return parsedFields / totalFields;
  }

  /**
   * Terminate the Tesseract worker and release resources
   *
   * Properly cleans up the Tesseract worker to free memory.
   * Safe to call multiple times.
   *
   * @returns Promise<void> - Resolves when worker is terminated
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        console.log('OCRService: Terminating Tesseract worker...');
        await this.worker.terminate();
        console.log('OCRService: Tesseract worker terminated successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('OCRService: Error terminating Tesseract worker:', errorMessage);
      } finally {
        this.worker = null;
        this.isInitialized = false;
      }
    }
  }

  /**
   * Check if the OCR service is initialized
   *
   * @returns boolean - true if worker is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get the underlying Tesseract worker
   * Useful for advanced operations or testing
   *
   * @returns Tesseract.Worker | null - The worker instance or null if not initialized
   */
  getWorker(): Tesseract.Worker | null {
    return this.worker;
  }
}

// Export singleton instance
export const ocrService = new OCRService();

// Export class for testing purposes
export { OCRService };
