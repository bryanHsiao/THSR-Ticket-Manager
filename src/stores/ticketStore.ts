/**
 * Ticket Store - Zustand state management for ticket records
 * Task 21: Create ticket store
 *
 * Manages:
 * - Ticket records list (tickets: TicketRecord[])
 * - Loading state (isLoading, error)
 * - Processing state (isProcessing - for OCR operations)
 *
 * Requirements: 2.1-2.6 (Ticket record management: create, view, edit, delete, filter)
 * Requirements: 3.3 (Auto-sync when records change)
 */

import { create } from 'zustand';
import { storageService } from '../services/storageService';
import { googleAuthService } from '../services/googleAuthService';
import { googleDriveService } from '../services/googleDriveService';
import { filterTickets, useFilterStore } from './filterStore';
import type { TicketRecord } from '../types/ticket';

/**
 * Ticket store state interface
 */
interface TicketState {
  /** Array of all ticket records */
  tickets: TicketRecord[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message from failed operations */
  error: string | null;
  /** Processing state for OCR and other heavy operations */
  isProcessing: boolean;
  /** Sync error message (shown as toast, doesn't block UI) */
  syncError: string | null;
}

/**
 * Ticket store actions interface
 */
interface TicketActions {
  /**
   * Load all tickets from local storage (IndexedDB)
   * Sets isLoading during operation
   */
  loadTickets: () => Promise<void>;

  /**
   * Add a new ticket record
   * @param ticket - The ticket record to add
   */
  addTicket: (ticket: TicketRecord) => Promise<void>;

  /**
   * Update an existing ticket record
   * @param ticket - The ticket record with updated values
   */
  updateTicket: (ticket: TicketRecord) => Promise<void>;

  /**
   * Delete a ticket by ID
   * @param id - The ticket ID to delete
   */
  deleteTicket: (id: string) => Promise<void>;

  /**
   * Sync tickets to cloud storage (Google Drive)
   * Requirements: 3.3 (Auto-sync)
   */
  syncTickets: () => Promise<void>;

  /**
   * Set processing state (for OCR operations)
   * @param isProcessing - Whether processing is in progress
   */
  setProcessing: (isProcessing: boolean) => void;

  /**
   * Clear error state
   */
  clearError: () => void;

  /**
   * Set error message
   * @param error - Error message to display
   */
  setError: (error: string) => void;

  /**
   * Clear sync error state
   */
  clearSyncError: () => void;

  /**
   * Clear all local data (tickets from IndexedDB and state)
   * Called on logout to ensure clean slate
   */
  clearAllData: () => Promise<void>;
}

/**
 * Combined store type
 */
type TicketStore = TicketState & TicketActions;

/**
 * Initial state values
 */
const initialState: TicketState = {
  tickets: [],
  isLoading: false,
  error: null,
  isProcessing: false,
  syncError: null,
};

/**
 * Ticket store for managing ticket records state
 *
 * Usage:
 * ```tsx
 * import { useTicketStore, selectFilteredTickets } from './stores/ticketStore';
 *
 * function TicketList() {
 *   const { isLoading, error, loadTickets, addTicket } = useTicketStore();
 *   const filteredTickets = useTicketStore(selectFilteredTickets);
 *
 *   useEffect(() => {
 *     loadTickets();
 *   }, []);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       {filteredTickets.map(ticket => (
 *         <TicketCard key={ticket.id} ticket={ticket} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useTicketStore = create<TicketStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions
  loadTickets: async () => {
    set({ isLoading: true, error: null });

    try {
      const tickets = await storageService.getAllTickets();
      set({ tickets, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tickets';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addTicket: async (ticket: TicketRecord) => {
    set({ error: null, syncError: null });

    try {
      await storageService.saveTicket(ticket);

      // Update local state - this is the success point
      set((state) => ({
        tickets: [...state.tickets, ticket],
      }));

      // Auto-sync in background if logged in (fire and forget)
      // Sync errors won't block the UI, they'll show as a toast
      // Use setTimeout to ensure this runs completely async and can't block
      if (googleAuthService.isAuthorized()) {
        setTimeout(() => {
          storageService.syncToCloud()
            .then(async () => {
              // Reload tickets to get updated sync status
              const tickets = await storageService.getAllTickets();
              set({ tickets, syncError: null });
            })
            .catch((syncError) => {
              const syncErrorMessage = syncError instanceof Error ? syncError.message : '同步失敗';
              console.warn('Auto-sync after add failed:', syncError);
              // Set syncError for toast display, but don't block UI
              set({ syncError: `同步失敗：${syncErrorMessage}` });
            });
        }, 0);
      }
      // Don't throw - local save was successful
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add ticket';
      set({ error: errorMessage });
      throw error;
    }
  },

  updateTicket: async (ticket: TicketRecord) => {
    set({ error: null });

    try {
      await storageService.updateTicket(ticket);

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === ticket.id ? ticket : t)),
      }));

      // Auto-sync in background if logged in (fire and forget)
      if (googleAuthService.isAuthorized()) {
        storageService.syncToCloud()
          .then(async () => {
            const tickets = await storageService.getAllTickets();
            set({ tickets });
          })
          .catch((syncError) => {
            console.warn('Auto-sync after update failed:', syncError);
          });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ticket';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteTicket: async (id: string) => {
    set({ error: null });

    try {
      // Get ticket to soft delete
      const ticket = get().tickets.find((t) => t.id === id);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Soft delete: mark as deleted, clear local image, keep record for sync
      const deletedTicket: TicketRecord = {
        ...ticket,
        deleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageUrl: '', // Clear local base64 image
        syncStatus: 'pending',
      };

      // Update in storage
      await storageService.updateTicket(deletedTicket);

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((t) => t.id === id ? deletedTicket : t),
      }));

      // Delete image from Google Drive in background (if exists)
      if (ticket.driveImageId && googleAuthService.isAuthorized()) {
        googleDriveService.deleteImage(ticket.driveImageId)
          .then(() => console.log(`[Delete] Removed image from Drive: ${ticket.driveImageId}`))
          .catch((err) => console.warn('[Delete] Failed to remove image from Drive:', err));
      }

      // Delete receipt from Google Drive in background (if exists)
      if (ticket.driveReceiptId && googleAuthService.isAuthorized()) {
        googleDriveService.deleteReceipt(ticket.driveReceiptId)
          .then(() => console.log(`[Delete] Removed receipt from Drive: ${ticket.driveReceiptId}`))
          .catch((err) => console.warn('[Delete] Failed to remove receipt from Drive:', err));
      }

      // Sync the soft delete to cloud
      if (googleAuthService.isAuthorized()) {
        storageService.syncToCloud()
          .catch((syncError) => {
            console.warn('Sync after soft delete failed:', syncError);
          });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete ticket';
      set({ error: errorMessage });
      throw error;
    }
  },

  syncTickets: async () => {
    set({ isLoading: true, error: null });

    try {
      await storageService.syncToCloud();

      // Reload tickets after sync to get updated sync status
      const tickets = await storageService.getAllTickets();
      set({ tickets, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync tickets';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  clearSyncError: () => {
    set({ syncError: null });
  },

  clearAllData: async () => {
    try {
      await storageService.clearAllData();
      set({
        tickets: [],
        isLoading: false,
        error: null,
        isProcessing: false,
        syncError: null,
      });
      console.log('[ticketStore] All data cleared');
    } catch (error) {
      console.error('[ticketStore] Failed to clear data:', error);
      throw error;
    }
  },
}));

/**
 * Selector to get filtered tickets based on current filter state
 *
 * Usage:
 * ```tsx
 * const filteredTickets = useTicketStore(selectFilteredTickets);
 * ```
 */
export const selectFilteredTickets = (state: TicketStore): TicketRecord[] => {
  const filterState = useFilterStore.getState();
  const filters = {
    month: filterState.month,
    direction: filterState.direction,
    searchText: filterState.searchText,
    noReceipt: filterState.noReceipt,
  };

  return filterTickets(state.tickets, filters);
};

/**
 * Selector to get ticket by ID
 *
 * Usage:
 * ```tsx
 * const ticket = useTicketStore((state) => selectTicketById(state, ticketId));
 * ```
 */
export const selectTicketById = (state: TicketStore, id: string): TicketRecord | undefined => {
  return state.tickets.find((ticket) => ticket.id === id);
};

/**
 * Selector to get tickets sorted by travel date (newest first)
 *
 * Usage:
 * ```tsx
 * const sortedTickets = useTicketStore(selectTicketsSortedByDate);
 * ```
 */
export const selectTicketsSortedByDate = (state: TicketStore): TicketRecord[] => {
  return [...state.tickets].sort((a, b) => {
    // Sort by travel date first, then by travel time
    const dateCompare = b.travelDate.localeCompare(a.travelDate);
    if (dateCompare !== 0) return dateCompare;
    return b.travelTime.localeCompare(a.travelTime);
  });
};

/**
 * Selector to get tickets that need syncing
 *
 * Usage:
 * ```tsx
 * const pendingTickets = useTicketStore(selectPendingSyncTickets);
 * ```
 */
export const selectPendingSyncTickets = (state: TicketStore): TicketRecord[] => {
  return state.tickets.filter(
    (ticket) => ticket.syncStatus === 'pending' || ticket.syncStatus === 'local'
  );
};

/**
 * Selector to get ticket count
 *
 * Usage:
 * ```tsx
 * const count = useTicketStore(selectTicketCount);
 * ```
 */
export const selectTicketCount = (state: TicketStore): number => {
  return state.tickets.length;
};

/**
 * Get unique months from tickets for filter dropdown
 *
 * Usage:
 * ```tsx
 * const months = useTicketStore(selectAvailableMonths);
 * ```
 */
export const selectAvailableMonths = (state: TicketStore): string[] => {
  const monthSet = new Set<string>();

  state.tickets.forEach((ticket) => {
    // Extract YYYY-MM from YYYY-MM-DD
    const month = ticket.travelDate.substring(0, 7);
    monthSet.add(month);
  });

  // Sort months in descending order (newest first)
  return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
};
