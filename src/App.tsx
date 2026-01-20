/**
 * App - Main Application Framework
 * Task 6: Create App main framework
 * Task 25: Integrate all components
 * Task 36: Integrate main functional areas
 *
 * Purpose: Application entry point, handles global state initialization and layout
 * Dependencies: React, Zustand stores, Google OAuth, All components
 *
 * Requirements: 2.1, 2.3, 2.4 - Ticket record management with upload, filter, and list
 * NFR: Responsive design, Traditional Chinese interface
 */

import { useEffect, useState, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID, isGoogleConfigured } from './config/google';
import { useUserStore, initializeUserStore } from './stores/userStore';
import { useTicketStore } from './stores/ticketStore';
import { Header } from './components/Header';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { TicketList } from './components/TicketList';
import { TicketUploader } from './components/TicketUploader';
import { TicketForm, type TicketFormData } from './components/TicketForm';
import { OCREngineIndicator } from './components/OCREngineIndicator';
import { ApiKeySettings } from './components/ApiKeySettings';
import { ocrManager } from './services/ocrManager';
import { googleAuthService } from './services/googleAuthService';
import { llmConfigService } from './services/llmConfigService';
import type { OCREngineType, OCRResultWithMeta } from './types/ocr';
import { blobToBase64 } from './utils/imageUtils';
import type { TicketRecord } from './types/ticket';
import type { SyncStatus } from './types/user';

/**
 * App state for managing modals and OCR workflow
 */
interface AppState {
  /** Whether OCR processing is in progress */
  isProcessingOCR: boolean;
  /** Current progress message during processing */
  progressMessage: string;
  /** Error message from OCR processing */
  ocrError: string | null;
  /** Whether the OCR preview modal is open */
  isOCRPreviewOpen: boolean;
  /** The current OCR result being previewed (with engine metadata) */
  ocrResult: OCRResultWithMeta | null;
  /** The original image file for upload */
  imageFile: File | null;
  /** Whether the edit modal is open */
  isEditModalOpen: boolean;
  /** The ticket being edited */
  editingTicket: TicketRecord | null;
  /** Last OCR engine used */
  lastOcrEngine: OCREngineType | null;
  /** Whether OCR fallback was used */
  ocrFallbackUsed: boolean;
  /** Reason for OCR fallback */
  ocrFallbackReason: string | null;
}

/**
 * Initial app state
 */
const initialAppState: AppState = {
  isProcessingOCR: false,
  progressMessage: '',
  ocrError: null,
  isOCRPreviewOpen: false,
  ocrResult: null,
  imageFile: null,
  isEditModalOpen: false,
  editingTicket: null,
  lastOcrEngine: null,
  ocrFallbackUsed: false,
  ocrFallbackReason: null,
};

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Main App content wrapped with initialization logic
 */
function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);

  // Ticket store actions
  const loadTickets = useTicketStore((state) => state.loadTickets);
  const addTicket = useTicketStore((state) => state.addTicket);
  const updateTicket = useTicketStore((state) => state.updateTicket);
  const deleteTicket = useTicketStore((state) => state.deleteTicket);
  const setProcessing = useTicketStore((state) => state.setProcessing);
  const tickets = useTicketStore((state) => state.tickets);
  const isProcessing = useTicketStore((state) => state.isProcessing);

  // Get user store state for Header component
  const { isGoogleLoggedIn, lastSyncTime } = useUserStore();

  // Derive sync status from user state
  const syncStatus: SyncStatus | null = isGoogleLoggedIn
    ? (lastSyncTime ? 'synced' : 'pending')
    : 'local';

  // Get syncTickets action
  const syncTickets = useTicketStore((state) => state.syncTickets);

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize LLM config from localStorage
      try {
        await llmConfigService.initialize();
        setIsApiKeyConfigured(llmConfigService.isConfigured());
        console.log('LLM config initialized');
      } catch (error) {
        console.warn('Failed to initialize LLM config:', error);
      }

      // Initialize user store from localStorage (restore login state)
      initializeUserStore();

      // Load tickets from IndexedDB first (for fast initial display)
      try {
        await loadTickets();
      } catch (error) {
        console.error('Failed to load tickets:', error);
      }

      // If logged in, sync from cloud to get latest data
      if (googleAuthService.isAuthorized()) {
        try {
          await syncTickets();
          console.log('Cloud sync completed');
        } catch (error) {
          console.warn('Cloud sync failed, using local data:', error);
        }
      }

      setIsInitialized(true);
    };

    initializeApp();
  }, [loadTickets, syncTickets]);

  /**
   * Handle settings save
   */
  const handleSettingsSave = useCallback(() => {
    setIsApiKeyConfigured(llmConfigService.isConfigured());
  }, []);

  /**
   * Handle image capture from TicketUploader
   * Performs OCR and shows preview modal for user confirmation
   * Uses ocrManager for automatic fallback between engines
   */
  const handleImageCapture = useCallback(async (file: File) => {
    // Set processing state
    setAppState((prev) => ({
      ...prev,
      isProcessingOCR: true,
      progressMessage: '正在辨識車票...',
      ocrError: null,
      lastOcrEngine: null,
      ocrFallbackUsed: false,
      ocrFallbackReason: null,
    }));
    setProcessing(true);

    try {
      // Use ocrManager for automatic fallback handling
      const result = await ocrManager.recognizeTicket(file);

      // Show OCR preview modal for user confirmation
      setAppState((prev) => ({
        ...prev,
        isOCRPreviewOpen: true,
        ocrResult: result,
        imageFile: file,
        isProcessingOCR: false,
        progressMessage: '',
        lastOcrEngine: result.engineUsed,
        ocrFallbackUsed: result.fallbackUsed,
        ocrFallbackReason: result.fallbackReason || null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OCR辨識失敗';
      console.error('OCR error:', error);
      setAppState((prev) => ({
        ...prev,
        ocrError: errorMessage,
        isProcessingOCR: false,
        progressMessage: '',
      }));
    } finally {
      setProcessing(false);
    }
  }, [setProcessing]);

  /**
   * Handle OCR preview confirmation
   * Saves ticket with Base64 image locally
   */
  const handleOCRConfirm = useCallback(async (formData: TicketFormData) => {
    const file = appState.imageFile;
    if (!file) return;

    setProcessing(true);

    try {
      // Convert image to Base64 for local storage
      const imageUrl = await blobToBase64(file);

      // Create ticket record
      const isLoggedIn = googleAuthService.isAuthorized();
      const now = new Date().toISOString();
      const ticket: TicketRecord = {
        id: generateUUID(),
        ...formData,
        imageUrl,
        createdAt: now,
        updatedAt: now,
        syncStatus: isLoggedIn ? 'pending' : 'local',
      };

      // Save ticket
      await addTicket(ticket);

      // Close modal and reset state
      setAppState((prev) => ({
        ...prev,
        isOCRPreviewOpen: false,
        ocrResult: null,
        imageFile: null,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '儲存失敗';
      console.error('Save error:', error);
      setAppState((prev) => ({
        ...prev,
        ocrError: errorMessage,
      }));
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, addTicket, appState.imageFile]);

  /**
   * Handle OCR preview cancellation
   */
  const handleOCRCancel = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      isOCRPreviewOpen: false,
      ocrResult: null,
      imageFile: null,
    }));
  }, []);

  /**
   * Handle edit button click from TicketList
   * Opens the edit modal with the ticket data
   */
  const handleEdit = useCallback((id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      setAppState((prev) => ({
        ...prev,
        isEditModalOpen: true,
        editingTicket: ticket,
      }));
    }
  }, [tickets]);

  /**
   * Handle edit form submission
   * Updates the ticket in the store
   */
  const handleEditSubmit = useCallback(async (formData: TicketFormData) => {
    if (!appState.editingTicket) return;

    const updatedTicket: TicketRecord = {
      ...appState.editingTicket,
      ...formData,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending', // Mark as pending sync after update
    };

    try {
      await updateTicket(updatedTicket);

      // Close modal
      setAppState((prev) => ({
        ...prev,
        isEditModalOpen: false,
        editingTicket: null,
      }));
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  }, [appState.editingTicket, updateTicket]);

  /**
   * Handle edit modal cancellation
   */
  const handleEditCancel = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      isEditModalOpen: false,
      editingTicket: null,
    }));
  }, []);

  /**
   * Handle delete from TicketList
   * Deletes the ticket from the store
   */
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteTicket(id);
    } catch (error) {
      console.error('Failed to delete ticket:', error);
    }
  }, [deleteTicket]);

  /**
   * Handle download receipt from TicketList
   * Copies the command to clipboard for user to run in terminal
   */
  const handleDownloadReceipt = useCallback((ticket: TicketRecord) => {
    const cmd = ticket.bookingCode
      ? `npm run receipt -- --date=${ticket.travelDate} --from=${ticket.departure} --to=${ticket.destination} --booking=${ticket.bookingCode}`
      : `npm run receipt -- --date=${ticket.travelDate} --from=${ticket.departure} --to=${ticket.destination} --ticket=${ticket.ticketNumber}`;

    navigator.clipboard.writeText(cmd).then(() => {
      alert(`指令已複製！\n\n在專案目錄執行：\n${cmd}`);
    }).catch(() => {
      alert(`請執行以下指令：\n\n${cmd}`);
    });
  }, []);

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            正在載入...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header Area - Integrated with GoogleAuthButton and sync status */}
      <Header
        authButton={<GoogleAuthButton />}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        isSyncing={false}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isApiKeyConfigured={isApiKeyConfigured}
      />

      {/* Upload Area - At top for easy access */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* OCR Error Message */}
          {appState.ocrError && (
            <div
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between"
              role="alert"
            >
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{appState.ocrError}</span>
              </div>
              <button
                onClick={() => setAppState((prev) => ({ ...prev, ocrError: null }))}
                className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                aria-label="關閉錯誤訊息"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Ticket Uploader - Full width on mobile */}
          <TicketUploader
            onImageCapture={handleImageCapture}
            isProcessing={isProcessing || appState.isProcessingOCR}
            progressMessage={appState.progressMessage}
          />
        </div>
      </div>

      {/* Main Content - Ticket List */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <TicketList
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDownloadReceipt={handleDownloadReceipt}
          />
        </div>
      </main>

      {/* Edit Modal */}
      {appState.isEditModalOpen && appState.editingTicket && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          onClick={handleEditCancel}
        >
          <div className="min-h-screen flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                  編輯車票
                </h2>
                <button
                  onClick={handleEditCancel}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="關閉"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 min-h-0 p-4 sm:p-6">
                <TicketForm
                  initialData={appState.editingTicket}
                  isEditMode={true}
                  onSubmit={handleEditSubmit}
                  onCancel={handleEditCancel}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR Preview Modal */}
      {appState.isOCRPreviewOpen && appState.ocrResult && appState.imageFile && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          onClick={handleOCRCancel}
        >
          <div className="min-h-screen flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                  確認車票資訊
                </h2>
                <button
                  onClick={handleOCRCancel}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="關閉"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Image Preview */}
              <div className="px-6 pt-4">
                <img
                  src={URL.createObjectURL(appState.imageFile)}
                  alt="車票圖片"
                  className="w-full h-auto max-h-48 object-contain rounded-lg bg-gray-100 dark:bg-gray-700"
                />
              </div>

              {/* OCR Engine Indicator */}
              {appState.ocrResult.engineUsed && (
                <div className="mx-6 mt-4">
                  <OCREngineIndicator
                    engineUsed={appState.ocrResult.engineUsed}
                    fallbackUsed={appState.ocrResult.fallbackUsed}
                    fallbackReason={appState.ocrResult.fallbackReason}
                  />
                </div>
              )}

              {/* OCR Confidence Indicator - only show for actual OCR, not manual mode */}
              {appState.ocrResult.confidence < 0.7 && appState.ocrResult.engineUsed !== 'manual' && (
                <div className="mx-6 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>辨識信心度較低，請確認資訊是否正確</span>
                  </div>
                </div>
              )}

              {/* Modal Content with Form */}
              <div className="p-4 sm:p-6">
                <TicketForm
                  initialData={{
                    ticketNumber: appState.ocrResult.ticketNumber || '',
                    travelDate: appState.ocrResult.travelDate || '',
                    travelTime: appState.ocrResult.travelTime || '',
                    direction: appState.ocrResult.direction || 'northbound',
                    departure: appState.ocrResult.departure || '',
                    destination: appState.ocrResult.destination || '',
                  }}
                  isEditMode={false}
                  onSubmit={handleOCRConfirm}
                  onCancel={handleOCRCancel}
                  isSubmitting={isProcessing}
                />
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Settings Modal */}
      <ApiKeySettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSave}
      />
    </div>
  );
}

/**
 * App - Main Application Component
 *
 * Sets up:
 * - GoogleOAuthProvider for Google authentication
 * - Responsive layout structure
 * - Store initialization
 *
 * Layout Structure:
 * +-------------------------------+
 * |  Header (Title + Google Auth) |
 * +-------------------------------+
 * |  FilterBar (Filters)          |
 * +-------------------------------+
 * |                               |
 * |  TicketList (Ticket Cards)    |
 * |                               |
 * +-------------------------------+
 * |  TicketUploader (Upload Btn)  |
 * +-------------------------------+
 *
 * Application State Flow:
 * Initialize -> Load Tickets -> Display List
 *          |
 * Upload Image -> OCR Recognition -> Show Preview -> Confirm -> Save -> Update List
 *                                              -> Cancel -> Return to List
 *
 * Integrated Components:
 * - Header: Application title + GoogleAuthButton + Sync status
 * - FilterBar: Connected to filterStore for filtering
 * - TicketList: Connected to ticketStore, displays filtered tickets
 * - TicketUploader: Handles image upload, triggers OCR
 * - TicketOCRPreview: Displays OCR results for confirmation
 * - TicketForm: Edit form for modifying ticket records
 * - ExportButton: Export tickets to CSV
 */
function App() {
  // Check if Google OAuth is configured
  const googleConfigured = isGoogleConfigured();

  // Warn if Google is not configured
  useEffect(() => {
    if (!googleConfigured) {
      console.warn(
        '高鐵車票管理: Google OAuth 未設定。請在 .env 檔案中設定 VITE_GOOGLE_CLIENT_ID。'
      );
    }
  }, [googleConfigured]);

  // If Google is not configured, render without GoogleOAuthProvider
  // This allows the app to work in local-only mode
  if (!googleConfigured) {
    return <AppContent />;
  }

  // Wrap with GoogleOAuthProvider when configured
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

export default App;
