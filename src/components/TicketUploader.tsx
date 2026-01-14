/**
 * Ticket Uploader Component
 * Task 8: Create ticket upload component
 *
 * Provides UI for uploading or capturing ticket images
 * Supports file upload, drag-and-drop, and mobile camera capture
 *
 * Requirements: 1.1 (JPG, PNG, HEIC formats), 1.6 (Mobile camera capture)
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';

/**
 * Accepted file formats for ticket images
 * Requirements: 1.1 - Accept JPG, PNG, HEIC formats
 */
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

/**
 * File extension mappings for accept attribute
 */
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.heic,.heif';

/**
 * Props for the TicketUploader component
 */
export interface TicketUploaderProps {
  /** Callback when an image is captured/uploaded */
  onImageCapture: (file: File) => void;
  /** Whether OCR processing is in progress */
  isProcessing: boolean;
  /** Current progress message to display */
  progressMessage?: string;
}

/**
 * Validates if a file has an accepted image format
 * @param file - File to validate
 * @returns true if file format is valid
 */
function isValidFileType(file: File): boolean {
  // Check MIME type
  if (ACCEPTED_FILE_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback: Check file extension for HEIC files (MIME type might not be set correctly)
  const extension = file.name.toLowerCase().split('.').pop();
  return extension === 'heic' || extension === 'heif';
}

/**
 * TicketUploader Component
 *
 * Provides multiple ways to upload ticket images:
 * 1. Click to open file picker
 * 2. Drag and drop files
 * 3. Mobile camera capture (using capture="environment")
 *
 * Features:
 * - File format validation (JPG, PNG, HEIC)
 * - Drag and drop with visual feedback
 * - Loading state during processing
 * - Responsive design (larger touch targets on mobile)
 * - Traditional Chinese interface
 */
export function TicketUploader({ onImageCapture, isProcessing, progressMessage }: TicketUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection from input
   */
  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = event.target.files?.[0];

      if (file) {
        if (isValidFileType(file)) {
          onImageCapture(file);
        } else {
          setError('不支援的檔案格式。請上傳 JPG、PNG 或 HEIC 格式的圖片。');
        }
      }

      // Reset input value to allow selecting the same file again
      event.target.value = '';
    },
    [onImageCapture]
  );

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      setError(null);

      const file = event.dataTransfer.files?.[0];

      if (file) {
        if (isValidFileType(file)) {
          onImageCapture(file);
        } else {
          setError('不支援的檔案格式。請上傳 JPG、PNG 或 HEIC 格式的圖片。');
        }
      }
    },
    [onImageCapture]
  );

  /**
   * Trigger file input click
   */
  const handleUploadClick = useCallback(() => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  }, [isProcessing]);

  /**
   * Trigger camera input click (mobile)
   */
  const handleCameraClick = useCallback(() => {
    if (!isProcessing) {
      cameraInputRef.current?.click();
    }
  }, [isProcessing]);

  /**
   * Clear error message
   */
  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
        aria-label="選擇車票圖片檔案"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
        aria-label="開啟相機拍攝車票"
      />

      {/* Error message */}
      {error && (
        <div
          className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between"
          role="alert"
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={handleClearError}
            className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
            aria-label="關閉錯誤訊息"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main upload area */}
      <div
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative
          w-full
          min-h-[200px] md:min-h-[180px]
          p-6 md:p-8
          border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center
          cursor-pointer
          transition-all duration-200
          ${
            isProcessing
              ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
              : isDragOver
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
          }
        `}
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-label="點擊或拖放上傳車票圖片"
        aria-disabled={isProcessing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleUploadClick();
          }
        }}
      >
        {isProcessing ? (
          /* Processing state */
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              {progressMessage || '處理中...'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">請稍候</p>
          </div>
        ) : (
          /* Upload state */
          <>
            {/* Upload icon */}
            <div
              className={`
                w-16 h-16 md:w-14 md:h-14
                rounded-full
                flex items-center justify-center
                mb-4
                transition-colors
                ${isDragOver ? 'bg-orange-100 dark:bg-orange-800' : 'bg-gray-100 dark:bg-gray-700'}
              `}
            >
              <svg
                className={`w-8 h-8 md:w-7 md:h-7 ${
                  isDragOver ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* Upload text */}
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200 text-center">
              {isDragOver ? '放開以上傳圖片' : '點擊上傳車票圖片'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
              或拖放圖片至此
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              支援 JPG、PNG、HEIC 格式
            </p>
          </>
        )}
      </div>

      {/* Mobile camera button - Requirements 1.6: Support mobile camera capture */}
      {!isProcessing && (
        <div className="mt-4 md:hidden">
          <button
            onClick={handleCameraClick}
            className="
              w-full
              py-4
              bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white font-medium
              rounded-xl
              shadow-md hover:shadow-lg
              transition-all duration-200
              flex items-center justify-center gap-3
              focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            "
            aria-label="開啟相機拍攝車票"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-lg">拍照上傳</span>
          </button>
        </div>
      )}

      {/* Desktop secondary actions hint */}
      {!isProcessing && (
        <div className="hidden md:flex mt-4 items-center justify-center gap-4">
          <button
            onClick={handleCameraClick}
            className="
              px-4 py-2
              text-sm text-gray-600 dark:text-gray-300
              hover:text-orange-600 dark:hover:text-orange-400
              hover:bg-gray-100 dark:hover:bg-gray-700
              rounded-lg
              transition-colors duration-200
              flex items-center gap-2
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>使用相機</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default TicketUploader;
