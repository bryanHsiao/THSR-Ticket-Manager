/**
 * Export Button Component
 * Task 34: Create ExportButton component
 *
 * Displays "Export CSV" button that exports ticket records to CSV format
 * Shows success/error toast notification after export
 *
 * Requirements: 3.7 (Support CSV export)
 * Leverages: src/services/storageService.ts
 */

import { useState, useCallback, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { useTicketStore } from '../stores/ticketStore';

/**
 * Toast message state
 */
interface ToastState {
  /** Whether the toast is visible */
  visible: boolean;
  /** Toast message type */
  type: 'success' | 'error';
  /** Toast message text */
  message: string;
}

/**
 * Props for the ExportButton component
 */
export interface ExportButtonProps {
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Export Button Component
 *
 * Renders a button that exports all ticket records to CSV format.
 * On click, generates CSV content and triggers browser download.
 * Shows a toast notification for success or error states.
 *
 * Features:
 * - Exports all tickets to CSV with UTF-8 BOM for Excel compatibility
 * - Auto-generates filename with current date (THSR_tickets_YYYY-MM-DD.csv)
 * - Shows success toast with ticket count after export
 * - Shows error toast if export fails
 * - Disabled state when no tickets to export
 * - Traditional Chinese interface
 */
export function ExportButton({ className = '' }: ExportButtonProps) {
  const tickets = useTicketStore((state) => state.tickets);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'success',
    message: '',
  });

  /**
   * Auto-hide toast after 3 seconds
   */
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  /**
   * Show toast notification
   */
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ visible: true, type, message });
  }, []);

  /**
   * Handle export button click
   * Generates CSV content and triggers download
   */
  const handleExport = useCallback(async () => {
    if (tickets.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      // Generate CSV content using storageService
      const csvContent = storageService.exportToCSV(tickets);

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `THSR_tickets_${today}.csv`;

      // Trigger download
      storageService.downloadCSV(csvContent, filename);

      // Show success toast
      showToast('success', `成功匯出 ${tickets.length} 筆車票紀錄`);
    } catch (error) {
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : '匯出失敗';
      showToast('error', errorMessage);
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [tickets, isExporting, showToast]);

  const hasTickets = tickets.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={!hasTickets || isExporting}
        className={`
          px-4 py-2
          text-sm font-medium
          rounded-lg
          transition-all duration-200
          flex items-center gap-2
          focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          ${
            hasTickets && !isExporting
              ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }
        `}
        aria-label="匯出車票紀錄為 CSV 檔案"
        title={!hasTickets ? '沒有車票紀錄可匯出' : '匯出 CSV'}
      >
        {/* Export Icon */}
        {isExporting ? (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
        <span>{isExporting ? '匯出中...' : '匯出 CSV'}</span>
      </button>

      {/* Toast Notification */}
      {toast.visible && (
        <div
          className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            px-4 py-2
            rounded-lg shadow-lg
            text-sm font-medium
            whitespace-nowrap
            animate-fade-in
            z-50
            ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }
          `}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
          {/* Arrow pointing down */}
          <div
            className={`
              absolute top-full left-1/2 -translate-x-1/2
              w-0 h-0
              border-l-8 border-r-8 border-t-8
              border-l-transparent border-r-transparent
              ${toast.type === 'success' ? 'border-t-green-500' : 'border-t-red-500'}
            `}
          />
        </div>
      )}
    </div>
  );
}

export default ExportButton;
