/**
 * OCR Engine Indicator Component
 * Displays which OCR engine was used or if manual input mode is active
 */

import type { OCREngineType } from '../types/ocr';

interface OCREngineIndicatorProps {
  /** Which OCR engine was used */
  engineUsed: OCREngineType;
  /** Whether fallback was triggered */
  fallbackUsed: boolean;
  /** Reason for fallback (if applicable) */
  fallbackReason?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get display name for OCR engine
 */
function getEngineDisplayName(engineType: OCREngineType): string {
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
 * OCR Engine Indicator
 * Shows which OCR engine processed the image or if manual input is needed
 */
export function OCREngineIndicator({
  engineUsed,
  fallbackUsed,
  fallbackReason,
  className = '',
}: OCREngineIndicatorProps) {
  const engineName = getEngineDisplayName(engineUsed);

  // Manual input mode with fallback (API failed)
  if (engineUsed === 'manual' && fallbackUsed) {
    return (
      <div
        className={`flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 ${className}`}
        role="status"
      >
        <svg
          className="w-4 h-4 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <span className="font-medium">請手動輸入車票資訊</span>
          {fallbackReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {fallbackReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Manual input mode without fallback (API not configured)
  if (engineUsed === 'manual') {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 ${className}`}
        role="status"
      >
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span>請手動輸入車票資訊</span>
      </div>
    );
  }

  // Normal indicator - OpenAI OCR successful
  return (
    <div
      className={`flex items-center gap-2 text-sm text-green-700 dark:text-green-300 ${className}`}
      role="status"
    >
      {/* OpenAI icon */}
      <svg
        className="w-4 h-4 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
      <span>由 {engineName} 辨識</span>
    </div>
  );
}
