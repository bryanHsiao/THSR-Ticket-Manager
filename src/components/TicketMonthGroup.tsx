/**
 * Ticket Month Group Component
 * Task 4: Create collapsible month group for ticket list
 *
 * Displays tickets grouped by month with expand/collapse functionality
 */

import { useState } from 'react';
import type { TicketRecord } from '../types/ticket';
import { TicketCard } from './TicketCard';

/**
 * Props for the TicketMonthGroup component
 */
export interface TicketMonthGroupProps {
  /** Month string in YYYY-MM format */
  month: string;
  /** Tickets for this month */
  tickets: TicketRecord[];
  /** Whether the group is expanded by default */
  defaultExpanded?: boolean;
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
 * @param month - Month string in YYYY-MM format
 * @returns Formatted month string (e.g., "2026年01月")
 */
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  return `${year}年${monthNum}月`;
}

/**
 * TicketMonthGroup Component
 *
 * Displays a collapsible group of tickets for a specific month
 * Features:
 * - Expand/collapse with smooth animation
 * - Month header with ticket count
 * - Chevron icon indicating state
 */
export function TicketMonthGroup({
  month,
  tickets,
  defaultExpanded = false,
  onEdit,
  onDelete,
  onViewImage,
  onDownloadReceipt,
}: TicketMonthGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-4">
      {/* Month Header - Clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full
          flex items-center justify-between
          px-4 py-3
          bg-gray-100 dark:bg-gray-700
          hover:bg-gray-200 dark:hover:bg-gray-600
          rounded-lg
          transition-colors duration-200
        "
      >
        <div className="flex items-center gap-3">
          {/* Chevron Icon with rotation animation */}
          <svg
            className={`
              w-5 h-5
              text-gray-500 dark:text-gray-400
              transition-transform duration-200
              ${isExpanded ? 'rotate-90' : 'rotate-0'}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {/* Month Title */}
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {formatMonth(month)}
          </span>
        </div>
        {/* Ticket Count Badge */}
        <span className="
          px-2.5 py-0.5
          text-sm font-medium
          text-orange-600 dark:text-orange-400
          bg-orange-100 dark:bg-orange-900/30
          rounded-full
        ">
          {tickets.length} 張
        </span>
      </button>

      {/* Collapsible Content */}
      <div
        className={`
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[10000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}
        `}
      >
        {/* Ticket Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
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
    </div>
  );
}

export default TicketMonthGroup;
