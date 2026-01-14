/**
 * Download Receipt Modal Component
 *
 * Displays a confirmation dialog before downloading ticket receipt
 * Shows ticket information summary and important notes
 */

import { useEffect } from 'react';
import type { TicketRecord } from '../types/ticket';
import { formatDateForTHSR } from '../utils/receiptHelper';

/**
 * Props for the DownloadReceiptModal component
 */
export interface DownloadReceiptModalProps {
  /** Ticket record to download receipt for */
  ticket: TicketRecord;
  /** Callback when user confirms download */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Get direction display text
 */
function getDirectionText(direction: 'northbound' | 'southbound'): string {
  return direction === 'northbound' ? '北上' : '南下';
}

/**
 * DownloadReceiptModal Component
 *
 * A modal dialog that:
 * - Displays ticket information summary
 * - Shows important warnings about one-time download
 * - Provides confirm/cancel actions
 */
export function DownloadReceiptModal({
  ticket,
  onConfirm,
  onCancel,
}: DownloadReceiptModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50
        p-4
      "
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-receipt-title"
    >
      <div
        className="
          w-full max-w-md
          bg-white dark:bg-gray-800
          rounded-xl
          shadow-2xl
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* Download icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2
              id="download-receipt-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              下載電子票證
            </h2>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="p-5 space-y-4">
          {/* Ticket Info Summary */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">票號</span>
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                {ticket.ticketNumber || '(未辨識)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">日期</span>
              <span className="text-gray-900 dark:text-gray-100">
                {ticket.travelDate ? formatDateForTHSR(ticket.travelDate) : '(未辨識)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">區間</span>
              <span className="text-gray-900 dark:text-gray-100">
                {ticket.departure || '?'} → {ticket.destination || '?'}
                {ticket.direction && (
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    ({getDirectionText(ticket.direction)})
                  </span>
                )}
              </span>
            </div>
            {ticket.bookingCode && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">訂位代號</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {ticket.bookingCode}
                </span>
              </div>
            )}
          </div>

          {/* Warning Notes */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
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
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">注意事項：</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                  <li>電子憑證只能下載一次</li>
                  <li>點擊後將開啟高鐵網站</li>
                  <li>請在網站上完成驗證並下載</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-end gap-3 p-5 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onCancel}
            className="
              px-4 py-2
              text-sm font-medium
              text-gray-700 dark:text-gray-300
              bg-white dark:bg-gray-700
              border border-gray-300 dark:border-gray-600
              rounded-lg
              hover:bg-gray-50 dark:hover:bg-gray-600
              focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors duration-200
            "
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="
              px-4 py-2
              text-sm font-medium
              text-white
              bg-green-600 hover:bg-green-700
              dark:bg-green-700 dark:hover:bg-green-600
              border border-transparent
              rounded-lg
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors duration-200
            "
          >
            開始下載
          </button>
        </div>
      </div>
    </div>
  );
}

export default DownloadReceiptModal;
