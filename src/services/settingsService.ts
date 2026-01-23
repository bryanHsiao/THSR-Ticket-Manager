/**
 * Settings Service
 * Manages application settings stored in localStorage
 *
 * Features:
 * - GroupingMode management for ticket list display
 * - Subscribe pattern for reactive settings updates
 */

/**
 * Grouping mode for ticket list display
 * - flat: 平面列表（預設）
 * - collapsed: 月份分組（可展開/收合）
 * - tabs: 月份頁籤
 * - tree: 年月樹狀結構
 */
export type GroupingMode = 'flat' | 'collapsed' | 'tabs' | 'tree';

/**
 * Settings interface
 */
export interface AppSettings {
  groupingMode: GroupingMode;
}

/**
 * Settings change listener type
 */
export type SettingsListener = (settings: AppSettings) => void;

/**
 * localStorage key for storing settings
 */
const STORAGE_KEY = 'thsr_app_settings';

/**
 * Default settings
 */
const DEFAULT_SETTINGS: AppSettings = {
  groupingMode: 'flat',
};

/**
 * Settings Service
 */
class SettingsService {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private initialized = false;
  private listeners: Set<SettingsListener> = new Set();

  /**
   * Initialize the service by loading settings from localStorage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.loadFromStorage();
    this.initialized = true;
  }

  /**
   * Load settings from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
        console.log('SettingsService: Loaded settings from localStorage', this.settings);
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
        console.log('SettingsService: Using default settings');
      }
    } catch (error) {
      console.warn('SettingsService: Failed to load from localStorage:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      console.log('SettingsService: Settings saved to localStorage');
    } catch (error) {
      console.error('SettingsService: Failed to save to localStorage:', error);
      throw new Error('無法儲存設定');
    }
  }

  /**
   * Notify all listeners of settings change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener({ ...this.settings });
      } catch (error) {
        console.error('SettingsService: Listener error:', error);
      }
    });
  }

  /**
   * Get the current grouping mode
   */
  getGroupingMode(): GroupingMode {
    return this.settings.groupingMode;
  }

  /**
   * Set the grouping mode and save to storage
   */
  setGroupingMode(mode: GroupingMode): void {
    if (this.settings.groupingMode === mode) {
      return;
    }

    this.settings.groupingMode = mode;
    this.saveToStorage();
    this.notifyListeners();
    console.log('SettingsService: Grouping mode set to', mode);
  }

  /**
   * Get all settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Subscribe to settings changes
   * Returns an unsubscribe function
   */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const settingsService = new SettingsService();

// Export class for testing
export { SettingsService };
