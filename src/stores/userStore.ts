/**
 * User Store - Zustand state management for user authentication
 * Task 22: Create user store
 *
 * Manages:
 * - Google login state
 * - User information
 * - Sync time tracking
 *
 * Requirements: 3.1 (Google account login), 3.3 (Auto sync)
 */

import { create } from 'zustand';
import { googleAuthService } from '../services/googleAuthService';
import type { GoogleUser, UserState } from '../types/user';

/**
 * User store actions interface
 */
interface UserActions {
  /**
   * Login with Google OAuth
   * Calls googleAuthService.login() and updates state
   */
  login: () => Promise<void>;

  /**
   * Logout from Google
   * Calls googleAuthService.logout() and clears state
   */
  logout: () => Promise<void>;

  /**
   * Update the last sync time
   * @param time - Optional ISO timestamp string. Defaults to current time if not provided.
   */
  updateSyncTime: (time?: string) => void;

  /**
   * Initialize store from localStorage (restore session)
   * Called on app startup to check if user was previously logged in
   */
  initializeFromStorage: () => void;
}

/**
 * Combined store type
 */
type UserStore = UserState & UserActions;

/**
 * User store for managing authentication state
 *
 * Usage:
 * ```tsx
 * import { useUserStore } from './stores/userStore';
 *
 * function MyComponent() {
 *   const { isGoogleLoggedIn, googleUser, login, logout } = useUserStore();
 *
 *   if (!isGoogleLoggedIn) {
 *     return <button onClick={login}>Login with Google</button>;
 *   }
 *
 *   return <div>Welcome, {googleUser?.name}</div>;
 * }
 * ```
 */
export const useUserStore = create<UserStore>((set) => ({
  // Initial state
  isGoogleLoggedIn: false,
  googleUser: null,
  lastSyncTime: null,

  // Actions
  login: async () => {
    try {
      const user: GoogleUser = await googleAuthService.login();
      set({
        isGoogleLoggedIn: true,
        googleUser: user,
      });

      // Auto-sync tickets after successful login
      // Import dynamically to avoid circular dependency
      const { useTicketStore } = await import('./ticketStore');
      try {
        await useTicketStore.getState().syncTickets();
        set({ lastSyncTime: new Date().toISOString() });
      } catch (syncError) {
        console.warn('Auto-sync after login failed:', syncError);
        // Don't throw - login was successful, sync can be retried
      }
    } catch (error) {
      // Reset state on login failure
      set({
        isGoogleLoggedIn: false,
        googleUser: null,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await googleAuthService.logout();

      // Clear all local ticket data on logout
      // Use dynamic import to avoid circular dependency
      const { useTicketStore } = await import('./ticketStore');
      await useTicketStore.getState().clearAllData();
    } finally {
      // Always clear state, even if logout API call fails
      set({
        isGoogleLoggedIn: false,
        googleUser: null,
        lastSyncTime: null,
      });
    }
  },

  updateSyncTime: (time?: string) => {
    set({
      lastSyncTime: time ?? new Date().toISOString(),
    });
  },

  initializeFromStorage: () => {
    // Check if user is still authorized (valid token exists)
    const isAuthorized = googleAuthService.isAuthorized();

    if (isAuthorized) {
      // Restore user info from localStorage
      const storedUser = googleAuthService.getStoredUser();

      if (storedUser) {
        set({
          isGoogleLoggedIn: true,
          googleUser: storedUser,
        });
        return;
      }
    }

    // Not authorized or no stored user, ensure clean state
    set({
      isGoogleLoggedIn: false,
      googleUser: null,
    });
  },
}));

/**
 * Initialize user store on module load
 * This ensures the store checks localStorage for existing session
 * when the application starts
 */
export function initializeUserStore(): void {
  useUserStore.getState().initializeFromStorage();
}
