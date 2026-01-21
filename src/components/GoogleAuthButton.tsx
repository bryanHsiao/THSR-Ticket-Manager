/**
 * Google Authentication Button Component
 * Task 26: Create GoogleAuthButton component with userStore integration
 *
 * Displays login/logout button based on authentication state
 * Shows user avatar and name when logged in
 * Integrates directly with userStore for state management
 *
 * Requirements: 3.1 (Google account login)
 * Leverages: src/stores/userStore.ts
 */

import { useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { useTicketStore } from '../stores/ticketStore';
import { googleDriveService } from '../services/googleDriveService';
import { storageService } from '../services/storageService';

/**
 * Google Authentication Button Component
 *
 * Renders different UI based on authentication state:
 * - Not logged in: Shows "使用 Google 登入" button with Google icon
 * - Logged in: Shows user avatar, name, and logout button
 *
 * Features:
 * - Integrates with userStore for state and actions
 * - Responsive design (avatar only on mobile when logged in)
 * - Hover/active states for buttons
 * - Loading state support
 * - Error handling with console logging
 * - Traditional Chinese interface
 */
export function GoogleAuthButton() {
  const { isGoogleLoggedIn, googleUser, login, logout } = useUserStore();
  const loadTickets = useTicketStore((state) => state.loadTickets);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle login button click
   * Calls userStore.login() and manages loading state
   */
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Google login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle logout button click
   * Calls userStore.logout() and manages loading state
   */
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Google logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle clear cloud data button click
   * Confirms with user before clearing all cloud AND local data
   */
  const handleClearAllData = async () => {
    const confirmed = window.confirm('確定要清除所有資料嗎？（包含本地和雲端資料）\n此操作無法復原。');
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Clear cloud data (deletes entire app folder)
      await googleDriveService.clearCloudData();

      // Clear local data (IndexedDB and localStorage)
      await storageService.clearAllData();

      // Reload tickets to update UI (will be empty)
      await loadTickets();

      alert('已清除所有資料');
    } catch (error) {
      console.error('Clear all data failed:', error);
      alert('清除資料失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (isGoogleLoggedIn && googleUser) {
    return (
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User info */}
        <div className="flex items-center gap-2">
          <img
            src={googleUser.picture}
            alt={googleUser.name}
            className="w-8 h-8 rounded-full border-2 border-white/50"
            referrerPolicy="no-referrer"
          />
          <span className="hidden sm:inline text-sm font-medium text-white max-w-[120px] truncate">
            {googleUser.name}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Clear all data button */}
          <button
            onClick={handleClearAllData}
            disabled={isLoading}
            className="
              p-2
              text-white/70
              hover:text-white
              hover:bg-white/10
              rounded-lg
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="清除所有資料"
            aria-label="清除所有資料"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="
              px-3 py-1.5
              text-sm font-medium
              text-white/90
              bg-white/10
              hover:bg-white/20
              rounded-lg
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isLoading ? '...' : '登出'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="
        flex items-center gap-2 sm:gap-3
        px-5 py-2.5 sm:px-6 sm:py-3
        text-sm sm:text-base font-medium
        text-gray-700 dark:text-gray-200
        bg-white dark:bg-gray-800
        border border-gray-300 dark:border-gray-600
        rounded-lg
        shadow-sm
        hover:bg-gray-50 dark:hover:bg-gray-700
        hover:border-gray-400 dark:hover:border-gray-500
        hover:shadow-md
        active:bg-gray-100 dark:active:bg-gray-600
        active:shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm
      "
    >
      {/* Google Icon SVG */}
      <svg
        className="w-5 h-5 sm:w-6 sm:h-6"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>

      {/* Button text */}
      <span>
        {isLoading ? '登入中...' : '使用 Google 登入'}
      </span>
    </button>
  );
}

export default GoogleAuthButton;
