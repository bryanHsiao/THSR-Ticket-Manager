/**
 * Filter Store - Zustand state management for ticket filtering
 * Task 23: Create filter store
 *
 * Manages:
 * - Month filter (YYYY-MM format)
 * - Direction filter (northbound/southbound/all)
 * - Search text filter (ticket number or purpose)
 *
 * Requirements: 2.4 (Filter by month and direction)
 */

import { create } from 'zustand';
import type { FilterOptions, TicketRecord, TravelDirection } from '../types/ticket';

/**
 * Direction filter type including 'all' option
 */
export type DirectionFilter = TravelDirection | 'all';

/**
 * Filter store state interface
 */
interface FilterState {
  /** Month filter in YYYY-MM format */
  month: string | undefined;
  /** Direction filter: northbound, southbound, or all */
  direction: DirectionFilter;
  /** Search text for ticket number or purpose */
  searchText: string | undefined;
  /** Filter to show only tickets without downloaded receipts */
  noReceipt: boolean;
}

/**
 * Filter store actions interface
 */
interface FilterActions {
  /**
   * Set month filter
   * @param month - Month in YYYY-MM format, or undefined to clear
   */
  setMonth: (month: string | undefined) => void;

  /**
   * Set direction filter
   * @param direction - northbound, southbound, or all
   */
  setDirection: (direction: DirectionFilter) => void;

  /**
   * Set search text filter
   * @param text - Search text for ticket number or purpose, or undefined to clear
   */
  setSearchText: (text: string | undefined) => void;

  /**
   * Set no receipt filter
   * @param noReceipt - true to show only tickets without receipts
   */
  setNoReceipt: (noReceipt: boolean) => void;

  /**
   * Clear all filters to default values
   */
  clearFilters: () => void;
}

/**
 * Combined store type
 */
type FilterStore = FilterState & FilterActions;

/**
 * Default filter state values
 */
const defaultFilterState: FilterState = {
  month: undefined,
  direction: 'all',
  searchText: undefined,
  noReceipt: false,
};

/**
 * Filter store for managing ticket filter state
 *
 * Usage:
 * ```tsx
 * import { useFilterStore, filterTickets } from './stores/filterStore';
 *
 * function TicketList() {
 *   const { month, direction, searchText, setMonth, setDirection, clearFilters } = useFilterStore();
 *   const tickets = useTicketStore((state) => state.tickets);
 *
 *   // Get filtered tickets using selector
 *   const filteredTickets = filterTickets(tickets, { month, direction, searchText });
 *
 *   return (
 *     <div>
 *       <select value={month || ''} onChange={(e) => setMonth(e.target.value || undefined)}>
 *         <option value="">All Months</option>
 *         <option value="2024-01">January 2024</option>
 *       </select>
 *       <button onClick={clearFilters}>Clear Filters</button>
 *       {filteredTickets.map(ticket => ...)}
 *     </div>
 *   );
 * }
 * ```
 */
export const useFilterStore = create<FilterStore>((set) => ({
  // Initial state
  ...defaultFilterState,

  // Actions
  setMonth: (month: string | undefined) => {
    set({ month });
  },

  setDirection: (direction: DirectionFilter) => {
    set({ direction });
  },

  setSearchText: (text: string | undefined) => {
    set({ searchText: text });
  },

  setNoReceipt: (noReceipt: boolean) => {
    set({ noReceipt });
  },

  clearFilters: () => {
    set({ ...defaultFilterState });
  },
}));

/**
 * Filter tickets based on filter options
 *
 * This selector function can be used to filter an array of tickets
 * based on the current filter state.
 *
 * @param tickets - Array of ticket records to filter
 * @param filters - Filter options (month, direction, searchText)
 * @returns Filtered array of ticket records
 *
 * Usage:
 * ```tsx
 * const filteredTickets = filterTickets(tickets, {
 *   month: '2024-01',
 *   direction: 'northbound',
 *   searchText: 'meeting'
 * });
 * ```
 */
export function filterTickets(
  tickets: TicketRecord[],
  filters: FilterOptions & { noReceipt?: boolean }
): TicketRecord[] {
  const { month, direction, searchText, noReceipt } = filters;

  return tickets.filter((ticket) => {
    // Filter by month (YYYY-MM format)
    if (month) {
      const ticketMonth = ticket.travelDate.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
      if (ticketMonth !== month) {
        return false;
      }
    }

    // Filter by direction (skip if 'all')
    if (direction && direction !== 'all') {
      if (ticket.direction !== direction) {
        return false;
      }
    }

    // Filter by search text (ticket number or purpose)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const ticketNumberMatch = ticket.ticketNumber.toLowerCase().includes(searchLower);
      const purposeMatch = ticket.purpose.toLowerCase().includes(searchLower);
      const destinationMatch = ticket.destination.toLowerCase().includes(searchLower);

      if (!ticketNumberMatch && !purposeMatch && !destinationMatch) {
        return false;
      }
    }

    // Filter by no receipt (show only tickets without driveReceiptId)
    if (noReceipt) {
      if (ticket.driveReceiptId) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get current filter options from store
 * Utility function for getting filter state as FilterOptions
 */
export function getFilterOptions(): FilterOptions {
  const state = useFilterStore.getState();
  return {
    month: state.month,
    direction: state.direction,
    searchText: state.searchText,
  };
}
