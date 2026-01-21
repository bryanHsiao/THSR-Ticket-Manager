/**
 * Ticket List Component
 * Task 11: Create ticket list component
 *
 * Displays a list of ticket cards with:
 * - Grid/flex layout for responsive display
 * - Empty state when no tickets
 * - Loading state during data fetch
 * - Delete confirmation dialog
 * - Integration with ticketStore and filterStore
 *
 * Requirements: 2.3 (Display ticket number, date, direction, destination)
 * Requirements: 2.4 (Support filtering)
 * Requirements: 2.5 (Allow editing)
 * Requirements: 2.6 (Allow deletion)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTicketStore } from '../stores/ticketStore';
import { useFilterStore, filterTickets } from '../stores/filterStore';
import { TicketCard } from './TicketCard';
import { FilterBar } from './FilterBar';
import { getReceiptFilePath, checkReceiptExists } from '../utils/receiptHelper';
import { googleDriveService } from '../services/googleDriveService';
import { googleAuthService } from '../services/googleAuthService';
import type { TicketRecord } from '../types/ticket';

/**
 * Props for the TicketList component
 */
export interface TicketListProps {
  /** List of ticket records to display (optional - if not provided, uses store) */
  tickets?: TicketRecord[];
  /** Callback when edit button is clicked */
  onEdit: (id: string) => void;
  /** Callback when delete is confirmed */
  onDelete: (id: string) => void;
  /** Whether the list is loading (optional - if not provided, uses store) */
  isLoading?: boolean;
  /** Callback when download receipt is confirmed */
  onDownloadReceipt?: (ticket: TicketRecord) => void;
}

/**
 * Delete Confirmation Dialog Component
 */
interface DeleteConfirmDialogProps {
  /** Ticket to be deleted */
  ticket: TicketRecord;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

/**
 * Image Viewer Modal Component
 *
 * Displays ticket image in a fullscreen modal with loading state support
 */
interface ImageViewerModalProps {
  /** Image URL to display */
  imageUrl: string | null;
  /** Whether image is loading */
  isLoading?: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

function ImageViewerModal({ imageUrl, isLoading, onClose }: ImageViewerModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/80
        p-4
      "
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="車票圖片"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="
          absolute top-4 right-4
          p-2
          text-white/80 hover:text-white
          bg-black/30 hover:bg-black/50
          rounded-full
          transition-colors duration-200
          z-10
        "
        aria-label="關閉"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div
        className="
          max-w-full max-h-full
          overflow-auto
          flex items-center justify-center
        "
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-12 h-12 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-white text-sm">正在從雲端載入圖片...</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="車票圖片"
            className="
              max-w-[90vw] max-h-[90vh]
              object-contain
              rounded-lg
              shadow-2xl
            "
          />
        ) : (
          <p className="text-white text-sm">無法載入圖片</p>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmDialog({ ticket, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  // Handle escape key to close dialog
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
      aria-labelledby="delete-dialog-title"
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
            {/* Warning icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-red-500"
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
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              確認刪除
            </h2>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="p-5">
          <p className="text-gray-600 dark:text-gray-300">
            確定要刪除車票{' '}
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {ticket.ticketNumber}
            </span>{' '}
            嗎？
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            此操作無法復原。
          </p>
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
            style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
            className="
              px-4 py-2
              text-sm font-medium
              border border-transparent
              rounded-lg
              hover:opacity-90
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors duration-200
            "
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Component
 *
 * Displays a message when no tickets are found
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div
      className="
        w-full
        flex flex-col items-center justify-center
        py-12 sm:py-16
        px-4
        bg-gray-50 dark:bg-gray-800/50
        border-2 border-dashed border-gray-300 dark:border-gray-600
        rounded-xl
      "
    >
      {/* Empty state icon */}
      <div className="mb-4">
        <svg
          className="w-16 h-16 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      </div>

      {/* Empty state message */}
      <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">
        {hasFilters ? '找不到符合條件的車票' : '尚無車票紀錄'}
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        {hasFilters ? '請調整篩選條件或清除篩選' : '上傳車票圖片開始記錄'}
      </p>
    </div>
  );
}

/**
 * Loading State Component
 *
 * Displays loading animation while tickets are being fetched
 */
function LoadingState() {
  return (
    <div
      className="
        w-full
        flex flex-col items-center justify-center
        py-12 sm:py-16
        px-4
      "
    >
      {/* Loading spinner */}
      <div className="mb-4">
        <svg
          className="w-12 h-12 text-orange-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">載入中...</p>
    </div>
  );
}

/**
 * Error State Component
 *
 * Displays error message when ticket loading fails
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div
      className="
        w-full
        flex flex-col items-center justify-center
        py-12
        px-4
        bg-red-50 dark:bg-red-900/20
        border border-red-200 dark:border-red-800
        rounded-xl
      "
    >
      {/* Error icon */}
      <div className="mb-4">
        <svg
          className="w-12 h-12 text-red-500 dark:text-red-400"
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

      <p className="text-lg font-medium text-red-700 dark:text-red-400 mb-2 text-center">
        載入失敗
      </p>

      <p className="text-sm text-red-600 dark:text-red-300 mb-4 text-center">{error}</p>

      <button
        onClick={onRetry}
        className="
          px-4 py-2
          text-sm font-medium
          text-white
          bg-red-600 hover:bg-red-700
          dark:bg-red-700 dark:hover:bg-red-600
          rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
        "
      >
        重試
      </button>
    </div>
  );
}

/**
 * TicketList Component
 *
 * Displays a responsive grid of ticket cards with:
 * - Empty state when no tickets exist
 * - Loading state during data fetch
 * - Delete confirmation dialog
 * - Integration with ticketStore for data management
 * - Integration with filterStore for filtering
 * - Responsive grid layout (1 column mobile, 2 columns tablet, 3 columns desktop)
 *
 * Features:
 * - Traditional Chinese interface
 * - Dark mode support
 * - Tailwind CSS styling
 *
 * Usage:
 * ```tsx
 * // Using with store (automatic data management)
 * <TicketList
 *   onEdit={(id) => openEditModal(id)}
 *   onDelete={(id) => deleteTicket(id)}
 * />
 *
 * // Using with props (manual data management)
 * <TicketList
 *   tickets={ticketList}
 *   onEdit={(id) => openEditModal(id)}
 *   onDelete={(id) => deleteTicket(id)}
 *   isLoading={loading}
 * />
 * ```
 */
export function TicketList({ tickets: propTickets, onEdit, onDelete, isLoading: propIsLoading, onDownloadReceipt }: TicketListProps) {
  // State for delete confirmation dialog
  const [ticketToDelete, setTicketToDelete] = useState<TicketRecord | null>(null);
  // State for image viewer modal
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  // State for image loading from Drive
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  // State for tracking which tickets have receipts downloaded
  const [ticketsWithReceipts, setTicketsWithReceipts] = useState<Set<string>>(new Set());

  // Get ticket store state and actions
  const storeTickets = useTicketStore((state) => state.tickets);
  const storeIsLoading = useTicketStore((state) => state.isLoading);
  const error = useTicketStore((state) => state.error);
  const loadTickets = useTicketStore((state) => state.loadTickets);

  // Get filter store state
  const month = useFilterStore((state) => state.month);
  const direction = useFilterStore((state) => state.direction);
  const searchText = useFilterStore((state) => state.searchText);
  const noReceipt = useFilterStore((state) => state.noReceipt);

  // Use props if provided, otherwise use store
  const tickets = propTickets ?? storeTickets;
  const isLoading = propIsLoading ?? storeIsLoading;

  // Check if any filters are active
  const hasFilters = useMemo(() => {
    return (
      month !== undefined ||
      (direction !== undefined && direction !== 'all') ||
      (searchText !== undefined && searchText !== '') ||
      noReceipt
    );
  }, [month, direction, searchText, noReceipt]);

  // Filter tickets based on current filter state
  const filteredTickets = useMemo(() => {
    // Only apply filtering if using store tickets
    if (propTickets) {
      return tickets;
    }
    let result = filterTickets(tickets, {
      month,
      direction,
      searchText,
    });

    // Apply noReceipt filter
    if (noReceipt) {
      result = result.filter(ticket => !ticketsWithReceipts.has(ticket.id));
    }

    return result;
  }, [tickets, propTickets, month, direction, searchText, noReceipt, ticketsWithReceipts]);

  // Sort filtered tickets by travel date (newest first)
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      // Sort by travel date first, then by travel time
      const dateCompare = b.travelDate.localeCompare(a.travelDate);
      if (dateCompare !== 0) return dateCompare;
      return b.travelTime.localeCompare(a.travelTime);
    });
  }, [filteredTickets]);

  // Load tickets on component mount (only if using store)
  useEffect(() => {
    if (!propTickets) {
      loadTickets();
    }
  }, [propTickets, loadTickets]);

  // Check receipt status for all tickets
  useEffect(() => {
    const checkAllReceipts = async () => {
      const withReceipts = new Set<string>();

      await Promise.all(
        tickets.map(async (ticket) => {
          if (ticket.travelDate && ticket.departure && ticket.destination && ticket.ticketNumber) {
            const path = getReceiptFilePath({
              travelDate: ticket.travelDate,
              departure: ticket.departure,
              destination: ticket.destination,
              ticketNumber: ticket.ticketNumber,
              bookingCode: ticket.bookingCode,
            });
            const exists = await checkReceiptExists(path);
            if (exists) {
              withReceipts.add(ticket.id);
            }
          }
        })
      );

      setTicketsWithReceipts(withReceipts);
    };

    if (tickets.length > 0) {
      checkAllReceipts();
    }
  }, [tickets]);

  /**
   * Handle delete button click - show confirmation dialog
   */
  const handleDeleteClick = useCallback((ticket: TicketRecord) => {
    setTicketToDelete(ticket);
  }, []);

  /**
   * Handle delete confirmation
   */
  const handleConfirmDelete = useCallback(() => {
    if (ticketToDelete) {
      onDelete(ticketToDelete.id);
      setTicketToDelete(null);
    }
  }, [ticketToDelete, onDelete]);

  /**
   * Handle delete cancellation
   */
  const handleCancelDelete = useCallback(() => {
    setTicketToDelete(null);
  }, []);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    loadTickets();
  }, [loadTickets]);

  /**
   * Handle view image button click - open image viewer modal
   * Supports fallback to Google Drive if local image is missing
   */
  const handleViewImage = useCallback(async (ticket: TicketRecord) => {
    // If local image exists, show it directly
    if (ticket.imageUrl && ticket.imageUrl.startsWith('data:')) {
      setViewingImageUrl(ticket.imageUrl);
      return;
    }

    // If no Drive ID, nothing to show
    if (!ticket.driveImageId) {
      return;
    }

    // If not logged in, can't load from Drive
    if (!googleAuthService.isAuthorized()) {
      return;
    }

    // Load from Google Drive
    setIsLoadingImage(true);
    setViewingImageUrl(null); // Show modal with loading state

    try {
      const base64Url = await googleDriveService.downloadImage(ticket.driveImageId);
      setViewingImageUrl(base64Url);
    } catch (error) {
      console.warn('[TicketList] Failed to load image from Drive:', error);
      setViewingImageUrl(null);
    } finally {
      setIsLoadingImage(false);
    }
  }, []);

  /**
   * Handle closing image viewer modal
   */
  const handleCloseImageViewer = useCallback(() => {
    setViewingImageUrl(null);
    setIsLoadingImage(false);
  }, []);

  /**
   * Handle download receipt button click - directly call onDownloadReceipt
   */
  const handleDownloadReceiptClick = useCallback((ticket: TicketRecord) => {
    if (onDownloadReceipt) {
      onDownloadReceipt(ticket);
    }
  }, [onDownloadReceipt]);

  // Render loading state
  if (isLoading && tickets.length === 0) {
    return <LoadingState />;
  }

  // Render error state (only for store mode)
  if (!propTickets && error && tickets.length === 0) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  // Render empty state (with FilterBar if filters active)
  if (sortedTickets.length === 0) {
    return (
      <div className="w-full">
        {/* Show FilterBar when filters are active */}
        {hasFilters && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                共{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  0
                </span>{' '}
                筆車票
                <span className="text-gray-500 dark:text-gray-500">
                  {' '}
                  / {tickets.length}
                </span>
              </p>
            </div>
            <div className="flex-1">
              <FilterBar />
            </div>
          </div>
        )}
        <EmptyState hasFilters={hasFilters} />
      </div>
    );
  }

  // Render ticket list
  return (
    <>
      <div className="w-full">
        {/* Header: Ticket count + Filter bar + Export */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              共{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {sortedTickets.length}
              </span>{' '}
              筆車票
              {hasFilters && tickets.length !== sortedTickets.length && (
                <span className="text-gray-500 dark:text-gray-500">
                  {' '}
                  / {tickets.length}
                </span>
              )}
            </p>
          </div>
          <div className="flex-1">
            <FilterBar />
          </div>
        </div>

        {/* Ticket grid - responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-4 sm:gap-5 lg:gap-6
          "
        >
          {sortedTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onEdit={() => onEdit(ticket.id)}
              onDelete={() => handleDeleteClick(ticket)}
              onViewImage={(ticket.imageUrl || ticket.driveImageId) ? () => handleViewImage(ticket) : undefined}
              onDownloadReceipt={onDownloadReceipt ? () => handleDownloadReceiptClick(ticket) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {ticketToDelete && (
        <DeleteConfirmDialog
          ticket={ticketToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Image Viewer Modal */}
      {(viewingImageUrl || isLoadingImage) && (
        <ImageViewerModal
          imageUrl={viewingImageUrl}
          isLoading={isLoadingImage}
          onClose={handleCloseImageViewer}
        />
      )}

    </>
  );
}

export default TicketList;
