/**
 * Date and Time Utilities
 * Task 7: Date/time formatting and utility functions
 *
 * Provides helper functions for date/time formatting in the application
 * including CSV export support for ticket records.
 *
 * Requirements: 2.3 (display records), 2.4 (filter by month), 3.7 (CSV export)
 */

import type { TicketRecord, TravelDirection } from '../types/ticket';

/**
 * Format a date string from ISO/YYYY-MM-DD format to YYYY/MM/DD display format
 *
 * @param date - Date string in YYYY-MM-DD or ISO 8601 format
 * @returns Formatted date string in YYYY/MM/DD format
 *
 * @example
 * formatDate('2024-03-15') // returns '2024/03/15'
 * formatDate('2024-03-15T10:30:00.000Z') // returns '2024/03/15'
 */
export function formatDate(date: string): string {
  // Handle empty or invalid input
  if (!date) {
    return '';
  }

  // Extract the date portion (first 10 characters for YYYY-MM-DD)
  const datePart = date.substring(0, 10);

  // Replace hyphens with slashes
  return datePart.replace(/-/g, '/');
}

/**
 * Format a time string to HH:mm display format
 *
 * @param time - Time string in HH:mm or HH:mm:ss format
 * @returns Formatted time string in HH:mm format
 *
 * @example
 * formatTime('14:30') // returns '14:30'
 * formatTime('14:30:45') // returns '14:30'
 */
export function formatTime(time: string): string {
  // Handle empty or invalid input
  if (!time) {
    return '';
  }

  // Extract hours and minutes (first 5 characters for HH:mm)
  return time.substring(0, 5);
}

/**
 * Month option for dropdown/select components
 */
export interface MonthOption {
  value: string;  // YYYY-MM format
  label: string;  // Display label (e.g., "2024年03月")
}

/**
 * Generate month options for filtering ticket records
 * Returns past 12 months plus current month, sorted from newest to oldest
 *
 * @returns Array of month options with value (YYYY-MM) and label (YYYY年MM月)
 *
 * @example
 * // If current month is March 2024:
 * getMonthOptions()
 * // returns [
 * //   { value: '2024-03', label: '2024年03月' },
 * //   { value: '2024-02', label: '2024年02月' },
 * //   ...
 * // ]
 */
export function getMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  // Generate 13 months: current month + past 12 months
  for (let i = 0; i < 13; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is 0-indexed

    const value = `${year}-${month.toString().padStart(2, '0')}`;
    const label = `${year}年${month.toString().padStart(2, '0')}月`;

    options.push({ value, label });
  }

  return options;
}

/**
 * Direction labels for display
 */
const DIRECTION_LABELS: Record<TravelDirection, string> = {
  northbound: '北上',
  southbound: '南下',
};

/**
 * Format a ticket record for CSV export
 * Creates a comma-separated line with all ticket information
 *
 * CSV column order:
 * 票號, 日期, 時間, 方向, 出發站, 目的站, 出差目的
 *
 * @param ticket - The ticket record to format
 * @returns CSV formatted string for the ticket
 *
 * @example
 * formatForCSV({
 *   ticketNumber: '1234567890123',
 *   travelDate: '2024-03-15',
 *   travelTime: '14:30',
 *   direction: 'northbound',
 *   departure: '左營',
 *   destination: '台北',
 *   purpose: '客戶會議',
 *   ...
 * })
 * // returns '1234567890123,2024/03/15,14:30,北上,左營,台北,客戶會議'
 */
export function formatForCSV(ticket: TicketRecord): string {
  // Escape fields that might contain commas or quotes
  const escapeCSVField = (field: string): string => {
    if (!field) {
      return '';
    }
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const directionLabel = DIRECTION_LABELS[ticket.direction] || ticket.direction;

  const fields = [
    escapeCSVField(ticket.ticketNumber),
    formatDate(ticket.travelDate),
    formatTime(ticket.travelTime),
    directionLabel,
    escapeCSVField(ticket.departure),
    escapeCSVField(ticket.destination),
    escapeCSVField(ticket.purpose),
  ];

  return fields.join(',');
}

/**
 * Get CSV header row for ticket export
 *
 * @returns CSV header string
 */
export function getCSVHeader(): string {
  return '票號,日期,時間,方向,出發站,目的站,出差目的';
}
