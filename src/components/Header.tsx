/**
 * Header Component
 * Task 25: Create Header component
 *
 * Purpose: Display application title, Google auth button slot, and sync status indicator
 *
 * Requirements: NFR-Usability (Responsive design, Traditional Chinese interface)
 */

import type { ReactNode } from 'react';
import type { SyncStatus } from '../types/user';

/**
 * Props for the Header component
 */
export interface HeaderProps {
  /** Slot for GoogleAuthButton or other authentication UI */
  authButton?: ReactNode;
  /** Current sync status to display */
  syncStatus?: SyncStatus | null;
  /** Last sync time (ISO string) to display */
  lastSyncTime?: string | null;
  /** Whether a sync operation is in progress */
  isSyncing?: boolean;
  /** Callback when settings button is clicked */
  onSettingsClick?: () => void;
  /** Whether API key is configured */
  isApiKeyConfigured?: boolean;
}

/**
 * Sync status indicator component
 */
function SyncStatusIndicator({
  status,
  lastSyncTime,
  isSyncing,
}: {
  status?: SyncStatus | null;
  lastSyncTime?: string | null;
  isSyncing?: boolean;
}) {
  // Show syncing spinner
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-orange-100">
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="hidden sm:inline">同步中...</span>
      </div>
    );
  }

  // Show last sync time if available
  if (lastSyncTime) {
    const formattedTime = new Date(lastSyncTime).toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="flex items-center gap-1.5 text-xs text-orange-100">
        {/* Sync status icon based on status */}
        {status === 'synced' && (
          <svg
            className="w-4 h-4 text-green-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {status === 'pending' && (
          <svg
            className="w-4 h-4 text-yellow-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {status === 'local' && (
          <svg
            className="w-4 h-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
        {!status && (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
        <span className="hidden sm:inline">{formattedTime}</span>
      </div>
    );
  }

  // No sync information to display
  return null;
}

/**
 * Ticket icon SVG component
 */
function TicketIcon() {
  return (
    <svg
      className="w-7 h-7 sm:w-8 sm:h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
      />
    </svg>
  );
}

/**
 * Header Component
 *
 * Displays:
 * - Application title with icon
 * - Sync status indicator
 * - Slot for authentication button
 *
 * Features:
 * - Responsive design (compact on mobile, full on desktop)
 * - Orange gradient background consistent with app theme
 * - Accessible structure with semantic HTML
 *
 * Usage:
 * ```tsx
 * <Header
 *   authButton={<GoogleAuthButton {...props} />}
 *   syncStatus="synced"
 *   lastSyncTime="2024-01-01T12:00:00Z"
 *   isSyncing={false}
 * />
 * ```
 */
export function Header({
  authButton,
  syncStatus,
  lastSyncTime,
  isSyncing = false,
  onSettingsClick,
  isApiKeyConfigured = false,
}: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left section: App title and icon */}
          <div className="flex items-center gap-2 sm:gap-3">
            <TicketIcon />
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap">
                高鐵車票管理
              </h1>
              {/* Version indicator */}
              <p className="text-[10px] text-orange-200/70 hidden sm:block">
                v{import.meta.env.VITE_APP_VERSION || '0.0.0'}
              </p>
            </div>
          </div>

          {/* Right section: Settings, Sync status and auth button */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Sync status indicator */}
            <SyncStatusIndicator
              status={syncStatus}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
            />

            {/* Settings button */}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="設定"
                title="API 設定"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {/* Status dot */}
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    isApiKeyConfigured ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
              </button>
            )}

            {/* Auth button slot */}
            {authButton && (
              <div className="flex-shrink-0">
                {authButton}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
