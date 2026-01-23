/**
 * Filter Bar Component
 * Task 32: Create FilterBar component
 *
 * Provides UI for filtering ticket records by:
 * - Month (YYYY-MM format dropdown)
 * - Direction (northbound/southbound/all button group)
 * - Search text (ticket number or destination)
 *
 * Requirements: 2.4 (Filter by month and direction)
 */

import { useFilterStore, type DirectionFilter } from '../stores/filterStore';

/**
 * Direction button configuration
 */
interface DirectionButtonConfig {
  value: DirectionFilter;
  label: string;
}

/**
 * Direction filter button configurations
 */
const DIRECTION_BUTTONS: DirectionButtonConfig[] = [
  { value: 'all', label: '全部' },
  { value: 'northbound', label: '北上' },
  { value: 'southbound', label: '南下' },
];

/**
 * FilterBar Component
 *
 * Provides filter controls for the ticket list:
 * 1. Month selector (dropdown with past 12 months)
 * 2. Direction filter button group (all/northbound/southbound)
 * 3. Text search input (ticket number or destination)
 * 4. Clear filters button (shown when filters are active)
 *
 * Features:
 * - Uses Zustand filterStore for state management
 * - Uses getMonthOptions() from dateUtils for month dropdown
 * - Responsive design (stacks on mobile)
 * - Traditional Chinese interface
 * - Dark mode support
 */
export function FilterBar() {
  const {
    month,
    direction,
    searchText,
    noReceipt,
    setMonth,
    setDirection,
    setSearchText,
    setNoReceipt,
    clearFilters,
  } = useFilterStore();

  /**
   * Handle month filter change
   */
  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMonth(value || undefined);
  };

  /**
   * Handle search text change
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchText(value || undefined);
  };

  /**
   * Check if any filter is active
   */
  const hasActiveFilters =
    month !== undefined ||
    direction !== 'all' ||
    (searchText !== undefined && searchText !== '') ||
    noReceipt;

  return (
    <div className="flex items-center gap-2">
      {/* Month filter - calendar picker with placeholder */}
      <div className="relative flex-shrink-0">
        <input
          id="filter-month"
          type="month"
          value={month || ''}
          onChange={handleMonthChange}
          className={`
            w-28
            px-2 py-1.5
            text-sm
            bg-white dark:bg-gray-700
            border border-gray-300 dark:border-gray-600
            rounded-lg
            hover:border-gray-400 dark:hover:border-gray-500
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            transition-colors duration-200
            cursor-pointer
            ${month ? 'text-gray-700 dark:text-gray-200' : 'text-transparent'}
          `}
          aria-label="選擇月份篩選"
        />
        {/* Placeholder text when no month selected */}
        {!month && (
          <span className="absolute inset-0 flex items-center px-2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">
            📅 月份
          </span>
        )}
      </div>

      {/* Direction filter buttons */}
      <div className="flex-shrink-0 inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        {DIRECTION_BUTTONS.map((btn, index) => {
          const isSelected = direction === btn.value;
          return (
            <button
              key={btn.value}
              type="button"
              onClick={() => setDirection(btn.value)}
              className={`
                px-3 py-1.5
                text-sm
                transition-colors duration-200
                focus:outline-none focus:z-10
                ${index > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}
              `}
              style={isSelected
                ? { backgroundColor: '#ea580c', color: 'white', fontWeight: 600 }
                : { backgroundColor: 'white', color: '#374151' }
              }
              aria-pressed={isSelected}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* No receipt filter button - hidden on mobile */}
      <button
        type="button"
        onClick={() => setNoReceipt(!noReceipt)}
        className={`
          hidden sm:block
          flex-shrink-0
          px-3 py-1.5
          text-sm
          border rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-orange-500
          ${noReceipt
            ? 'bg-purple-500 text-white border-purple-500 font-semibold'
            : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 hover:border-gray-400'
          }
        `}
        aria-pressed={noReceipt}
      >
        無憑證
      </button>

      {/* Search input - flex-1 to fill remaining space */}
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id="filter-search"
          type="search"
          name="ticket-search"
          value={searchText || ''}
          onChange={handleSearchChange}
          placeholder="搜尋票號..."
          autoComplete="off"
          data-form-type="other"
          className="
            w-full
            pl-8 pr-3 py-1.5
            text-sm
            text-gray-700 dark:text-gray-200
            bg-white dark:bg-gray-700
            border border-gray-300 dark:border-gray-600
            rounded-lg
            placeholder-gray-400 dark:placeholder-gray-500
            hover:border-gray-400 dark:hover:border-gray-500
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            transition-colors duration-200
          "
          aria-label="搜尋票號或目的地"
        />
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="
            flex-shrink-0
            px-3 py-1.5
            text-sm font-medium
            text-white
            bg-red-500
            border border-red-500
            rounded-lg
            hover:bg-red-600
            transition-colors duration-200
            whitespace-nowrap
          "
          aria-label="清除所有篩選條件"
        >
          <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          清除篩選
        </button>
      )}
    </div>
  );
}

export default FilterBar;
