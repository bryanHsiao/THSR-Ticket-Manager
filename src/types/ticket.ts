/**
 * Ticket types for THSR ticket management
 * Task 4: Ticket record types definition
 */

/**
 * Sync status for ticket records
 */
export type TicketSyncStatus = 'synced' | 'pending' | 'local';

/**
 * Travel direction
 */
export type TravelDirection = 'northbound' | 'southbound';

/**
 * Ticket record stored in the system
 */
export interface TicketRecord {
  id: string;                          // UUID
  ticketNumber: string;                // Ticket number (13 digits)
  travelDate: string;                  // Travel date YYYY-MM-DD
  travelTime: string;                  // Travel time HH:mm
  direction: TravelDirection;          // Northbound/Southbound
  departure: string;                   // Departure station
  destination: string;                 // Destination station
  purpose: string;                     // Business trip purpose
  imageUrl?: string;                   // Ticket image (Base64 for local storage)
  driveImageId?: string;               // Google Drive file ID for the image
  driveReceiptId?: string;             // Google Drive file ID for the receipt PDF
  createdAt: string;                   // Created time ISO 8601
  updatedAt: string;                   // Updated time ISO 8601
  syncStatus: TicketSyncStatus;        // Sync status
  bookingCode?: string;                // Booking code (8 digits, optional, for T Express)
}

/**
 * OCR recognition result
 */
export interface OCRResult {
  ticketNumber: string | null;
  travelDate: string | null;
  travelTime: string | null;
  direction: TravelDirection | null;
  departure: string | null;
  destination: string | null;
  confidence: number;                  // Recognition confidence 0-1
  rawText: string;                     // Raw OCR text
}

/**
 * Filter options for ticket list
 */
export interface FilterOptions {
  month?: string;                      // YYYY-MM format
  direction?: TravelDirection | 'all';
  searchText?: string;                 // Search by ticket number or purpose
}
