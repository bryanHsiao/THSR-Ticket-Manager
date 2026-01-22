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
import { googleDriveService } from './services/googleDriveService';
import { llmConfigService } from './services/llmConfigService';
import type { OCREngineType, OCRResultWithMeta } from './types/ocr';
import { blobToBase64, compressImage } from './utils/imageUtils';
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
  /** Error message from form submission (shown inside modal) */
  submitError: string | null;
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
  submitError: null,
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
  // Migration toast state
  const [migrationToast, setMigrationToast] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });
  // Receipt upload toast state
  const [receiptToast, setReceiptToast] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' }>({ show: false, message: '', type: 'info' });

  // Ticket store actions
  const loadTickets = useTicketStore((state) => state.loadTickets);
  const addTicket = useTicketStore((state) => state.addTicket);
  const updateTicket = useTicketStore((state) => state.updateTicket);
  const deleteTicket = useTicketStore((state) => state.deleteTicket);
  const setProcessing = useTicketStore((state) => state.setProcessing);
  const clearError = useTicketStore((state) => state.clearError);
  const clearSyncError = useTicketStore((state) => state.clearSyncError);
  const tickets = useTicketStore((state) => state.tickets);
  const isProcessing = useTicketStore((state) => state.isProcessing);
  const syncError = useTicketStore((state) => state.syncError);

  // Get user store state for Header component
  const { isGoogleLoggedIn, lastSyncTime, logout } = useUserStore();

  // Derive sync status from user state
  const syncStatus: SyncStatus | null = isGoogleLoggedIn
    ? (lastSyncTime ? 'synced' : 'pending')
    : 'local';

  // Get syncTickets action
  const syncTickets = useTicketStore((state) => state.syncTickets);

  // Check for pending sync tickets
  const hasPendingSync = isGoogleLoggedIn && tickets.some(
    (t) => t.syncStatus === 'pending' || t.syncStatus === 'local'
  );

  // Warn user before leaving if there are unsync'd tickets
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingSync) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but this triggers the dialog
        e.returnValue = '有未同步的資料，確定要離開嗎？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingSync]);

  // Auto-dismiss sync error toast after 5 seconds
  // Also handle auth errors by logging out
  useEffect(() => {
    if (syncError) {
      // Check if it's an auth error
      if (googleAuthService.isAuthError(new Error(syncError))) {
        googleAuthService.handleAuthFailure();
        logout();
        clearSyncError();
        return;
      }

      const timer = setTimeout(() => {
        clearSyncError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncError, clearSyncError, logout]);

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

      // Show UI immediately after local data loads
      setIsInitialized(true);

      // Sync from cloud in background (don't block UI)
      if (googleAuthService.isAuthorized()) {
        syncTickets()
          .then(() => {
            console.log('Cloud sync completed');
            // After sync, migrate existing images to Drive (background)
            migrateImagesToCloud();
          })
          .catch((error) => {
            console.warn('Cloud sync failed, using local data:', error);
            // If auth error, clear credentials and logout
            if (googleAuthService.isAuthError(error)) {
              googleAuthService.handleAuthFailure();
              logout();
            }
          });
      }
    };

    initializeApp();
  }, [loadTickets, syncTickets, logout]);

  /**
   * Migrate existing ticket images to Google Drive
   * Runs in background after cloud sync completes
   * Only migrates tickets that have local Base64 imageUrl but no driveImageId
   */
  const migrateImagesToCloud = useCallback(async () => {
    // Get current tickets from store
    const currentTickets = useTicketStore.getState().tickets;

    // Find tickets that need migration (have imageUrl but no driveImageId)
    const ticketsToMigrate = currentTickets.filter(
      (t) => t.imageUrl && t.imageUrl.startsWith('data:') && !t.driveImageId
    );

    if (ticketsToMigrate.length === 0) {
      console.log('[Migration] No images to migrate');
      return;
    }

    console.log(`[Migration] Found ${ticketsToMigrate.length} images to migrate`);

    // Show migration toast (auto-dismiss after 4 seconds)
    setMigrationToast({ show: true, count: ticketsToMigrate.length });
    setTimeout(() => {
      setMigrationToast({ show: false, count: 0 });
    }, 4000);

    // Migrate each ticket's image in sequence (to avoid overwhelming the API)
    for (const ticket of ticketsToMigrate) {
      try {
        // Convert Base64 to Blob
        const response = await fetch(ticket.imageUrl!);
        const blob = await response.blob();

        // Upload to Drive with formatted filename: yyyymmdd-ticketNumber.jpg
        const dateStr = ticket.travelDate.replace(/-/g, '');
        const fileName = `${dateStr}-${ticket.ticketNumber}.jpg`;
        const driveImageId = await googleDriveService.uploadImage(
          blob,
          fileName,
          ticket.travelDate
        );

        // Update ticket with driveImageId
        const updatedTicket: TicketRecord = {
          ...ticket,
          driveImageId,
          updatedAt: new Date().toISOString(),
        };
        await updateTicket(updatedTicket);

        console.log(`[Migration] Migrated image for ticket ${ticket.ticketNumber}`);
      } catch (error) {
        console.warn(`[Migration] Failed to migrate image for ticket ${ticket.ticketNumber}:`, error);
        // Continue with next ticket even if one fails
      }
    }

    console.log('[Migration] Image migration completed');
  }, [updateTicket]);

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

      // Clear any previous ticketStore error before showing modal
      clearError();

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
        submitError: null, // Clear any previous submit error
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
  }, [setProcessing, clearError]);

  /**
   * Handle OCR preview confirmation
   * Saves ticket with Base64 image locally, then uploads image to Drive in background
   */
  const handleOCRConfirm = useCallback(async (formData: TicketFormData) => {
    const file = appState.imageFile;
    if (!file) return;

    // Clear previous error and start processing
    setAppState((prev) => ({ ...prev, submitError: null }));
    setProcessing(true);

    try {
      // Compress image before storing to avoid IndexedDB quota issues on mobile
      // Max width 800px is enough for viewing, reduces storage significantly
      const compressedFile = await compressImage(file, 800);

      // Convert compressed image to Base64 for local storage
      const imageUrl = await blobToBase64(compressedFile);

      // Create ticket record
      const isLoggedIn = googleAuthService.isAuthorized();
      const now = new Date().toISOString();
      const ticketId = generateUUID();
      const ticket: TicketRecord = {
        id: ticketId,
        ...formData,
        imageUrl,
        createdAt: now,
        updatedAt: now,
        syncStatus: isLoggedIn ? 'pending' : 'local',
      };

      // Save ticket locally first (fast)
      await addTicket(ticket);

      // Close modal and reset state
      setAppState((prev) => ({
        ...prev,
        isOCRPreviewOpen: false,
        ocrResult: null,
        imageFile: null,
        submitError: null,
      }));

      // Upload image to Google Drive in background (don't block UI)
      if (isLoggedIn) {
        // Filename format: yyyymmdd-ticketNumber.jpg
        const dateStr = formData.travelDate.replace(/-/g, '');
        const fileName = `${dateStr}-${formData.ticketNumber}.jpg`;
        googleDriveService.uploadImage(compressedFile, fileName, formData.travelDate)
          .then(async (driveImageId) => {
            // Update ticket with Drive image ID
            const updatedTicket: TicketRecord = {
              ...ticket,
              driveImageId,
              updatedAt: new Date().toISOString(),
            };
            await updateTicket(updatedTicket);
            console.log(`[Image] Uploaded to Drive: ${driveImageId}`);
          })
          .catch((error) => {
            console.warn('[Image] Failed to upload to Drive:', error);
            // Image upload failed, but local save succeeded - not critical
          });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '儲存失敗';
      console.error('Save error:', error);
      // Show error inside modal
      setAppState((prev) => ({
        ...prev,
        submitError: errorMessage,
      }));
    } finally {
      setProcessing(false);
    }
  }, [setProcessing, addTicket, updateTicket, appState.imageFile]);

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

  /**
   * Handle receipt PDF upload
   * Parses filename to extract ticket number, matches to existing tickets, and uploads to Drive
   * Filename format: THSR_{date}_{from}-{to}_{ticketNumber}.pdf
   */
  const handleReceiptUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if logged in
    if (!googleAuthService.isAuthorized()) {
      setReceiptToast({ show: true, message: '請先登入 Google 帳號', type: 'error' });
      setTimeout(() => setReceiptToast({ show: false, message: '', type: 'info' }), 3000);
      return;
    }

    const currentTickets = useTicketStore.getState().tickets;
    let uploadedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    setReceiptToast({ show: true, message: `正在上傳 ${files.length} 個憑證...`, type: 'info' });

    for (const file of Array.from(files)) {
      try {
        // Parse filename: THSR_2024-12-09_左營-台北_1213103440058.pdf
        const match = file.name.match(/THSR_(\d{4}-\d{2}-\d{2})_(.+)-(.+)_(\d{13})\.pdf/);
        if (!match) {
          console.warn(`[Receipt] Invalid filename format: ${file.name}`);
          skippedCount++;
          continue;
        }

        const [, travelDate, , , ticketNumber] = match;

        // Find matching ticket
        const ticket = currentTickets.find(t => t.ticketNumber === ticketNumber);
        if (!ticket) {
          console.warn(`[Receipt] No matching ticket found for: ${ticketNumber}`);
          notFoundCount++;
          continue;
        }

        // Skip if already has receipt
        if (ticket.driveReceiptId) {
          console.log(`[Receipt] Ticket ${ticketNumber} already has receipt, skipping`);
          skippedCount++;
          continue;
        }

        // Upload to Drive
        const driveReceiptId = await googleDriveService.uploadReceipt(file, file.name, travelDate);

        // Update ticket with receipt ID
        const updatedTicket: TicketRecord = {
          ...ticket,
          driveReceiptId,
          updatedAt: new Date().toISOString(),
        };
        await updateTicket(updatedTicket);

        uploadedCount++;
        console.log(`[Receipt] Uploaded receipt for ticket ${ticketNumber}`);
      } catch (error) {
        console.error(`[Receipt] Failed to upload ${file.name}:`, error);
      }
    }

    // Show result
    let message = '';
    if (uploadedCount > 0) message += `已上傳 ${uploadedCount} 個憑證`;
    if (skippedCount > 0) message += (message ? '，' : '') + `略過 ${skippedCount} 個`;
    if (notFoundCount > 0) message += (message ? '，' : '') + `${notFoundCount} 個找不到對應車票`;

    setReceiptToast({
      show: true,
      message: message || '沒有憑證被上傳',
      type: uploadedCount > 0 ? 'success' : 'info'
    });
    setTimeout(() => setReceiptToast({ show: false, message: '', type: 'info' }), 4000);

    // Clear file input
    event.target.value = '';
  }, [updateTicket]);

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

              {/* Submit Error - Fixed at top of modal, always visible */}
              {appState.submitError && (
                <div className="flex-shrink-0 mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        儲存失敗
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {appState.submitError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Sync Error Toast - shows when cloud sync fails but local save succeeded */}
      {syncError && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-slide-up">
          <div className="bg-amber-50 dark:bg-amber-900/90 border border-amber-300 dark:border-amber-700 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  已儲存至本機
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 break-words">
                  {syncError}
                </p>
              </div>
              <button
                onClick={clearSyncError}
                className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 rounded transition-colors"
                aria-label="關閉"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Toast - shows when migrating existing images to Drive */}
      {migrationToast.show && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-slide-up">
          <div className="bg-blue-50 dark:bg-blue-900/90 border border-blue-300 dark:border-blue-700 rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  正在備份圖片到雲端
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {migrationToast.count} 張圖片將在背景上傳
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Upload Toast */}
      {receiptToast.show && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-slide-up">
          <div className={`rounded-lg shadow-lg p-4 border ${
            receiptToast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/90 border-green-300 dark:border-green-700'
              : receiptToast.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/90 border-red-300 dark:border-red-700'
              : 'bg-blue-50 dark:bg-blue-900/90 border-blue-300 dark:border-blue-700'
          }`}>
            <div className="flex items-center gap-3">
              {receiptToast.type === 'success' ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : receiptToast.type === 'error' ? (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                receiptToast.type === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : receiptToast.type === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {receiptToast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons - Desktop only */}
      {isGoogleLoggedIn && (
        <div className="hidden sm:flex fixed right-6 bottom-6 z-40 flex-col items-end gap-3">
          {/* Sync Button - FAB style */}
          <button
            onClick={() => syncTickets()}
            className="
              group
              flex items-center justify-center
              w-14 h-14
              bg-blue-500 hover:bg-blue-600
              text-white
              rounded-full
              shadow-lg hover:shadow-xl
              transition-all duration-300 ease-out
            "
            title="同步到雲端"
          >
            <svg className="w-6 h-6 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Receipt Upload Button - FAB style */}
          <label
            className="
              group
              flex items-center justify-center
              w-14 h-14
              bg-orange-500 hover:bg-orange-600
              text-white
              rounded-full
              shadow-lg hover:shadow-xl
              cursor-pointer
              transition-all duration-300 ease-out
            "
            title="上傳憑證 PDF"
          >
            <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleReceiptUpload}
              className="hidden"
            />
          </label>
        </div>
      )}
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
