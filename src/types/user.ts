/**
 * User types for Google authentication
 * Task 5: User state types definition
 */

/**
 * Google user information returned after successful authentication
 */
export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

/**
 * User authentication state
 */
export interface UserState {
  isGoogleLoggedIn: boolean;
  googleUser: GoogleUser | null;
  lastSyncTime: string | null;
}

/**
 * Sync status for ticket records
 */
export type SyncStatus = 'synced' | 'pending' | 'local';
