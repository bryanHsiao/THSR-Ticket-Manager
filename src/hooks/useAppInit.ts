/**
 * useAppInit Hook
 * Task 37: Implement application initialization flow
 *
 * Handles the application startup sequence:
 * 1. Load ticket records from IndexedDB
 * 2. Check Google login status
 * 3. Execute cloud sync if logged in
 *
 * Requirements: 3.2 (Cloud storage for ticket records)
 * Requirements: 3.4 (Load records from Google Drive on new device login)
 * Requirements: 3.5 (Use local storage when not logged in to Google)
 *
 * Leverages:
 * - src/services/storageService.ts for storage operations
 * - src/services/googleDriveService.ts for cloud sync
 * - src/stores/ticketStore.ts for state management
 * - src/stores/userStore.ts for auth state management
 */

import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { googleAuthService } from '../services/googleAuthService';
import { useTicketStore } from '../stores/ticketStore';
import { useUserStore } from '../stores/userStore';

/**
 * Initialization step enum for tracking progress
 */
export type InitStep = 'idle' | 'loading_local' | 'checking_auth' | 'syncing' | 'complete';

/**
 * App initialization state interface
 */
export interface AppInitState {
  /** Whether initialization is in progress */
  isInitializing: boolean;
  /** Current initialization step */
  step: InitStep;
  /** Error message if initialization fails */
  error: string | null;
  /** Whether local data has been loaded */
  localDataLoaded: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether cloud sync has been completed */
  syncCompleted: boolean;
}

/**
 * App initialization result interface
 */
export interface UseAppInitResult extends AppInitState {
  /** Manually trigger re-initialization */
  reinitialize: () => Promise<void>;
}

/**
 * Hook for managing application initialization flow
 *
 * This hook orchestrates the app startup sequence:
 * 1. Loads all ticket records from IndexedDB into the ticket store
 * 2. Checks if user is logged in with Google (via localStorage token)
 * 3. If logged in, downloads and merges records from Google Drive
 *
 * Usage:
 * ```tsx
 * function App() {
 *   const { isInitializing, step, error } = useAppInit();
 *
 *   if (isInitializing) {
 *     return <LoadingScreen step={step} />;
 *   }
 *
 *   if (error) {
 *     return <ErrorScreen message={error} />;
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 *
 * @returns AppInitState - Current initialization state and controls
 */
export function useAppInit(): UseAppInitResult {
  const [state, setState] = useState<AppInitState>({
    isInitializing: true,
    step: 'idle',
    error: null,
    localDataLoaded: false,
    isAuthenticated: false,
    syncCompleted: false,
  });

  // Get store actions
  const loadTickets = useTicketStore((s) => s.loadTickets);
  const initializeFromStorage = useUserStore((s) => s.initializeFromStorage);
  const updateSyncTime = useUserStore((s) => s.updateSyncTime);

  /**
   * Initialize the application
   * Runs through the startup sequence step by step
   */
  const initialize = useCallback(async () => {
    // Reset state for (re)initialization
    setState({
      isInitializing: true,
      step: 'idle',
      error: null,
      localDataLoaded: false,
      isAuthenticated: false,
      syncCompleted: false,
    });

    try {
      // Step 1: Load local data from IndexedDB
      setState((prev) => ({ ...prev, step: 'loading_local' }));

      await loadTickets();

      setState((prev) => ({ ...prev, localDataLoaded: true }));

      // Step 2: Check Google login status
      setState((prev) => ({ ...prev, step: 'checking_auth' }));

      // Initialize user store from localStorage (restores session if valid token exists)
      initializeFromStorage();

      const isAuthorized = googleAuthService.isAuthorized();

      setState((prev) => ({ ...prev, isAuthenticated: isAuthorized }));

      // Step 3: Sync with cloud if logged in
      if (isAuthorized) {
        setState((prev) => ({ ...prev, step: 'syncing' }));

        try {
          // Download and merge tickets from Google Drive
          await storageService.downloadFromCloud();

          // Reload tickets to get merged data
          await loadTickets();

          // Update sync time
          updateSyncTime();

          setState((prev) => ({ ...prev, syncCompleted: true }));
        } catch (syncError) {
          // Log sync error but don't fail initialization
          // User can still use the app with local data
          console.warn('Cloud sync failed during initialization:', syncError);

          // Update state to indicate sync was attempted but not completed
          setState((prev) => ({
            ...prev,
            syncCompleted: false,
            // Set a non-fatal warning (don't set error to allow app to continue)
          }));
        }
      }

      // Initialization complete
      setState((prev) => ({
        ...prev,
        isInitializing: false,
        step: 'complete',
      }));
    } catch (error) {
      // Fatal error during initialization
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize application';

      setState((prev) => ({
        ...prev,
        isInitializing: false,
        step: 'idle',
        error: errorMessage,
      }));

      console.error('App initialization failed:', error);
    }
  }, [loadTickets, initializeFromStorage, updateSyncTime]);

  // Run initialization on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    reinitialize: initialize,
  };
}

/**
 * Get human-readable description of current init step
 *
 * @param step - Current initialization step
 * @returns Human-readable description in Chinese
 */
export function getInitStepDescription(step: InitStep): string {
  switch (step) {
    case 'idle':
      return '準備中...';
    case 'loading_local':
      return '載入本地資料...';
    case 'checking_auth':
      return '檢查登入狀態...';
    case 'syncing':
      return '同步雲端資料...';
    case 'complete':
      return '初始化完成';
    default:
      return '載入中...';
  }
}
