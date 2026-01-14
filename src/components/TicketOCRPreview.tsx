/**
 * Ticket OCR Preview Component
 * Task 28: Create TicketOCRPreview component
 *
 * Displays the uploaded ticket image alongside OCR recognition results
 * Allows user to review and edit recognized data before confirming
 *
 * Requirements: 1.5 (manual editing), 2.2 (record editing)
 */

import { useState, useCallback, useMemo } from 'react';
import type { OCRResult, TicketRecord } from '../types/ticket';
import { TicketForm, type TicketFormData } from './TicketForm';

/**
 * Props for the TicketOCRPreview component
 */
export interface TicketOCRPreviewProps {
  /** OCR recognition result */
  ocrResult: OCRResult;
  /** Image URL (Blob URL or Base64) to display */
  imageUrl: string;
  /** Callback when user confirms the ticket data */
  onConfirm: (ticket: TicketRecord) => void;
  /** Callback when user cancels the preview */
  onCancel: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

/**
 * Get confidence level display configuration
 * @param confidence - Confidence value 0-1
 * @returns Display configuration for confidence indicator
 */
function getConfidenceConfig(confidence: number): {
  level: 'high' | 'medium' | 'low';
  text: string;
  colorClass: string;
  bgClass: string;
  barColorClass: string;
} {
  if (confidence >= 0.8) {
    return {
      level: 'high',
      text: '高',
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-900/30',
      barColorClass: 'bg-green-500',
    };
  }
  if (confidence >= 0.5) {
    return {
      level: 'medium',
      text: '中',
      colorClass: 'text-yellow-600 dark:text-yellow-400',
      bgClass: 'bg-yellow-50 dark:bg-yellow-900/30',
      barColorClass: 'bg-yellow-500',
    };
  }
  return {
    level: 'low',
    text: '低',
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/30',
    barColorClass: 'bg-red-500',
  };
}

/**
 * Generate a UUID v4
 * @returns A unique identifier string
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * TicketOCRPreview Component
 *
 * Provides a split-view interface for reviewing OCR results:
 * - Left side: Uploaded ticket image
 * - Right side: Editable form pre-filled with OCR data
 * - Bottom: Confidence indicator and action buttons
 *
 * Features:
 * - Responsive layout (side-by-side on desktop, stacked on mobile)
 * - Confidence indicator with visual progress bar
 * - Pre-filled editable form using TicketForm component
 * - Image preview with zoom capability
 * - Traditional Chinese interface
 */
export function TicketOCRPreview({
  ocrResult,
  imageUrl,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: TicketOCRPreviewProps) {
  // State for image zoom modal
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Convert OCR result to initial form data
  const initialFormData = useMemo(() => ({
    ticketNumber: ocrResult.ticketNumber || '',
    travelDate: ocrResult.travelDate || '',
    travelTime: ocrResult.travelTime || '',
    direction: ocrResult.direction || 'northbound',
    departure: ocrResult.departure || '',
    destination: ocrResult.destination || '',
  }), [ocrResult]);

  // Confidence configuration
  const confidenceConfig = useMemo(
    () => getConfidenceConfig(ocrResult.confidence),
    [ocrResult.confidence]
  );

  /**
   * Handle form submission
   * Creates a full TicketRecord and calls onConfirm
   */
  const handleFormSubmit = useCallback(
    (formData: TicketFormData) => {
      const now = new Date().toISOString();
      const ticket: TicketRecord = {
        id: generateUUID(),
        ticketNumber: formData.ticketNumber,
        travelDate: formData.travelDate,
        travelTime: formData.travelTime,
        direction: formData.direction,
        departure: formData.departure,
        destination: formData.destination,
        purpose: formData.purpose,
        imageUrl: imageUrl,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'local',
      };
      onConfirm(ticket);
    },
    [imageUrl, onConfirm]
  );

  /**
   * Toggle image zoom modal
   */
  const handleImageClick = useCallback(() => {
    setIsImageZoomed(true);
  }, []);

  /**
   * Close image zoom modal
   */
  const handleCloseZoom = useCallback(() => {
    setIsImageZoomed(false);
  }, []);

  return (
    <div className="w-full">
      {/* Confidence Indicator */}
      <div
        className={`
          mb-4 p-3
          rounded-lg
          border
          ${confidenceConfig.bgClass}
          ${confidenceConfig.level === 'high'
            ? 'border-green-200 dark:border-green-800'
            : confidenceConfig.level === 'medium'
            ? 'border-yellow-200 dark:border-yellow-800'
            : 'border-red-200 dark:border-red-800'
          }
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg
              className={`w-5 h-5 ${confidenceConfig.colorClass}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              辨識信心度
            </span>
          </div>
          <span className={`text-sm font-semibold ${confidenceConfig.colorClass}`}>
            {confidenceConfig.text} ({Math.round(ocrResult.confidence * 100)}%)
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${confidenceConfig.barColorClass} transition-all duration-300`}
            style={{ width: `${ocrResult.confidence * 100}%` }}
          />
        </div>
        {confidenceConfig.level === 'low' && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            辨識準確度較低，請仔細核對並修正資料
          </p>
        )}
      </div>

      {/* Main Content: Image and Form */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Ticket Image */}
        <div className="lg:w-1/2">
          <div className="sticky top-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              車票圖片
            </h3>
            <div
              onClick={handleImageClick}
              className="
                relative
                w-full
                aspect-[4/3]
                bg-gray-100 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-xl
                overflow-hidden
                cursor-pointer
                group
              "
              role="button"
              tabIndex={0}
              aria-label="點擊放大圖片"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleImageClick();
                }
              }}
            >
              <img
                src={imageUrl}
                alt="上傳的車票圖片"
                className="
                  w-full h-full
                  object-contain
                  transition-transform duration-200
                  group-hover:scale-105
                "
              />
              {/* Zoom hint overlay */}
              <div
                className="
                  absolute inset-0
                  bg-black/0 group-hover:bg-black/20
                  flex items-center justify-center
                  transition-all duration-200
                "
              >
                <div
                  className="
                    opacity-0 group-hover:opacity-100
                    bg-white dark:bg-gray-800
                    px-3 py-2
                    rounded-lg
                    shadow-lg
                    flex items-center gap-2
                    transition-opacity duration-200
                  "
                >
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    點擊放大
                  </span>
                </div>
              </div>
            </div>
            {/* Image action hint */}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              點擊圖片可放大檢視
            </p>
          </div>
        </div>

        {/* Right: OCR Result Form */}
        <div className="lg:w-1/2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            辨識結果（可編輯）
          </h3>
          <div
            className="
              p-4 sm:p-5
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-xl
            "
          >
            <TicketForm
              initialData={initialFormData}
              isEditMode={false}
              onSubmit={handleFormSubmit}
              onCancel={onCancel}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isImageZoomed && (
        <div
          className="
            fixed inset-0 z-50
            bg-black/80
            flex items-center justify-center
            p-4
          "
          onClick={handleCloseZoom}
          role="dialog"
          aria-modal="true"
          aria-label="放大的車票圖片"
        >
          {/* Close button */}
          <button
            onClick={handleCloseZoom}
            className="
              absolute top-4 right-4
              p-2
              text-white
              bg-black/50
              hover:bg-black/70
              rounded-full
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black
            "
            aria-label="關閉圖片預覽"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {/* Zoomed image */}
          <img
            src={imageUrl}
            alt="放大的車票圖片"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default TicketOCRPreview;
