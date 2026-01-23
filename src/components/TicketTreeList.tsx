/**
 * Ticket Tree List Component
 * Task 9: Create tree-based year-month navigation for ticket list
 *
 * Displays tickets with a sidebar tree navigation organized by year and month
 */

import { useState, useMemo } from 'react';
import type { TicketRecord } from '../types/ticket';
import { TicketCard } from './TicketCard';

/**
 * Props for the TicketTreeList component
 */
export interface TicketTreeListProps {
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
 * TicketTreeList Component
 *
 * Displays tickets with a tree-based sidebar navigation
 * Features:
 * - Left sidebar with year-month tree
 * - Years can be expanded/collapsed
 * - Responsive: sidebar hidden on mobile
 * - Sidebar toggle button
 */
export function TicketTreeList({
  tickets,
  onEdit,
  onDelete,
  onViewImage,
  onDownloadReceipt,
}: TicketTreeListProps) {
  // Group tickets by year and month
  const treeData = useMemo(() => {
    const yearMap: Record<string, Record<string, TicketRecord[]>> = {};

    tickets.forEach((ticket) => {
      if (!ticket.travelDate) return;
      const [year, monthNum] = ticket.travelDate.split('-');
      const month = `${year}-${monthNum}`;

      if (!yearMap[year]) {
        yearMap[year] = {};
      }
      if (!yearMap[year][month]) {
        yearMap[year][month] = [];
      }
      yearMap[year][month].push(ticket);
    });

    // Convert to tree structure and sort descending
    const years = Object.keys(yearMap)
      .sort((a, b) => b.localeCompare(a))
      .map((year) => ({
        year,
        months: Object.keys(yearMap[year])
          .sort((a, b) => b.localeCompare(a))
          .map((month) => ({
            month,
            count: yearMap[year][month].length,
          })),
      }));

    // Flatten for ticket lookup
    const ticketsByMonth: Record<string, TicketRecord[]> = {};
    Object.entries(yearMap).forEach(([, months]) => {
      Object.entries(months).forEach(([month, monthTickets]) => {
        ticketsByMonth[month] = monthTickets;
      });
    });

    return { years, ticketsByMonth };
  }, [tickets]);

  const { years, ticketsByMonth } = treeData;

  // Find the newest month
  const newestMonth = years.length > 0 && years[0].months.length > 0
    ? years[0].months[0].month
    : null;

  // State
  const [selectedMonth, setSelectedMonth] = useState<string | null>(newestMonth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    new Set(years.length > 0 ? [years[0].year] : [])
  );

  // Toggle year expansion
  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  // Get tickets for selected month
  const selectedTickets = selectedMonth ? ticketsByMonth[selectedMonth] || [] : [];

  // Format month for display
  const formatMonth = (month: string): string => {
    const [, monthNum] = month.split('-');
    return `${monthNum}月`;
  };

  if (years.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        沒有票券資料
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[400px]">
      {/* Sidebar Toggle Button - visible on mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="
          md:hidden
          fixed left-0 top-1/2 -translate-y-1/2 z-30
          p-2
          bg-orange-500 text-white
          rounded-r-lg shadow-lg
        "
        aria-label={isSidebarOpen ? '收合側邊欄' : '展開側邊欄'}
      >
        <svg
          className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:relative
          left-0 top-0 bottom-0 md:top-auto md:bottom-auto
          z-20 md:z-auto
          w-64 md:w-48 lg:w-56
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          overflow-y-auto
          transition-transform duration-300
          md:block
        `}
      >
        {/* Sidebar Header */}
        <div className="
          sticky top-0
          px-4 py-3
          bg-gray-50 dark:bg-gray-900
          border-b border-gray-200 dark:border-gray-700
          flex items-center justify-between
        ">
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            年月導航
          </span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="關閉側邊欄"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tree Navigation */}
        <nav className="p-2">
          {years.map(({ year, months }) => (
            <div key={year} className="mb-1">
              {/* Year Node */}
              <button
                onClick={() => toggleYear(year)}
                className="
                  w-full
                  flex items-center gap-2
                  px-3 py-2
                  text-left
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  rounded-lg
                  transition-colors
                "
              >
                <svg
                  className={`
                    w-4 h-4 text-gray-500 dark:text-gray-400
                    transition-transform duration-200
                    ${expandedYears.has(year) ? 'rotate-90' : ''}
                  `}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium">{year}年</span>
              </button>

              {/* Month Nodes */}
              {expandedYears.has(year) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {months.map(({ month, count }) => (
                    <button
                      key={month}
                      onClick={() => {
                        setSelectedMonth(month);
                        // Close sidebar on mobile after selection
                        if (window.innerWidth < 768) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={`
                        w-full
                        flex items-center justify-between
                        px-3 py-1.5
                        text-sm
                        rounded-lg
                        transition-colors
                        ${selectedMonth === month
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <span>{formatMonth(month)}</span>
                      <span className="
                        px-1.5 py-0.5
                        text-xs
                        bg-gray-100 dark:bg-gray-700
                        rounded
                      ">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 md:pl-4 pr-6">
        {/* Selected Month Header */}
        {selectedMonth && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {selectedMonth.replace('-', '年')}月
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedTickets.length} 張票券
            </span>
          </div>
        )}

        {/* Ticket Grid */}
        {selectedMonth ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selectedTickets.map((ticket) => (
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
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            請從左側選擇月份
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketTreeList;
