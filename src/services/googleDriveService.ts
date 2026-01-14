/**
 * Google Drive Service
 * Task 17: Implement Google Drive service infrastructure
 * Task 18: Implement Google Drive upload functionality
 * Task 19: Implement Google Drive download functionality
 *
 * Uses Google Drive API v3 for cloud storage operations
 * Integrates with googleAuthService for access token management
 *
 * Requirements: 3.2 (Cloud storage for ticket records)
 * - Creates dedicated folder for storing records
 * - Provides file search functionality
 * Requirements: 3.3 (Auto-sync to Google Drive)
 * - Upload/update tickets.json when records are created or modified
 * Requirements: 3.4 (Load records from Google Drive on new device login)
 * - Downloads ticket records from Google Drive
 */

import { GOOGLE_DRIVE_FOLDER_NAME, GOOGLE_DRIVE_TICKETS_FILE } from '../config/google';
import { googleAuthService } from './googleAuthService';
import type { TicketRecord } from '../types/ticket';

/**
 * Google Drive API base URL
 */
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Google Drive Upload API base URL (for multipart uploads)
 */
const GOOGLE_DRIVE_UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * MIME type for Google Drive folder
 */
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

/**
 * MIME type for JSON files
 */
const JSON_MIME_TYPE = 'application/json';

/**
 * Default tickets file name (using config constant)
 */
const TICKETS_FILE_NAME = GOOGLE_DRIVE_TICKETS_FILE;

/**
 * Interface for Google Drive file metadata
 */
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

/**
 * Interface for Google Drive files list response
 */
interface DriveFilesListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Google Drive Service
 *
 * Provides methods for Google Drive operations including:
 * - ensureFolder(): Creates or retrieves the app folder
 * - findFile(): Searches for files by name within the app folder
 * - fetchTickets(): Downloads and parses tickets.json from Google Drive
 * - uploadTickets(): Uploads ticket records to Google Drive as tickets.json
 */
class GoogleDriveService {
  private folderId: string | null = null;
  private uploadLock: Promise<void> | null = null;

  /**
   * Get authorization headers for API requests
   *
   * @returns Headers object with Bearer token
   * @throws Error if no valid access token is available
   */
  private getAuthHeaders(): HeadersInit {
    const accessToken = googleAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Ensure the THSR-Ticket-Manager folder exists in Google Drive
   * Creates the folder if it doesn't exist, or returns the existing folder ID
   *
   * @returns Promise<string> - The folder ID
   * @throws Error if folder creation fails or user is not authorized
   */
  async ensureFolder(): Promise<string> {
    // Return cached folder ID if available
    if (this.folderId) {
      return this.folderId;
    }

    // Search for existing folder
    const existingFolderId = await this.findFolder();

    if (existingFolderId) {
      this.folderId = existingFolderId;
      return existingFolderId;
    }

    // Create new folder
    const newFolderId = await this.createFolder();
    this.folderId = newFolderId;
    return newFolderId;
  }

  /**
   * Search for a file by name within the app folder
   *
   * @param name - The file name to search for
   * @returns Promise<string | null> - The file ID if found, null otherwise
   * @throws Error if user is not authorized or API call fails
   */
  async findFile(name: string): Promise<string | null> {
    const folderId = await this.ensureFolder();

    // Build search query: file with exact name in our folder
    const query = `name = '${this.escapeQueryString(name)}' and '${folderId}' in parents and trashed = false`;

    const searchParams = new URLSearchParams({
      q: query,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
    });

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to search for file: ${errorData.error?.message || response.statusText}`);
    }

    const data: DriveFilesListResponse = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    return null;
  }

  /**
   * Search for the app folder in Google Drive
   *
   * @returns Promise<string | null> - The folder ID if found, null otherwise
   */
  private async findFolder(): Promise<string | null> {
    // Build search query: folder with our app name in root
    const query = `name = '${this.escapeQueryString(GOOGLE_DRIVE_FOLDER_NAME)}' and mimeType = '${FOLDER_MIME_TYPE}' and 'root' in parents and trashed = false`;

    const searchParams = new URLSearchParams({
      q: query,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
    });

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to search for folder: ${errorData.error?.message || response.statusText}`);
    }

    const data: DriveFilesListResponse = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    return null;
  }

  /**
   * Create the app folder in Google Drive
   *
   * @returns Promise<string> - The newly created folder ID
   */
  private async createFolder(): Promise<string> {
    const metadata = {
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: FOLDER_MIME_TYPE,
    };

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to create folder: ${errorData.error?.message || response.statusText}`);
    }

    const data: DriveFile = await response.json();
    return data.id;
  }

  /**
   * Escape special characters in query strings for Google Drive API
   *
   * @param str - The string to escape
   * @returns Escaped string safe for query use
   */
  private escapeQueryString(str: string): string {
    // Escape single quotes and backslashes for Google Drive query syntax
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * Fetch all ticket records from Google Drive
   * Downloads tickets.json from the app folder and parses it
   *
   * Requirements: 3.4 (Load records from Google Drive on new device login)
   *
   * @returns Promise<TicketRecord[]> - Array of ticket records, empty array if file doesn't exist
   * @throws Error if user is not authorized or API call fails
   */
  async fetchTickets(): Promise<TicketRecord[]> {
    // Find the tickets.json file in our app folder
    const fileId = await this.findFile(TICKETS_FILE_NAME);

    // If file doesn't exist, return empty array
    if (!fileId) {
      return [];
    }

    // Download file content using alt=media parameter
    const accessToken = googleAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to download tickets: ${errorData.error?.message || response.statusText}`);
    }

    // Parse JSON content
    const tickets: TicketRecord[] = await response.json();

    // Ensure we return an array
    if (!Array.isArray(tickets)) {
      return [];
    }

    return tickets;
  }

  /**
   * Upload tickets to Google Drive as tickets.json
   * Creates the file if it doesn't exist, updates if it exists
   *
   * Task 18: Implement Google Drive upload functionality
   * Requirements: 3.3 (Auto-sync to Google Drive when records are created or modified)
   *
   * NOTE: Base64 image data is excluded from sync to avoid large file sizes.
   * Images are stored locally only.
   *
   * Uses a lock to prevent race conditions that cause duplicate files.
   *
   * @param tickets - Array of ticket records to upload
   * @throws Error if user is not authorized or API call fails
   */
  async uploadTickets(tickets: TicketRecord[]): Promise<void> {
    // Wait for any pending upload to complete (prevent race condition)
    if (this.uploadLock) {
      console.log('[uploadTickets] Waiting for previous upload to complete...');
      await this.uploadLock;
    }

    // Create a new lock for this upload
    let resolveLock: () => void;
    this.uploadLock = new Promise(resolve => {
      resolveLock = resolve;
    });

    try {
      const folderId = await this.ensureFolder();

      // Find ALL existing files (handle duplicates)
      const existingFileIds = await this.findAllFiles(TICKETS_FILE_NAME);

      // Strip Base64 image data from tickets before uploading
      // Base64 data is too large for JSON sync, keep it local only
      const ticketsForSync = tickets.map(ticket => {
        const { imageUrl, ...rest } = ticket;
        // Only exclude if it's a Base64 data URL (starts with "data:")
        if (imageUrl && imageUrl.startsWith('data:')) {
          return { ...rest, imageUrl: '' }; // Clear Base64 data
        }
        return ticket; // Keep Google Drive URLs
      });

      // Prepare the JSON content
      const jsonContent = JSON.stringify(ticketsForSync, null, 2);

      if (existingFileIds.length > 0) {
        // Update the first file
        await this.updateFile(existingFileIds[0], jsonContent);

        // Delete any duplicate files
        if (existingFileIds.length > 1) {
          console.log(`[uploadTickets] Cleaning up ${existingFileIds.length - 1} duplicate files`);
          for (let i = 1; i < existingFileIds.length; i++) {
            await this.deleteFile(existingFileIds[i]);
          }
        }
      } else {
        // Create new file
        await this.createFile(folderId, TICKETS_FILE_NAME, jsonContent);
      }
    } finally {
      // Release the lock
      resolveLock!();
      this.uploadLock = null;
    }
  }

  /**
   * Create a new file in Google Drive using multipart upload
   *
   * @param folderId - The parent folder ID
   * @param fileName - The name of the file to create
   * @param content - The file content as string
   * @returns Promise<string> - The newly created file ID
   */
  private async createFile(folderId: string, fileName: string, content: string): Promise<string> {
    const accessToken = googleAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    // Create multipart request body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: JSON_MIME_TYPE,
      parents: [folderId],
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${JSON_MIME_TYPE}\r\n\r\n` +
      content +
      closeDelimiter;

    const response = await fetch(
      `${GOOGLE_DRIVE_UPLOAD_API_BASE}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to create file: ${errorData.error?.message || response.statusText}`);
    }

    const data: DriveFile = await response.json();
    return data.id;
  }

  /**
   * Update an existing file in Google Drive using multipart upload
   *
   * @param fileId - The ID of the file to update
   * @param content - The new file content as string
   */
  private async updateFile(fileId: string, content: string): Promise<void> {
    const accessToken = googleAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    // Create multipart request body for update
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Metadata only needs the mimeType for update (name and parents are not changed)
    const metadata = {
      mimeType: JSON_MIME_TYPE,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${JSON_MIME_TYPE}\r\n\r\n` +
      content +
      closeDelimiter;

    const response = await fetch(
      `${GOOGLE_DRIVE_UPLOAD_API_BASE}/files/${fileId}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to update file: ${errorData.error?.message || response.statusText}`);
    }
  }

  /**
   * Clear the cached folder ID
   * Useful for testing or when user logs out
   */
  clearCache(): void {
    this.folderId = null;
  }

  /**
   * Delete a file from Google Drive by ID
   *
   * @param fileId - The ID of the file to delete
   */
  private async deleteFile(fileId: string): Promise<void> {
    const accessToken = googleAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to delete file: ${errorData.error?.message || response.statusText}`);
    }
  }

  /**
   * Find all files with a given name in the app folder
   * (Google Drive allows duplicate file names)
   *
   * @param name - The file name to search for
   * @returns Promise<string[]> - Array of file IDs
   */
  private async findAllFiles(name: string): Promise<string[]> {
    const folderId = await this.ensureFolder();

    const query = `name = '${this.escapeQueryString(name)}' and '${folderId}' in parents and trashed = false`;

    const searchParams = new URLSearchParams({
      q: query,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
    });

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to search for files: ${errorData.error?.message || response.statusText}`);
    }

    const data: DriveFilesListResponse = await response.json();

    return data.files ? data.files.map(f => f.id) : [];
  }

  /**
   * Clear all ticket data from Google Drive
   * Deletes ALL tickets.json files from the app folder (handles duplicates)
   *
   * @returns Promise<number> - Number of files deleted
   */
  async clearCloudData(): Promise<number> {
    // Find ALL tickets.json files (there might be duplicates)
    const fileIds = await this.findAllFiles(TICKETS_FILE_NAME);

    console.log(`[clearCloudData] Found ${fileIds.length} files to delete:`, fileIds);

    if (fileIds.length === 0) {
      return 0;
    }

    // Delete all files
    for (const fileId of fileIds) {
      console.log(`[clearCloudData] Deleting file: ${fileId}`);
      await this.deleteFile(fileId);
    }

    console.log(`[clearCloudData] Deleted ${fileIds.length} files`);
    return fileIds.length;
  }

  /**
   * Upload an image file to Google Drive
   * Stores ticket images in a subfolder called "images"
   *
   * @param imageBlob - The image data as Blob
   * @param fileName - The filename for the image (e.g., ticket-{id}.jpg)
   * @returns Promise<string> - The web content link URL for the uploaded image
   */
  async uploadImage(imageBlob: Blob, fileName: string): Promise<string> {
    const folderId = await this.ensureFolder();

    // Ensure images subfolder exists
    const imagesFolderId = await this.ensureImagesFolder(folderId);

    const accessToken = googleAuthService.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authorized. Please login with Google first.');
    }

    // Create multipart request body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: imageBlob.type || 'image/jpeg',
      parents: [imagesFolderId],
    };

    // Convert blob to base64
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${imageBlob.type || 'image/jpeg'}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    const response = await fetch(
      `${GOOGLE_DRIVE_UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,webContentLink,webViewLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to upload image: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Make the file publicly viewable
    await this.makeFilePublic(data.id);

    // Return the direct link to the image
    return `https://drive.google.com/uc?id=${data.id}`;
  }

  /**
   * Ensure the images subfolder exists
   */
  private async ensureImagesFolder(parentFolderId: string): Promise<string> {
    const query = `name = 'images' and mimeType = '${FOLDER_MIME_TYPE}' and '${parentFolderId}' in parents and trashed = false`;

    const searchParams = new URLSearchParams({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to search for images folder');
    }

    const data: DriveFilesListResponse = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create images folder
    const metadata = {
      name: 'images',
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentFolderId],
    };

    const createResponse = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(metadata),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create images folder');
    }

    const folderData: DriveFile = await createResponse.json();
    return folderData.id;
  }

  /**
   * Make a file publicly viewable (anyone with link can view)
   */
  private async makeFilePublic(fileId: string): Promise<void> {
    const accessToken = googleAuthService.getAccessToken();
    if (!accessToken) return;

    await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();

// Export class for testing purposes
export { GoogleDriveService };
