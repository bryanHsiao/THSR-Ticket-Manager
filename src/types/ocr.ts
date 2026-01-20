/**
 * OCR Types
 * Defines types for OCR engine management and fallback mechanism
 */

import type { OCRResult } from './ticket';

/**
 * Available OCR engine types
 * - openai: GPT-4 Vision API (fast, accurate)
 * - manual: Manual input mode (no OCR, user enters data)
 */
export type OCREngineType = 'openai' | 'manual';

/**
 * Extended OCR result with metadata about which engine was used
 */
export interface OCRResultWithMeta extends OCRResult {
  /** Which OCR engine was used for this recognition */
  engineUsed: OCREngineType;
  /** Whether a fallback engine was used */
  fallbackUsed: boolean;
  /** Reason for fallback (if applicable) */
  fallbackReason?: string;
}

/**
 * Error class for OCR errors that should trigger fallback
 *
 * Throw this error when:
 * - Network is offline
 * - API timeout
 * - Server errors (5xx)
 * - Rate limiting (429)
 */
export class OCRFallbackError extends Error {
  constructor(
    message: string,
    public readonly engineType: OCREngineType,
    public readonly shouldFallback: boolean = true
  ) {
    super(message);
    this.name = 'OCRFallbackError';
  }
}

/**
 * Error class for OCR errors that should NOT trigger fallback
 *
 * Throw this error when:
 * - Invalid API key (401)
 * - Forbidden (403)
 * - Parse errors (not a network issue)
 */
export class OCRNonFallbackError extends Error {
  constructor(
    message: string,
    public readonly engineType: OCREngineType
  ) {
    super(message);
    this.name = 'OCRNonFallbackError';
  }
}

/**
 * OCR Engine interface
 * All OCR engines must implement this interface
 */
export interface IOCREngine {
  /** Engine type identifier */
  readonly engineType: OCREngineType;
  /** Priority for engine selection (lower = higher priority) */
  readonly priority: number;
  /** Check if this engine is available for use */
  isAvailable(): boolean;
  /** Perform OCR on the given image file */
  recognizeTicket(file: File): Promise<OCRResult>;
}
