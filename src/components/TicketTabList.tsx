/**
 * Ticket Tab List Component
 * Task 7: Create tab-based month view for ticket list
 *
 * Displays tickets with month tabs for quick navigation
 */

import { useState, useMemo } from 'react';
import type { TicketRecord } from '../types/ticket';
import { TicketCard } from './TicketCard';

/**
 * Props for the TicketTabList component
 */
export interface TicketTabListProps {
  /** All tickets to display */
  tickets: TicketRecord[];
  /** Callback when edit button is clicked */
  onEdit: (id: string) => void;
  /** Callback when delete button is clicked */
  onDelete: (id: string) => void;
  /** Callback when view image button is clicked */
  onViewImage?: (ticket: TicketRecord) => void;
  /** Callback when download receipt button is clicked */
  onDownloadReceipt?: (ticket: TicketRecord) => void;
}

/**
 * Format month string to display format
 * Shows year only when it changes from previous month
 * @param month - Month string in YYYY-MM format
 * @param prevMonth - Previous month string (optional)
 * @returns Formatted month string (e.g., "01月" or "12月 '24")
 */
function formatMonthShort(month: string, prevMonth?: string): string {
  const [year, monthNum] = month.split('-');
  const prevYear = prevMonth?.split('-')[0];

  // Show year indicator when year changes
  if (prevYear && year !== prevYear) {
    return `${monthNum}月 '${year.slice(2)}`;
  }
  return `${monthNum}月`;
}

/**
 * Format month string to full display format
 * @param month - Month string in YYYY-MM format
 * @returns Full formatted month string (e.g., "2026年01月")
 */
function formatMonthFull(month: string): string {
  const [year, monthNum] = month.split('-');
  return `${year}年${monthNum}月`;
}

/**
 * TicketTabList Component
 *
 * Displays tickets grouped by month with tab navigation
 * Features:
 * - First 4 months shown as buttons
 * - "More" dropdown for additional months
 * - Newest month selected by default
 */
export function TicketTabList({
  tickets,
  onEdit,
  onDelete,
  onViewImage,
  onDownloadReceipt,
}: TicketTabListProps) {
  // Group tickets by month and sort descending (newest first)
  const groupedTickets = useMemo(() => {
    const groups: Record<string, TicketRecord[]> = {};

    tickets.forEach((ticket) => {
      if (!ticket.travelDate) return;
      const month = ticket.travelDate.substring(0, 7); // YYYY-MM
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(ticket);
    });

    // Sort months descending
    const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return { groups, sortedMonths };
  }, [tickets]);

  const { groups, sortedMonths } = groupedTickets;

  // Active month state - default to newest month
  const [activeMonth, setActiveMonth] = useState<string | null>(
    sortedMonths.length > 0 ? sortedMonths[0] : null
  );

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Split months into visible tabs and dropdown
  const visibleMonths = sortedMonths.slice(0, 4);
  const dropdownMonths = sortedMonths.slice(4);

  // Get tickets for active month
  const activeTickets = activeMonth ? groups[activeMonth] || [] : [];

  // Check if active month is in dropdown
  const isActiveInDropdown = activeMonth && dropdownMonths.includes(activeMonth);

  if (sortedMonths.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        沒有票券資料
      </div>
    );
  }

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {/* Visible Month Tabs */}
        {visibleMonths.map((month, index) => (
          <button
            key={month}
            onClick={() => setActiveMonth(month)}
            className={`
              min-w-[56px] px-3 py-2
              text-sm font-medium text-center
              rounded-lg
              transition-colors duration-200
              ${activeMonth === month
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            {formatMonthShort(month, visibleMonths[index - 1])}
          </button>
        ))}

        {/* More Dropdown */}
        {dropdownMonths.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`
                min-w-[72px] px-3 py-2
                text-sm font-medium
                rounded-lg
                transition-colors duration-200
                flex items-center justify-center gap-1
                ${isActiveInDropdown
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {isActiveInDropdown ? formatMonthShort(activeMonth!, visibleMonths[visibleMonths.length - 1]) : '更多'}
              <svg
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="
                  absolute top-full left-0 mt-1 z-20
                  min-w-[120px]
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  rounded-lg shadow-lg
                  py-1
                  max-h-60 overflow-y-auto
                ">
                  {dropdownMonths.map((month) => (
                    <button
                      key={month}
                      onClick={() => {
                        setActiveMonth(month);
                        setIsDropdownOpen(false);
                      }}
                      className={`
                        w-full px-4 py-2 text-center text-sm
                        ${activeMonth === month
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {formatMonthFull(month)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Active Month Info */}
        {activeMonth && (
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {formatMonthFull(activeMonth)} - {activeTickets.length} 張
          </span>
        )}
      </div>

      {/* Ticket Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onEdit={() => onEdit(ticket.id)}
            onDelete={() => onDelete(ticket.id)}
            onViewImage={onViewImage ? () => onViewImage(ticket) : undefined}
            onDownloadReceipt={onDownloadReceipt ? () => onDownloadReceipt(ticket) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default TicketTabList;
