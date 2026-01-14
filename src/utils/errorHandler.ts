/**
 * Error handling utilities
 * Task 9: Error handling tools
 *
 * Provides error type definitions and user-friendly error message handlers
 * for OCR, network, and Google authentication errors.
 *
 * Requirements: 1.5, 3.5, 3.6
 * - OCR recognition failure handling with user-friendly messages
 * - Network error handling for offline scenarios
 * - Google authentication error handling
 */

/**
 * Error types enum for categorizing application errors
 */
export enum ErrorType {
  /** OCR recognition errors */
  OCR_INITIALIZATION = 'OCR_INITIALIZATION',
  OCR_RECOGNITION = 'OCR_RECOGNITION',
  OCR_PARSE = 'OCR_PARSE',
  OCR_TIMEOUT = 'OCR_TIMEOUT',

  /** Network errors */
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_SERVER_ERROR = 'NETWORK_SERVER_ERROR',
  NETWORK_REQUEST_FAILED = 'NETWORK_REQUEST_FAILED',

  /** Google authentication errors */
  GOOGLE_AUTH_CANCELLED = 'GOOGLE_AUTH_CANCELLED',
  GOOGLE_AUTH_POPUP_BLOCKED = 'GOOGLE_AUTH_POPUP_BLOCKED',
  GOOGLE_AUTH_INVALID_TOKEN = 'GOOGLE_AUTH_INVALID_TOKEN',
  GOOGLE_AUTH_SCOPE_DENIED = 'GOOGLE_AUTH_SCOPE_DENIED',
  GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',

  /** Google Drive errors */
  GOOGLE_DRIVE_PERMISSION = 'GOOGLE_DRIVE_PERMISSION',
  GOOGLE_DRIVE_QUOTA = 'GOOGLE_DRIVE_QUOTA',
  GOOGLE_DRIVE_NOT_FOUND = 'GOOGLE_DRIVE_NOT_FOUND',
  GOOGLE_DRIVE_SYNC_FAILED = 'GOOGLE_DRIVE_SYNC_FAILED',

  /** Image processing errors */
  IMAGE_FORMAT_UNSUPPORTED = 'IMAGE_FORMAT_UNSUPPORTED',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  IMAGE_CORRUPT = 'IMAGE_CORRUPT',

  /** Storage errors */
  STORAGE_FULL = 'STORAGE_FULL',
  STORAGE_READ_ERROR = 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',

  /** General errors */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom application error class
 * Extends the native Error class with additional type information
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly originalError?: Error;
  public readonly timestamp: string;

  /**
   * Create a new AppError instance
   *
   * @param message - Error message
   * @param type - Error type from ErrorType enum
   * @param originalError - Original error that caused this error (optional)
   */
  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    originalError?: Error
  ) {
    super(message);

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    this.name = 'AppError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Get a detailed error description including original error if present
   */
  getDetailedMessage(): string {
    if (this.originalError) {
      return `${this.message} (原始錯誤: ${this.originalError.message})`;
    }
    return this.message;
  }
}

/**
 * Handle OCR-related errors and return user-friendly message in Traditional Chinese
 *
 * @param error - The error that occurred during OCR processing
 * @returns User-friendly error message in Traditional Chinese
 */
export function handleOCRError(error: Error): string {
  const errorMessage = error.message.toLowerCase();

  // Check for specific OCR error patterns
  if (errorMessage.includes('worker') || errorMessage.includes('initialize')) {
    return '無法初始化文字辨識引擎，請重新整理頁面後再試。';
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return '文字辨識逾時，請嘗試使用較小或較清晰的圖片。';
  }

  if (errorMessage.includes('load') || errorMessage.includes('language')) {
    return '無法載入繁體中文語言包，請檢查網路連線後再試。';
  }

  if (errorMessage.includes('image') || errorMessage.includes('decode')) {
    return '無法讀取圖片，請確認圖片格式正確且未損壞。';
  }

  if (errorMessage.includes('memory') || errorMessage.includes('oom')) {
    return '圖片過大導致記憶體不足，請使用較小的圖片。';
  }

  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.OCR_INITIALIZATION:
        return '無法初始化文字辨識引擎，請重新整理頁面後再試。';
      case ErrorType.OCR_RECOGNITION:
        return '文字辨識失敗，請確認圖片清晰度並重新嘗試。';
      case ErrorType.OCR_PARSE:
        return '無法解析車票資訊，請手動輸入票號和搭乘資訊。';
      case ErrorType.OCR_TIMEOUT:
        return '文字辨識逾時，請嘗試使用較小或較清晰的圖片。';
      default:
        break;
    }
  }

  // Default OCR error message
  return '文字辨識過程發生錯誤，您可以手動輸入車票資訊。';
}

/**
 * Handle network-related errors and return user-friendly message in Traditional Chinese
 *
 * @param error - The error that occurred during network operation
 * @returns User-friendly error message in Traditional Chinese
 */
export function handleNetworkError(error: Error): string {
  const errorMessage = error.message.toLowerCase();

  // Check for offline status
  if (!navigator.onLine) {
    return '目前沒有網路連線，資料將暫存於本機，連線後會自動同步。';
  }

  // Check for specific network error patterns
  if (errorMessage.includes('offline') || errorMessage.includes('network')) {
    return '網路連線失敗，請檢查您的網路設定後再試。';
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return '網路請求逾時，請稍後再試。';
  }

  if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
    return '無法存取伺服器，請稍後再試或聯絡客服。';
  }

  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return '伺服器發生錯誤，請稍後再試。';
  }

  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return '找不到請求的資源，請稍後再試。';
  }

  if (errorMessage.includes('429') || errorMessage.includes('too many')) {
    return '請求過於頻繁，請稍等一分鐘後再試。';
  }

  if (errorMessage.includes('abort') || errorMessage.includes('cancelled')) {
    return '網路請求已取消。';
  }

  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.NETWORK_OFFLINE:
        return '目前沒有網路連線，資料將暫存於本機，連線後會自動同步。';
      case ErrorType.NETWORK_TIMEOUT:
        return '網路請求逾時，請稍後再試。';
      case ErrorType.NETWORK_SERVER_ERROR:
        return '伺服器發生錯誤，請稍後再試。';
      case ErrorType.NETWORK_REQUEST_FAILED:
        return '網路請求失敗，請檢查您的網路設定後再試。';
      default:
        break;
    }
  }

  // Default network error message
  return '網路連線發生問題，請檢查網路設定後再試。';
}

/**
 * Handle Google authentication errors and return user-friendly message in Traditional Chinese
 *
 * @param error - The error that occurred during Google authentication
 * @returns User-friendly error message in Traditional Chinese
 */
export function handleGoogleAuthError(error: Error): string {
  const errorMessage = error.message.toLowerCase();

  // Check for specific Google auth error patterns
  if (errorMessage.includes('popup') && errorMessage.includes('block')) {
    return '登入視窗被封鎖，請允許此網站的彈出視窗後再試。';
  }

  if (errorMessage.includes('popup_closed') || errorMessage.includes('user_cancelled')) {
    return '您已取消登入，如需使用雲端同步功能請重新登入。';
  }

  if (errorMessage.includes('access_denied') || errorMessage.includes('consent')) {
    return '您未授權存取 Google 雲端硬碟，無法使用雲端同步功能。';
  }

  if (errorMessage.includes('invalid_grant') || errorMessage.includes('token')) {
    return '登入憑證已過期，請重新登入。';
  }

  if (errorMessage.includes('invalid_client') || errorMessage.includes('client_id')) {
    return '應用程式設定錯誤，請聯絡客服。';
  }

  if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
    return '權限不足，請重新登入並授權所有必要權限。';
  }

  if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
    return '目前登入人數過多，請稍後再試。';
  }

  if (errorMessage.includes('script') || errorMessage.includes('load')) {
    return '無法載入 Google 登入服務，請檢查網路連線或稍後再試。';
  }

  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.GOOGLE_AUTH_CANCELLED:
        return '您已取消登入，如需使用雲端同步功能請重新登入。';
      case ErrorType.GOOGLE_AUTH_POPUP_BLOCKED:
        return '登入視窗被封鎖，請允許此網站的彈出視窗後再試。';
      case ErrorType.GOOGLE_AUTH_INVALID_TOKEN:
        return '登入憑證已過期，請重新登入。';
      case ErrorType.GOOGLE_AUTH_SCOPE_DENIED:
        return '您未授權存取 Google 雲端硬碟，無法使用雲端同步功能。';
      case ErrorType.GOOGLE_AUTH_FAILED:
        return 'Google 登入失敗，請稍後再試。';
      case ErrorType.GOOGLE_DRIVE_PERMISSION:
        return '沒有權限存取 Google 雲端硬碟，請重新登入並授權。';
      case ErrorType.GOOGLE_DRIVE_QUOTA:
        return 'Google 雲端硬碟空間不足，請清理空間後再試。';
      case ErrorType.GOOGLE_DRIVE_NOT_FOUND:
        return '找不到雲端資料，系統將建立新的儲存空間。';
      case ErrorType.GOOGLE_DRIVE_SYNC_FAILED:
        return '雲端同步失敗，資料已儲存在本機，稍後會自動重試。';
      default:
        break;
    }
  }

  // Default Google auth error message
  return 'Google 登入過程發生錯誤，請稍後再試或使用本機儲存功能。';
}

/**
 * Create an AppError from any error with appropriate type detection
 *
 * @param error - The original error
 * @param defaultType - Default error type if cannot be determined
 * @returns AppError instance
 */
export function createAppError(
  error: unknown,
  defaultType: ErrorType = ErrorType.UNKNOWN
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, defaultType, error);
  }

  if (typeof error === 'string') {
    return new AppError(error, defaultType);
  }

  return new AppError('發生未知錯誤', defaultType);
}

/**
 * Get a general user-friendly error message based on error type
 *
 * @param error - The error to handle
 * @returns User-friendly error message in Traditional Chinese
 */
export function getErrorMessage(error: Error): string {
  if (error instanceof AppError) {
    // Route to specific handler based on error type category
    if (error.type.startsWith('OCR_')) {
      return handleOCRError(error);
    }
    if (error.type.startsWith('NETWORK_')) {
      return handleNetworkError(error);
    }
    if (error.type.startsWith('GOOGLE_')) {
      return handleGoogleAuthError(error);
    }
    if (error.type.startsWith('IMAGE_')) {
      switch (error.type) {
        case ErrorType.IMAGE_FORMAT_UNSUPPORTED:
          return '不支援此圖片格式，請使用 JPG、PNG 或 HEIC 格式。';
        case ErrorType.IMAGE_TOO_LARGE:
          return '圖片檔案過大，請使用較小的圖片。';
        case ErrorType.IMAGE_CORRUPT:
          return '圖片檔案已損壞，請選擇其他圖片。';
      }
    }
    if (error.type.startsWith('STORAGE_')) {
      switch (error.type) {
        case ErrorType.STORAGE_FULL:
          return '本機儲存空間已滿，請清理瀏覽器資料後再試。';
        case ErrorType.STORAGE_READ_ERROR:
          return '無法讀取本機資料，請重新整理頁面。';
        case ErrorType.STORAGE_WRITE_ERROR:
          return '無法儲存資料，請檢查瀏覽器設定。';
      }
    }
  }

  // Default message
  return '發生未預期的錯誤，請重新整理頁面後再試。';
}
