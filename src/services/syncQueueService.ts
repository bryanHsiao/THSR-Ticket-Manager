/**
 * Sync Queue Service
 * Task 20: Implement offline sync queue
 *
 * Handles offline synchronization for ticket records
 * Requirements: 3.5 (Use local storage when not logged in to Google)
 * Requirements: 3.6 (Cache changes when offline, auto-sync when online)
 *
 * Features:
 * - Stores pending sync items in localStorage
 * - Monitors network status (online/offline events)
 * - Automatically processes queue when connection is restored
 * - Integrates with googleDriveService for actual sync
 */

import { googleDriveService } from './googleDriveService';
import { googleAuthService } from './googleAuthService';
import type { TicketRecord } from '../types/ticket';

/**
 * Storage key for sync queue in localStorage
 */
const SYNC_QUEUE_STORAGE_KEY = 'thsr_sync_queue';

/**
 * Storage key for all tickets in localStorage (for local-first approach)
 */
const LOCAL_TICKETS_STORAGE_KEY = 'thsr_local_tickets';

/**
 * Sync operation types
 */
type SyncOperationType = 'create' | 'update' | 'delete';

/**
 * Interface for a sync queue item
 */
interface SyncQueueItem {
  id: string;                    // Unique queue item ID
  ticketId: string;              // The ticket ID being synced
  operation: SyncOperationType;  // Operation type
  ticket?: TicketRecord;         // Ticket data (not needed for delete)
  timestamp: string;             // ISO 8601 timestamp when queued
  retryCount: number;            // Number of retry attempts
}

/**
 * Maximum retry attempts before giving up on a sync item
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Sync Queue Service
 *
 * Provides methods for offline sync queue management:
 * - addToQueue(): Add a ticket to the sync queue
 * - processQueue(): Process all pending sync items
 * - Network status monitoring with automatic sync on reconnection
 */
class SyncQueueService {
  private isProcessing = false;
  private eventListenersAttached = false;

  /**
   * Initialize the sync queue service
   * Sets up network status listeners
   */
  initialize(): void {
    if (this.eventListenersAttached) {
      return;
    }

    // Attach network status event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      this.eventListenersAttached = true;

      // Process queue if we're already online and have pending items
      if (navigator.onLine) {
        this.processQueue().catch(console.error);
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined' && this.eventListenersAttached) {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
      this.eventListenersAttached = false;
    }
  }

  /**
   * Check if the browser is currently online
   *
   * @returns boolean - true if online
   */
  isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online in non-browser environments
  }

  /**
   * Add a ticket to the sync queue
   * Called when a ticket is created, updated, or deleted while offline
   * or when Google Drive sync fails
   *
   * @param ticket - The ticket record to sync
   * @param operation - The type of operation (create, update, delete)
   */
  addToQueue(ticket: TicketRecord, operation: SyncOperationType = 'update'): void {
    const queue = this.getQueue();

    // Check if there's already a pending item for this ticket
    const existingIndex = queue.findIndex(item => item.ticketId === ticket.id);

    const queueItem: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticketId: ticket.id,
      operation,
      ticket: operation !== 'delete' ? ticket : undefined,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    if (existingIndex !== -1) {
      // Replace existing item with new operation
      // If deleting, remove previous create/update
      if (operation === 'delete') {
        const existingItem = queue[existingIndex];
        // If it was a create that never synced, just remove from queue
        if (existingItem.operation === 'create') {
          queue.splice(existingIndex, 1);
          this.saveQueue(queue);
          return;
        }
      }
      // Update the existing item
      queue[existingIndex] = queueItem;
    } else {
      // Add new item to queue
      queue.push(queueItem);
    }

    this.saveQueue(queue);

    // Also save to local tickets storage for offline access
    this.updateLocalTickets(ticket, operation);

    // Try to process immediately if online
    if (this.isOnline() && googleAuthService.isAuthorized()) {
      this.processQueue().catch(console.error);
    }
  }

  /**
   * Process all items in the sync queue
   * Attempts to sync each item with Google Drive
   *
   * @returns Promise<void>
   */
  async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    // Check if we can sync
    if (!this.isOnline()) {
      console.log('SyncQueue: Offline, skipping queue processing');
      return;
    }

    if (!googleAuthService.isAuthorized()) {
      console.log('SyncQueue: Not authorized, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const queue = this.getQueue();

      if (queue.length === 0) {
        return;
      }

      console.log(`SyncQueue: Processing ${queue.length} pending items`);

      // Get current tickets from Google Drive
      let cloudTickets: TicketRecord[] = [];
      try {
        cloudTickets = await googleDriveService.fetchTickets();
      } catch (error) {
        console.error('SyncQueue: Failed to fetch cloud tickets', error);
        // Continue with empty cloud tickets if fetch fails
      }

      // Process queue items using Last-Write-Wins strategy
      const processedItems: string[] = [];
      const failedItems: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          await this.processQueueItem(item, cloudTickets);
          processedItems.push(item.id);
        } catch (error) {
          console.error(`SyncQueue: Failed to process item ${item.id}`, error);

          // Increment retry count
          item.retryCount++;

          if (item.retryCount < MAX_RETRY_ATTEMPTS) {
            failedItems.push(item);
          } else {
            console.warn(`SyncQueue: Item ${item.id} exceeded max retries, removing from queue`);
            processedItems.push(item.id);
          }
        }
      }

      // Upload merged tickets to Google Drive
      if (processedItems.length > 0) {
        try {
          await googleDriveService.uploadTickets(cloudTickets);
          console.log('SyncQueue: Successfully uploaded tickets to Google Drive');
        } catch (error) {
          console.error('SyncQueue: Failed to upload tickets', error);
          // Keep failed items in queue
          return;
        }
      }

      // Update queue with remaining failed items
      const remainingQueue = queue.filter(
        item => !processedItems.includes(item.id)
      );
      this.saveQueue([...remainingQueue, ...failedItems]);

      console.log(`SyncQueue: Processed ${processedItems.length} items, ${failedItems.length} failed`);

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   * Applies Last-Write-Wins conflict resolution based on updatedAt
   *
   * @param item - The queue item to process
   * @param cloudTickets - Current tickets from Google Drive (modified in place)
   */
  private async processQueueItem(
    item: SyncQueueItem,
    cloudTickets: TicketRecord[]
  ): Promise<void> {
    const existingIndex = cloudTickets.findIndex(t => t.id === item.ticketId);

    switch (item.operation) {
      case 'create':
        if (item.ticket) {
          if (existingIndex === -1) {
            // Add new ticket
            cloudTickets.push({
              ...item.ticket,
              syncStatus: 'synced',
            });
          } else {
            // Ticket already exists, apply LWW
            const cloudTicket = cloudTickets[existingIndex];
            if (new Date(item.ticket.updatedAt) > new Date(cloudTicket.updatedAt)) {
              cloudTickets[existingIndex] = {
                ...item.ticket,
                syncStatus: 'synced',
              };
            }
          }
        }
        break;

      case 'update':
        if (item.ticket) {
          if (existingIndex !== -1) {
            // Apply LWW: use the newer version
            const cloudTicket = cloudTickets[existingIndex];
            if (new Date(item.ticket.updatedAt) > new Date(cloudTicket.updatedAt)) {
              cloudTickets[existingIndex] = {
                ...item.ticket,
                syncStatus: 'synced',
              };
            }
          } else {
            // Ticket doesn't exist in cloud, add it
            cloudTickets.push({
              ...item.ticket,
              syncStatus: 'synced',
            });
          }
        }
        break;

      case 'delete':
        if (existingIndex !== -1) {
          cloudTickets.splice(existingIndex, 1);
        }
        break;
    }
  }

  /**
   * Get the current sync queue from localStorage
   *
   * @returns SyncQueueItem[] - Array of pending sync items
   */
  getQueue(): SyncQueueItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const queueJson = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
    if (!queueJson) {
      return [];
    }

    try {
      const queue = JSON.parse(queueJson);
      return Array.isArray(queue) ? queue : [];
    } catch {
      return [];
    }
  }

  /**
   * Save the sync queue to localStorage
   *
   * @param queue - The queue to save
   */
  private saveQueue(queue: SyncQueueItem[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  }

  /**
   * Get the number of pending items in the queue
   *
   * @returns number - Count of pending items
   */
  getPendingCount(): number {
    return this.getQueue().length;
  }

  /**
   * Clear all items from the sync queue
   */
  clearQueue(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SYNC_QUEUE_STORAGE_KEY);
    }
  }

  /**
   * Update local tickets storage for offline access
   *
   * @param ticket - The ticket to update
   * @param operation - The operation type
   */
  private updateLocalTickets(ticket: TicketRecord, operation: SyncOperationType): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const tickets = this.getLocalTickets();
    const existingIndex = tickets.findIndex(t => t.id === ticket.id);

    switch (operation) {
      case 'create':
      case 'update':
        if (existingIndex !== -1) {
          tickets[existingIndex] = { ...ticket, syncStatus: 'pending' };
        } else {
          tickets.push({ ...ticket, syncStatus: 'pending' });
        }
        break;

      case 'delete':
        if (existingIndex !== -1) {
          tickets.splice(existingIndex, 1);
        }
        break;
    }

    localStorage.setItem(LOCAL_TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  }

  /**
   * Get locally stored tickets
   *
   * @returns TicketRecord[] - Array of locally stored tickets
   */
  getLocalTickets(): TicketRecord[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const ticketsJson = localStorage.getItem(LOCAL_TICKETS_STORAGE_KEY);
    if (!ticketsJson) {
      return [];
    }

    try {
      const tickets = JSON.parse(ticketsJson);
      return Array.isArray(tickets) ? tickets : [];
    } catch {
      return [];
    }
  }

  /**
   * Save tickets to local storage (for bulk operations)
   *
   * @param tickets - Array of tickets to save locally
   */
  saveLocalTickets(tickets: TicketRecord[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(LOCAL_TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  }

  /**
   * Handle browser coming online
   * Automatically triggers queue processing
   */
  private handleOnline(): void {
    console.log('SyncQueue: Network connection restored');

    // Small delay to ensure connection is stable
    setTimeout(() => {
      this.processQueue().catch(console.error);
    }, 1000);
  }

  /**
   * Handle browser going offline
   */
  private handleOffline(): void {
    console.log('SyncQueue: Network connection lost');
  }

  /**
   * Force sync all local tickets to cloud
   * Useful after initial Google login
   *
   * @returns Promise<void>
   */
  async forceSyncAllToCloud(): Promise<void> {
    if (!this.isOnline() || !googleAuthService.isAuthorized()) {
      throw new Error('Cannot sync: offline or not authorized');
    }

    const localTickets = this.getLocalTickets();

    if (localTickets.length === 0) {
      return;
    }

    // Add all local tickets to queue for sync
    for (const ticket of localTickets) {
      if (ticket.syncStatus !== 'synced') {
        this.addToQueue(ticket, 'update');
      }
    }

    await this.processQueue();
  }

  /**
   * Merge cloud and local tickets with Last-Write-Wins strategy
   *
   * NOTE: Preserves local imageUrl (Base64) since cloud doesn't store images.
   *
   * @param cloudTickets - Tickets from Google Drive
   * @param localTickets - Tickets from local storage
   * @returns TicketRecord[] - Merged tickets
   */
  mergeTickets(cloudTickets: TicketRecord[], localTickets: TicketRecord[]): TicketRecord[] {
    // Create a map of local tickets for quick lookup (to preserve local imageUrl)
    const localMap = new Map<string, TicketRecord>();
    for (const ticket of localTickets) {
      localMap.set(ticket.id, ticket);
    }

    const mergedMap = new Map<string, TicketRecord>();

    // Add all cloud tickets, preserving local imageUrl if cloud has empty imageUrl
    for (const ticket of cloudTickets) {
      const localTicket = localMap.get(ticket.id);
      const imageUrl = ticket.imageUrl || localTicket?.imageUrl || '';
      mergedMap.set(ticket.id, { ...ticket, imageUrl, syncStatus: 'synced' });
    }

    // Merge local tickets using LWW
    for (const localTicket of localTickets) {
      const existing = mergedMap.get(localTicket.id);

      if (!existing) {
        // New local ticket, add it
        mergedMap.set(localTicket.id, localTicket);
      } else {
        // Compare timestamps, use newer version but preserve local imageUrl
        if (new Date(localTicket.updatedAt) > new Date(existing.updatedAt)) {
          mergedMap.set(localTicket.id, localTicket);
        } else {
          // Keep existing but preserve local imageUrl if it has Base64 data
          if (localTicket.imageUrl && localTicket.imageUrl.startsWith('data:')) {
            mergedMap.set(localTicket.id, { ...existing, imageUrl: localTicket.imageUrl });
          }
        }
      }
    }

    return Array.from(mergedMap.values());
  }
}

// Export singleton instance
export const syncQueueService = new SyncQueueService();

// Export class for testing purposes
export { SyncQueueService };

// Export types
export type { SyncQueueItem, SyncOperationType };
