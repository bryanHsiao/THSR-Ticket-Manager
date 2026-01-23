/**
 * Ticket Group List Component
 * Task 5: Create container for month-grouped ticket view
 *
 * Groups tickets by month and renders TicketMonthGroup components
 */

import { useMemo } from 'react';
import type { TicketRecord } from '../types/ticket';
import { TicketMonthGroup } from './TicketMonthGroup';

/**
 * Props for the TicketGroupList component
 */
export interface TicketGroupListProps {
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
 * TicketGroupList Component
 *
 * Container component that groups tickets by month and displays
 * them using TicketMonthGroup components.
 *
 * Features:
 * - Groups tickets by month using useMemo
 * - Sorts months in descending order (newest first)
 * - Newest month is expanded by default
 */
export function TicketGroupList({
  tickets,
  onEdit,
  onDelete,
  onViewImage,
  onDownloadReceipt,
}: TicketGroupListProps) {
  // Group tickets by month and sort descending
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

    // Sort each month's tickets by date descending
    Object.keys(groups).forEach((month) => {
      groups[month].sort((a, b) => {
        const dateCompare = b.travelDate.localeCompare(a.travelDate);
        if (dateCompare !== 0) return dateCompare;
        return b.travelTime.localeCompare(a.travelTime);
      });
    });

    // Get sorted month keys (descending)
    const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return { groups, sortedMonths };
  }, [tickets]);

  const { groups, sortedMonths } = groupedTickets;

  if (sortedMonths.length === 0) {
    return null;
  }

  return (
    <div>
      {sortedMonths.map((month, index) => (
        <TicketMonthGroup
          key={month}
          month={month}
          tickets={groups[month]}
          defaultExpanded={index === 0} // Only first (newest) month expanded
          onEdit={onEdit}
          onDelete={onDelete}
          onViewImage={onViewImage}
          onDownloadReceipt={onDownloadReceipt}
        />
      ))}
    </div>
  );
}

export default TicketGroupList;
