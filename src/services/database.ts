/**
 * IndexedDB Database Service
 * Task 12: Create IndexedDB database structure
 *
 * Uses Dexie.js to provide IndexedDB access for ticket storage
 * Requirements: 3.5 (Use local storage when not logged in to Google)
 *
 * Features:
 * - TicketDatabase class extending Dexie
 * - tickets table with proper schema
 * - Indexes on ticketNumber, travelDate, syncStatus
 */

import Dexie, { type Table } from 'dexie';
import type { TicketRecord } from '../types/ticket';

/**
 * Database version
 * Increment this when making schema changes
 */
const DATABASE_VERSION = 1;

/**
 * Database name
 */
const DATABASE_NAME = 'thsr-ticket-manager';

/**
 * TicketDatabase class
 *
 * Extends Dexie to provide typed access to IndexedDB
 * for storing and querying ticket records.
 */
class TicketDatabase extends Dexie {
  /**
   * Tickets table
   * Stores TicketRecord objects with indexes for efficient querying
   */
  tickets!: Table<TicketRecord, string>;

  constructor() {
    super(DATABASE_NAME);

    // Define database schema
    // Primary key is 'id', with indexes on frequently queried fields
    this.version(DATABASE_VERSION).stores({
      // Schema definition:
      // - id: Primary key (UUID)
      // - ticketNumber: Indexed for searching by ticket number
      // - travelDate: Indexed for filtering by date/month
      // - syncStatus: Indexed for finding pending sync items
      tickets: 'id, ticketNumber, travelDate, syncStatus',
    });
  }

  /**
   * Get all tickets from the database
   *
   * @returns Promise<TicketRecord[]> - All stored tickets
   */
  async getAllTickets(): Promise<TicketRecord[]> {
    return this.tickets.toArray();
  }

  /**
   * Get a ticket by its ID
   *
   * @param id - The ticket ID (UUID)
   * @returns Promise<TicketRecord | undefined> - The ticket or undefined if not found
   */
  async getTicketById(id: string): Promise<TicketRecord | undefined> {
    return this.tickets.get(id);
  }

  /**
   * Get a ticket by its ticket number
   *
   * @param ticketNumber - The 13-digit ticket number
   * @returns Promise<TicketRecord | undefined> - The ticket or undefined if not found
   */
  async getTicketByNumber(ticketNumber: string): Promise<TicketRecord | undefined> {
    return this.tickets.where('ticketNumber').equals(ticketNumber).first();
  }

  /**
   * Get tickets by travel date
   *
   * @param date - The travel date in YYYY-MM-DD format
   * @returns Promise<TicketRecord[]> - Tickets for the specified date
   */
  async getTicketsByDate(date: string): Promise<TicketRecord[]> {
    return this.tickets.where('travelDate').equals(date).toArray();
  }

  /**
   * Get tickets by month
   *
   * @param yearMonth - The year and month in YYYY-MM format
   * @returns Promise<TicketRecord[]> - Tickets for the specified month
   */
  async getTicketsByMonth(yearMonth: string): Promise<TicketRecord[]> {
    // Use startsWith to match all dates in the month
    return this.tickets
      .where('travelDate')
      .startsWith(yearMonth)
      .toArray();
  }

  /**
   * Get tickets by sync status
   *
   * @param status - The sync status to filter by
   * @returns Promise<TicketRecord[]> - Tickets with the specified status
   */
  async getTicketsBySyncStatus(
    status: TicketRecord['syncStatus']
  ): Promise<TicketRecord[]> {
    return this.tickets.where('syncStatus').equals(status).toArray();
  }

  /**
   * Get tickets that need to be synced (pending or local status)
   *
   * @returns Promise<TicketRecord[]> - Tickets that need syncing
   */
  async getPendingSyncTickets(): Promise<TicketRecord[]> {
    return this.tickets
      .where('syncStatus')
      .anyOf(['pending', 'local'])
      .toArray();
  }

  /**
   * Add a new ticket to the database
   *
   * @param ticket - The ticket record to add
   * @returns Promise<string> - The ID of the added ticket
   */
  async addTicket(ticket: TicketRecord): Promise<string> {
    return this.tickets.add(ticket);
  }

  /**
   * Update an existing ticket in the database
   *
   * @param id - The ticket ID to update
   * @param changes - Partial ticket record with fields to update
   * @returns Promise<number> - Number of records updated (0 or 1)
   */
  async updateTicket(
    id: string,
    changes: Partial<TicketRecord>
  ): Promise<number> {
    return this.tickets.update(id, changes);
  }

  /**
   * Put a ticket (insert or update)
   *
   * @param ticket - The ticket record to put
   * @returns Promise<string> - The ID of the ticket
   */
  async putTicket(ticket: TicketRecord): Promise<string> {
    return this.tickets.put(ticket);
  }

  /**
   * Delete a ticket from the database
   *
   * @param id - The ticket ID to delete
   * @returns Promise<void>
   */
  async deleteTicket(id: string): Promise<void> {
    return this.tickets.delete(id);
  }

  /**
   * Delete all tickets from the database
   *
   * @returns Promise<void>
   */
  async clearAllTickets(): Promise<void> {
    return this.tickets.clear();
  }

  /**
   * Bulk add tickets to the database
   *
   * @param tickets - Array of tickets to add
   * @returns Promise<string[]> - Array of added ticket IDs
   */
  async bulkAddTickets(tickets: TicketRecord[]): Promise<string[]> {
    return this.tickets.bulkAdd(tickets, { allKeys: true }) as Promise<string[]>;
  }

  /**
   * Bulk put tickets (insert or update)
   *
   * @param tickets - Array of tickets to put
   * @returns Promise<string[]> - Array of ticket IDs
   */
  async bulkPutTickets(tickets: TicketRecord[]): Promise<string[]> {
    return this.tickets.bulkPut(tickets, { allKeys: true }) as Promise<string[]>;
  }

  /**
   * Count total number of tickets
   *
   * @returns Promise<number> - Total ticket count
   */
  async countTickets(): Promise<number> {
    return this.tickets.count();
  }
}

// Create singleton instance
const db = new TicketDatabase();

// Export the database instance
export { db };

// Export the class for testing purposes
export { TicketDatabase };

// Export database constants
export { DATABASE_NAME, DATABASE_VERSION };
