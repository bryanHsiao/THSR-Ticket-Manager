/**
 * Storage Service
 * Task 13: Implement local storage service
 *
 * Provides high-level CRUD operations for ticket records using IndexedDB
 * Requirements: 2.1 (Auto-create record after ticket info extraction succeeds)
 * Requirements: 3.5 (Use local storage when not logged in to Google)
 * Requirements: 3.7 (Support CSV export)
 * Requirements: 2.5 (Save ticket records)
 * Requirements: 2.6 (Allow delete operations)
 *
 * Features:
 * - saveTicket(): Save a new ticket to IndexedDB with syncStatus set
 * - getAllTickets(): Retrieve all tickets from IndexedDB
 * - updateTicket(): Update an existing ticket with updatedAt timestamp
 * - deleteTicket(): Delete a ticket by ID
 * - exportToCSV(): Export tickets to CSV format
 * - syncToCloud(): Sync local tickets to Google Drive
 */

import { db } from './database';
import { googleAuthService } from './googleAuthService';
import { googleDriveService } from './googleDriveService';
import { syncQueueService } from './syncQueueService';
import { formatForCSV, getCSVHeader } from '../utils/dateUtils';
import type { TicketRecord } from '../types/ticket';

/**
 * Storage Service
 *
 * Provides CRUD operations for ticket records stored in IndexedDB.
 * Acts as a facade over the database module to provide a clean API
 * for the rest of the application.
 */
class StorageService {
  /**
   * Check if a ticket with the same ticket number already exists
   *
   * @param ticketNumber - The 13-digit ticket number to check
   * @returns Promise<boolean> - true if duplicate exists
   */
  async isDuplicateTicketNumber(ticketNumber: string): Promise<boolean> {
    const existing = await db.getTicketByNumber(ticketNumber);
    return !!existing;
  }

  /**
   * Save a new ticket to IndexedDB
   * Sets syncStatus to 'local' if not logged in, 'pending' if logged in
   *
   * Requirements: 2.1 (Auto-create record after ticket info extraction succeeds)
   *
   * @param ticket - The ticket record to save
   * @param imageBlob - Optional image blob to save to Google Drive
   * @returns Promise<void>
   * @throws Error if the ticket already exists or duplicate ticket number
   */
  async saveTicket(ticket: TicketRecord, imageBlob?: Blob): Promise<void> {
    // Check if ticket already exists by ID
    const existingById = await db.getTicketById(ticket.id);
    if (existingById) {
      throw new Error(`Ticket with ID ${ticket.id} already exists. Use updateTicket instead.`);
    }

    // Check for duplicate ticket number (only if ticket number is provided)
    if (ticket.ticketNumber) {
      const existingByNumber = await db.getTicketByNumber(ticket.ticketNumber);
      if (existingByNumber) {
        throw new Error(`票號 ${ticket.ticketNumber} 已存在，無法重複新增。`);
      }
    }

    // Set syncStatus based on login state
    const isLoggedIn = googleAuthService.isAuthorized();
    let imageUrl = ticket.imageUrl;

    // Upload image to Google Drive if logged in and image provided
    if (isLoggedIn && imageBlob) {
      try {
        // Filename format: yyyymmdd-ticketNumber.jpg
        const dateStr = ticket.travelDate.replace(/-/g, '');
        const fileName = `${dateStr}-${ticket.ticketNumber}.jpg`;
        imageUrl = await googleDriveService.uploadImage(imageBlob, fileName, ticket.travelDate);
      } catch (error) {
        console.warn('Failed to upload image to Google Drive:', error);
        // Continue saving ticket without cloud image
      }
    }

    const ticketToSave: TicketRecord = {
      ...ticket,
      imageUrl,
      syncStatus: isLoggedIn ? 'pending' : 'local',
    };

    await db.addTicket(ticketToSave);

    // Add to sync queue if logged in
    if (isLoggedIn) {
      syncQueueService.addToQueue(ticketToSave, 'create');
    }
  }

  /**
   * Get all tickets from IndexedDB
   *
   * @returns Promise<TicketRecord[]> - Array of all stored tickets
   */
  async getAllTickets(): Promise<TicketRecord[]> {
    return db.getAllTickets();
  }

  /**
   * Update an existing ticket in IndexedDB
   * Updates the updatedAt timestamp automatically
   *
   * @param ticket - The ticket record with updated values
   * @returns Promise<void>
   * @throws Error if the ticket does not exist
   */
  async updateTicket(ticket: TicketRecord): Promise<void> {
    // Check if ticket exists
    const existing = await db.getTicketById(ticket.id);
    if (!existing) {
      throw new Error(`Ticket with ID ${ticket.id} does not exist. Use saveTicket instead.`);
    }

    // Set syncStatus based on login state
    const isLoggedIn = googleAuthService.isAuthorized();

    // Update with new timestamp and appropriate syncStatus
    const ticketToUpdate: TicketRecord = {
      ...ticket,
      updatedAt: new Date().toISOString(),
      syncStatus: isLoggedIn ? 'pending' : 'local',
    };

    // Use putTicket to replace the entire record
    await db.putTicket(ticketToUpdate);

    // Add to sync queue if logged in
    if (isLoggedIn) {
      syncQueueService.addToQueue(ticketToUpdate, 'update');
    }
  }

  /**
   * Delete a ticket from IndexedDB
   *
   * @param id - The ticket ID to delete
   * @returns Promise<void>
   * @throws Error if the ticket does not exist
   */
  async deleteTicket(id: string): Promise<void> {
    // Check if ticket exists
    const existing = await db.getTicketById(id);
    if (!existing) {
      throw new Error(`Ticket with ID ${id} does not exist.`);
    }

    await db.deleteTicket(id);

    // Add to sync queue if logged in
    const isLoggedIn = googleAuthService.isAuthorized();
    if (isLoggedIn) {
      syncQueueService.addToQueue(existing, 'delete');
    }
  }

  /**
   * Export tickets to CSV format
   *
   * Requirements: 3.7 (Support CSV export)
   * Leverages formatForCSV() and getCSVHeader() from dateUtils.ts
   *
   * @param tickets - Array of tickets to export
   * @returns string - CSV formatted string with header and data rows
   */
  exportToCSV(tickets: TicketRecord[]): string {
    // Build header row using dateUtils helper
    const headerRow = getCSVHeader();

    // Build data rows using dateUtils helper
    const dataRows = tickets.map(ticket => formatForCSV(ticket));

    // Combine header and data rows with newlines
    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Download CSV content as a file
   *
   * Requirements: 3.7 (Support CSV export)
   * Triggers a browser download of the CSV content
   *
   * @param content - The CSV content to download
   * @param filename - The filename for the downloaded file
   */
  downloadCSV(content: string, filename: string): void {
    // Add BOM for UTF-8 encoding (required for proper display in Excel with Chinese characters)
    const bom = '\uFEFF';
    const csvContent = bom + content;

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a download URL
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Sync local tickets to Google Drive
   *
   * Requirements: 3.3 (Auto-sync to Google Drive)
   *
   * Integrates with googleDriveService and syncQueueService to:
   * 1. Process any pending items in the sync queue
   * 2. Upload all local tickets to Google Drive
   * 3. Update local syncStatus to 'synced' on success
   *
   * @returns Promise<void>
   * @throws Error if not authorized or sync fails
   */
  async syncToCloud(): Promise<void> {
    // Check if user is authorized
    if (!googleAuthService.isAuthorized()) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    // Check if online
    if (!syncQueueService.isOnline()) {
      throw new Error('Cannot sync: You are offline.');
    }

    // Process any pending items in the queue first
    await syncQueueService.processQueue();

    // Get all local tickets
    const localTickets = await this.getAllTickets();

    // Get tickets from Google Drive
    const cloudTickets = await googleDriveService.fetchTickets();

    // Merge using Last-Write-Wins strategy
    const mergedTickets = syncQueueService.mergeTickets(cloudTickets, localTickets);

    // Upload merged tickets to Google Drive
    await googleDriveService.uploadTickets(mergedTickets);

    // Update local tickets with synced status
    const syncedTickets = mergedTickets.map(ticket => ({
      ...ticket,
      syncStatus: 'synced' as const,
    }));

    // Save synced tickets locally
    await db.bulkPutTickets(syncedTickets);

    // Clear the sync queue since all items are now synced
    syncQueueService.clearQueue();
  }

  /**
   * Process the sync queue only (without full merge)
   *
   * Use this after delete operations to avoid restoring deleted items
   * from the cloud during merge.
   *
   * @returns Promise<void>
   */
  async processSyncQueueOnly(): Promise<void> {
    // Check if user is authorized
    if (!googleAuthService.isAuthorized()) {
      return; // Silently return if not authorized
    }

    // Check if online
    if (!syncQueueService.isOnline()) {
      return; // Silently return if offline
    }

    // Process any pending items in the queue
    await syncQueueService.processQueue();
  }

  /**
   * Get a ticket by its ID
   *
   * @param id - The ticket ID (UUID)
   * @returns Promise<TicketRecord | undefined> - The ticket or undefined if not found
   */
  async getTicketById(id: string): Promise<TicketRecord | undefined> {
    return db.getTicketById(id);
  }

  /**
   * Get a ticket by its ticket number
   *
   * @param ticketNumber - The 13-digit ticket number
   * @returns Promise<TicketRecord | undefined> - The ticket or undefined if not found
   */
  async getTicketByNumber(ticketNumber: string): Promise<TicketRecord | undefined> {
    return db.getTicketByNumber(ticketNumber);
  }

  /**
   * Get tickets by travel date
   *
   * @param date - The travel date in YYYY-MM-DD format
   * @returns Promise<TicketRecord[]> - Tickets for the specified date
   */
  async getTicketsByDate(date: string): Promise<TicketRecord[]> {
    return db.getTicketsByDate(date);
  }

  /**
   * Get tickets by month
   *
   * @param yearMonth - The year and month in YYYY-MM format
   * @returns Promise<TicketRecord[]> - Tickets for the specified month
   */
  async getTicketsByMonth(yearMonth: string): Promise<TicketRecord[]> {
    return db.getTicketsByMonth(yearMonth);
  }

  /**
   * Get tickets that need to be synced
   *
   * @returns Promise<TicketRecord[]> - Tickets with pending or local sync status
   */
  async getPendingSyncTickets(): Promise<TicketRecord[]> {
    return db.getPendingSyncTickets();
  }

  /**
   * Save or update a ticket (upsert operation)
   *
   * @param ticket - The ticket record to save or update
   * @returns Promise<void>
   */
  async saveOrUpdateTicket(ticket: TicketRecord): Promise<void> {
    const existing = await db.getTicketById(ticket.id);

    if (existing) {
      await this.updateTicket(ticket);
    } else {
      await this.saveTicket(ticket);
    }
  }

  /**
   * Bulk save tickets (insert or update)
   *
   * @param tickets - Array of tickets to save
   * @returns Promise<void>
   */
  async bulkSaveTickets(tickets: TicketRecord[]): Promise<void> {
    await db.bulkPutTickets(tickets);
  }

  /**
   * Delete all tickets from the database
   *
   * @returns Promise<void>
   */
  async clearAllTickets(): Promise<void> {
    await db.clearAllTickets();
  }

  /**
   * Count total number of tickets
   *
   * @returns Promise<number> - Total ticket count
   */
  async countTickets(): Promise<number> {
    return db.countTickets();
  }

  /**
   * Download tickets from Google Drive and merge with local storage
   *
   * @returns Promise<TicketRecord[]> - Merged tickets
   * @throws Error if not authorized
   */
  async downloadFromCloud(): Promise<TicketRecord[]> {
    // Check if user is authorized
    if (!googleAuthService.isAuthorized()) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    // Get tickets from Google Drive
    const cloudTickets = await googleDriveService.fetchTickets();

    // Get all local tickets
    const localTickets = await this.getAllTickets();

    // Merge using Last-Write-Wins strategy
    const mergedTickets = syncQueueService.mergeTickets(cloudTickets, localTickets);

    // Save merged tickets locally
    await db.bulkPutTickets(mergedTickets);

    return mergedTickets;
  }

  /**
   * Clear all data from both IndexedDB and localStorage
   * Used for complete data reset
   *
   * @returns Promise<void>
   */
  async clearAllData(): Promise<void> {
    // Clear IndexedDB tickets
    await db.clearAllTickets();

    // Clear sync queue from localStorage
    syncQueueService.clearQueue();

    // Clear local tickets storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('thsr_local_tickets');
    }

    console.log('[storageService] All local data cleared');
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export class for testing purposes
export { StorageService };
