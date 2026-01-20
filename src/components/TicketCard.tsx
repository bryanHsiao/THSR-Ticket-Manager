/**
 * Ticket Card Component
 * Task 31: Create ticket card component
 *
 * Displays ticket information in a card format with edit/delete actions
 * Edit/delete buttons appear on hover
 *
 * Requirements: 2.3 (Display ticket number, date, direction, destination)
 * Requirements: 2.5 (Display sync status badge)
 * Requirements: 2.6 (Edit/delete buttons on hover)
 */

import { useState, useEffect } from 'react';
import type { TicketRecord, TicketSyncStatus, TravelDirection } from '../types/ticket';
import { getReceiptFilePath, checkReceiptExists } from '../utils/receiptHelper';

/**
 * Props for the TicketCard component
 */
export interface TicketCardProps {
  /** Ticket record to display */
  ticket: TicketRecord;
  /** Callback when edit button is clicked */
  onEdit: () => void;
  /** Callback when delete button is clicked */
  onDelete: () => void;
  /** Callback when view image button is clicked (optional) */
  onViewImage?: () => void;
  /** Callback when download receipt button is clicked (optional) */
  onDownloadReceipt?: () => void;
}

/**
 * Get display text for travel direction
 * @param direction - Travel direction value
 * @returns Localized direction text
 */
function getDirectionText(direction: TravelDirection): string {
  return direction === 'northbound' ? '北上' : '南下';
}

/**
 * Get sync status display configuration
 * @param status - Sync status value
 * @returns Icon and text configuration
 */
function getSyncStatusConfig(status: TicketSyncStatus): {
  icon: string;
  text: string;
  colorClass: string;
} {
  switch (status) {
    case 'synced':
      return {
        icon: 'cloud',
        text: '已同步',
        colorClass: 'text-green-600 dark:text-green-400',
      };
    case 'pending':
      return {
        icon: 'cloud-upload',
        text: '待同步',
        colorClass: 'text-yellow-600 dark:text-yellow-400',
      };
    case 'local':
      return {
        icon: 'device',
        text: '僅本機',
        colorClass: 'text-gray-500 dark:text-gray-400',
      };
  }
}

/**
 * Sync Status Icon Component
 */
function SyncStatusIcon({ status }: { status: TicketSyncStatus }) {
  const config = getSyncStatusConfig(status);

  if (config.icon === 'cloud') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
      </svg>
    );
  }

  if (config.icon === 'cloud-upload') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    );
  }

  // device icon (local)
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Check if ticket has missing required fields
 * @param ticket - Ticket record to check
 * @returns Array of missing field names in Chinese
 */
function getMissingFields(ticket: TicketRecord): string[] {
  const missing: string[] = [];
  if (!ticket.ticketNumber) missing.push('票號');
  if (!ticket.travelDate) missing.push('日期');
  if (!ticket.departure) missing.push('起站');
  if (!ticket.destination) missing.push('迄站');
  return missing;
}

/**
 * TicketCard Component
 *
 * Displays a ticket record in a card format with:
 * - Ticket number with ticket icon
 * - Sync status indicator
 * - Travel date and time
 * - Route (departure to destination with direction)
 * - Business trip purpose
 * - Edit and delete action buttons
 * - Missing data warnings
 *
 * Features:
 * - Card design with shadow and rounded corners
 * - Responsive layout
 * - Dark mode support
 * - Traditional Chinese interface
 * - Visual indicator for incomplete data
 */
export function TicketCard({ ticket, onEdit, onDelete, onViewImage, onDownloadReceipt }: TicketCardProps) {
  const syncConfig = getSyncStatusConfig(ticket.syncStatus);
  const directionText = getDirectionText(ticket.direction);
  const missingFields = getMissingFields(ticket);
  const hasIncompleteData = missingFields.length > 0;

  // Check if local receipt file exists
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  useEffect(() => {
    // Only check if we have all required fields
    if (ticket.travelDate && ticket.departure && ticket.destination && ticket.ticketNumber) {
      const path = getReceiptFilePath({
        travelDate: ticket.travelDate,
        departure: ticket.departure,
        destination: ticket.destination,
        ticketNumber: ticket.ticketNumber,
        bookingCode: ticket.bookingCode,
      });

      checkReceiptExists(path).then((exists) => {
        setReceiptPath(exists ? path : null);
      });
    } else {
      setReceiptPath(null);
    }
  }, [ticket.travelDate, ticket.departure, ticket.destination, ticket.ticketNumber, ticket.bookingCode]);

  // Open receipt in new tab
  const handleViewReceipt = () => {
    if (receiptPath) {
      window.open(receiptPath, '_blank');
    }
  };

  return (
    <div
      className="
        w-full
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-xl
        shadow-md hover:shadow-lg
        transition-shadow duration-200
        overflow-hidden
      "
    >
      {/* Missing Data Warning */}
      {hasIncompleteData && (
        <div
          className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          onClick={onEdit}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEdit();
            }
          }}
        >
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs text-amber-700 dark:text-amber-300">
            缺少：{missingFields.join('、')}（點擊補充）
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 sm:p-5">
        {/* Header Row 1: Ticket Number & Sync Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Ticket icon */}
            <svg
              className="w-5 h-5 text-orange-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            {/* Ticket number */}
            <span className={`font-mono text-base sm:text-lg font-semibold ${ticket.ticketNumber ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 italic'}`}>
              {ticket.ticketNumber || '(未辨識)'}
            </span>
          </div>
          {/* Sync status badge */}
          <div className={`flex items-center gap-1 flex-shrink-0 ${syncConfig.colorClass}`}>
            <SyncStatusIcon status={ticket.syncStatus} />
            <span className="text-xs">{syncConfig.text}</span>
          </div>
        </div>

        {/* Header Row 2: Action Buttons - Touch friendly with larger targets */}
        <div className="flex items-center justify-end gap-3 mb-3 border-b border-gray-100 dark:border-gray-700 pb-3">
          {/* View Image Button - Only show if image exists */}
          {ticket.imageUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewImage?.();
              }}
              className="
                p-2.5
                text-blue-500 dark:text-blue-400
                bg-blue-50 dark:bg-blue-900/20
                hover:bg-blue-100 dark:hover:bg-blue-900/40
                rounded-lg
                transition-colors duration-200
              "
              aria-label="查看車票圖片"
              title="查看圖片"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}

          {/* Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="
              p-2.5
              text-gray-600 dark:text-gray-300
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              rounded-lg
              transition-colors duration-200
            "
            aria-label={`編輯車票 ${ticket.ticketNumber}`}
            title="編輯"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="
              p-2.5
              text-red-500 dark:text-red-400
              bg-red-50 dark:bg-red-900/20
              hover:bg-red-100 dark:hover:bg-red-900/40
              rounded-lg
              transition-colors duration-200
            "
            aria-label={`刪除車票 ${ticket.ticketNumber}`}
            title="刪除"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          {/* View Receipt Button - Show if local receipt exists */}
          {receiptPath && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewReceipt();
              }}
              className="
                p-2.5
                text-purple-600 dark:text-purple-400
                bg-purple-50 dark:bg-purple-900/20
                hover:bg-purple-100 dark:hover:bg-purple-900/40
                rounded-lg
                transition-colors duration-200
              "
              aria-label={`檢視車票 ${ticket.ticketNumber} 的電子憑證`}
              title="檢視憑證"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          )}

          {/* Download Receipt Button */}
          {onDownloadReceipt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadReceipt();
              }}
              className="
                p-2.5
                text-green-600 dark:text-green-400
                bg-green-50 dark:bg-green-900/20
                hover:bg-green-100 dark:hover:bg-green-900/40
                rounded-lg
                transition-colors duration-200
              "
              aria-label={`下載車票 ${ticket.ticketNumber} 的電子憑證`}
              title="下載憑證"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Date and Time */}
        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2">
          <span className={ticket.travelDate ? '' : 'text-gray-400 dark:text-gray-500 italic'}>
            {ticket.travelDate || '(日期未辨識)'}
          </span>
          {ticket.travelTime && (
            <span className="mx-2 text-gray-400 dark:text-gray-500">{ticket.travelTime}</span>
          )}
        </div>

        {/* Route: Departure -> Destination (Direction) */}
        <div className="flex items-center gap-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-3">
          <span className={`font-medium ${ticket.departure ? '' : 'text-gray-400 dark:text-gray-500 italic'}`}>
            {ticket.departure || '(起站)'}
          </span>
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className={`font-medium ${ticket.destination ? '' : 'text-gray-400 dark:text-gray-500 italic'}`}>
            {ticket.destination || '(迄站)'}
          </span>
          <span className="text-gray-500 dark:text-gray-400">({directionText})</span>
        </div>

        {/* Purpose - truncate to 2 lines */}
        {ticket.purpose && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">出差目的：</span>
            <span className="line-clamp-2">{ticket.purpose}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketCard;
