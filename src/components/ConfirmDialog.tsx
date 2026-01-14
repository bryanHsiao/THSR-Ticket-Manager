/**
 * Confirm Dialog Component
 * Task 33: Create ConfirmDialog component
 *
 * Modal-style confirmation dialog with confirm and cancel buttons
 * Used for delete confirmations and other destructive actions
 *
 * Requirements: 2.6 (Confirm before delete)
 */

import { useEffect, useCallback } from 'react';

/**
 * Props for the ConfirmDialog component
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Callback when confirm button is clicked */
  onConfirm: () => void;
  /** Callback when cancel button is clicked or dialog is closed */
  onCancel: () => void;
  /** Optional: Confirm button text (default: "確認") */
  confirmText?: string;
  /** Optional: Cancel button text (default: "取消") */
  cancelText?: string;
  /** Optional: Whether the action is destructive (changes confirm button to red) */
  isDestructive?: boolean;
}

/**
 * ConfirmDialog Component
 *
 * A modal-style confirmation dialog that:
 * - Displays a title and message
 * - Provides confirm and cancel buttons
 * - Supports keyboard navigation (Escape to close)
 * - Has overlay backdrop that closes on click
 * - Supports dark mode
 * - Is fully accessible with ARIA attributes
 *
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showDialog}
 *   title="刪除車票"
 *   message="確定要刪除這筆車票紀錄嗎？此操作無法復原。"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDialog(false)}
 *   isDestructive
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '確認',
  cancelText = '取消',
  isDestructive = false,
}: ConfirmDialogProps) {
  /**
   * Handle keyboard events
   * - Escape: Close dialog (cancel)
   * - Enter: Confirm action
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    [isOpen, onCancel]
  );

  // Add keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        p-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      {/* Backdrop overlay */}
      <div
        className="
          absolute inset-0
          bg-black/50
          backdrop-blur-sm
        "
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog content */}
      <div
        className="
          relative
          w-full max-w-md
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-xl
          shadow-2xl
          transform
          animate-in fade-in zoom-in-95
          duration-200
        "
      >
        {/* Dialog header */}
        <div className="px-6 pt-6 pb-4">
          {/* Warning icon for destructive actions */}
          {isDestructive && (
            <div className="flex justify-center mb-4">
              <div className="
                w-12 h-12
                flex items-center justify-center
                bg-red-100 dark:bg-red-900/30
                rounded-full
              ">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Title */}
          <h2
            id="confirm-dialog-title"
            className="
              text-lg sm:text-xl
              font-semibold
              text-gray-900 dark:text-gray-100
              text-center
            "
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="confirm-dialog-message"
            className="
              mt-3
              text-sm sm:text-base
              text-gray-600 dark:text-gray-300
              text-center
            "
          >
            {message}
          </p>
        </div>

        {/* Dialog footer with buttons */}
        <div
          className="
            flex flex-col-reverse sm:flex-row
            gap-2 sm:gap-3
            px-6 pb-6
          "
        >
          {/* Cancel button */}
          <button
            type="button"
            onClick={onCancel}
            className="
              flex-1
              px-4 py-2.5
              text-sm sm:text-base
              font-medium
              text-gray-700 dark:text-gray-300
              bg-white dark:bg-gray-700
              border border-gray-300 dark:border-gray-600
              rounded-lg
              hover:bg-gray-50 dark:hover:bg-gray-600
              active:bg-gray-100 dark:active:bg-gray-500
              focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors duration-200
            "
          >
            {cancelText}
          </button>

          {/* Confirm button */}
          <button
            type="button"
            onClick={onConfirm}
            className={`
              flex-1
              px-4 py-2.5
              text-sm sm:text-base
              font-medium
              text-white
              rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors duration-200
              ${
                isDestructive
                  ? `
                    bg-red-600 dark:bg-red-600
                    hover:bg-red-700 dark:hover:bg-red-700
                    active:bg-red-800 dark:active:bg-red-800
                    focus:ring-red-500
                  `
                  : `
                    bg-orange-500 dark:bg-orange-600
                    hover:bg-orange-600 dark:hover:bg-orange-700
                    active:bg-orange-700 dark:active:bg-orange-800
                    focus:ring-orange-400
                  `
              }
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
