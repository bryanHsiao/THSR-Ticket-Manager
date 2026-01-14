/**
 * Google OAuth configuration
 * Task 15: Google OAuth credentials setup
 */

/**
 * Google OAuth Client ID from environment variables
 * Set this in .env file as VITE_GOOGLE_CLIENT_ID
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Google OAuth scopes
 * - openid, email, profile: Required for fetching user info
 * - drive.file: For accessing files created by this app only
 */
export const GOOGLE_DRIVE_SCOPE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');

/**
 * Google Drive folder name for storing ticket data
 */
export const GOOGLE_DRIVE_FOLDER_NAME = 'THSR-Ticket-Manager';

/**
 * Google Drive tickets file name
 */
export const GOOGLE_DRIVE_TICKETS_FILE = 'tickets.json';

/**
 * LocalStorage keys for token persistence
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'thsr_google_access_token',
  USER_INFO: 'thsr_google_user_info',
  TOKEN_EXPIRY: 'thsr_google_token_expiry',
} as const;

/**
 * Check if Google OAuth is properly configured
 * @returns true if GOOGLE_CLIENT_ID is set and valid
 */
export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 0);
}

/**
 * Validate Google Client ID format
 * Google Client IDs typically end with .apps.googleusercontent.com
 * @returns true if the format appears valid
 */
export function isValidGoogleClientId(): boolean {
  if (!GOOGLE_CLIENT_ID) return false;
  return GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com');
}

/**
 * Get Google OAuth configuration for @react-oauth/google
 */
export function getGoogleOAuthConfig() {
  return {
    clientId: GOOGLE_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
  };
}
