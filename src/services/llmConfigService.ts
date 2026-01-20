/**
 * LLM Configuration Service
 * Manages API keys stored in localStorage
 *
 * Security:
 * - API keys are stored only in the user's browser (localStorage)
 * - Keys are never sent to any server except the LLM API itself
 * - Users have full control over their keys
 */

import type { LLMProvider, LLMConfig } from '../types/llm';

/**
 * localStorage key for storing API key
 */
const STORAGE_KEY = 'thsr_llm_api_key';

/**
 * Base URLs for different providers
 */
const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
  openai: 'https://api.openai.com/v1',
  zeabur: import.meta.env.VITE_ZEABUR_API_BASE || 'https://api.zeabur.com/v1',
};

/**
 * LLM Configuration Service
 */
class LLMConfigService {
  private config: LLMConfig | null = null;
  private initialized = false;

  /**
   * Initialize the service by loading config from localStorage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.loadFromStorage();
    this.initialized = true;
  }

  /**
   * Load API key from localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedKey = localStorage.getItem(STORAGE_KEY);
      if (storedKey && storedKey.length > 0) {
        this.config = {
          provider: 'openai',
          apiKey: storedKey,
          baseUrl: PROVIDER_BASE_URLS.openai,
        };
        console.log('LLMConfigService: Loaded API key from localStorage');
      } else {
        this.config = null;
        console.log('LLMConfigService: No API key found in localStorage');
      }
    } catch (error) {
      console.warn('LLMConfigService: Failed to load from localStorage:', error);
      this.config = null;
    }
  }

  /**
   * Save API key to localStorage
   */
  setApiKey(apiKey: string, provider: LLMProvider = 'openai'): void {
    try {
      localStorage.setItem(STORAGE_KEY, apiKey);
      this.config = {
        provider,
        apiKey,
        baseUrl: PROVIDER_BASE_URLS[provider],
      };
      console.log('LLMConfigService: API key saved to localStorage');
    } catch (error) {
      console.error('LLMConfigService: Failed to save to localStorage:', error);
      throw new Error('無法儲存 API Key');
    }
  }

  /**
   * Clear API key from localStorage
   */
  clearApiKey(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.config = null;
      console.log('LLMConfigService: API key cleared from localStorage');
    } catch (error) {
      console.warn('LLMConfigService: Failed to clear localStorage:', error);
    }
  }

  /**
   * Get the current LLM configuration
   */
  getConfig(): LLMConfig | null {
    return this.config;
  }

  /**
   * Check if LLM is configured and available
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  /**
   * Get API key
   */
  getApiKey(): string {
    return this.config?.apiKey || '';
  }

  /**
   * Get API base URL
   */
  getBaseUrl(): string {
    return this.config?.baseUrl || PROVIDER_BASE_URLS.openai;
  }

  /**
   * Get provider type
   */
  getProvider(): LLMProvider | null {
    return this.config?.provider || null;
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get masked API key for display (shows first 7 and last 4 characters)
   */
  getMaskedApiKey(): string {
    const key = this.config?.apiKey;
    if (!key || key.length < 15) return '';
    return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
  }
}

// Export singleton instance
export const llmConfigService = new LLMConfigService();

// Export class for testing
export { LLMConfigService };
