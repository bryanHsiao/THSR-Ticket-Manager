/**
 * LLM Configuration Service
 * Fetches API keys from DRAPI endpoint on Domino server
 *
 * Flow:
 * 1. On app startup, try to fetch config from DRAPI
 * 2. If successful, store config in memory
 * 3. If failed (network error, timeout), fall back to manual input mode
 */

import type { LLMProvider, LLMConfig, DRAPIResponse } from '../types/llm';

/**
 * DRAPI endpoint URL from environment variable
 */
const DRAPI_URL = import.meta.env.VITE_DRAPI_URL || '';

/**
 * Timeout for DRAPI requests (10 seconds)
 */
const DRAPI_TIMEOUT_MS = 10000;

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
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the service by fetching config from DRAPI
   * Safe to call multiple times - will only fetch once
   */
  async initialize(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Skip if already initialized
    if (this.initialized) {
      return;
    }

    this.initPromise = this.fetchConfig();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Fetch configuration from DRAPI
   */
  private async fetchConfig(): Promise<void> {
    // Check if DRAPI URL is configured
    if (!DRAPI_URL) {
      console.log('LLMConfigService: DRAPI URL not configured, using environment variables');
      this.tryLoadFromEnv();
      this.initialized = true;
      return;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DRAPI_TIMEOUT_MS);

    try {
      console.log('LLMConfigService: Fetching config from DRAPI...');

      const response = await fetch(DRAPI_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`DRAPI returned ${response.status}: ${response.statusText}`);
      }

      const data: DRAPIResponse = await response.json();
      console.log('LLMConfigService: DRAPI response received');

      // Parse response and determine provider
      this.config = this.parseResponse(data);

      if (this.config) {
        console.log(`LLMConfigService: Configured with provider: ${this.config.provider}`);
      } else {
        console.log('LLMConfigService: No valid config in DRAPI response');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('LLMConfigService: DRAPI request timeout');
      } else {
        console.warn('LLMConfigService: Failed to fetch from DRAPI:', error);
      }

      // Try to load from environment variables as fallback
      this.tryLoadFromEnv();
    } finally {
      clearTimeout(timeoutId);
      this.initialized = true;
    }
  }

  /**
   * Parse DRAPI response into LLMConfig
   */
  private parseResponse(data: DRAPIResponse): LLMConfig | null {
    // Check for OpenAI key
    if (data.openai && data.openai.length > 0) {
      return {
        provider: 'openai',
        apiKey: data.openai,
        baseUrl: PROVIDER_BASE_URLS.openai,
      };
    }

    // Check for Zeabur key
    if (data.zeabur && data.zeabur.length > 0) {
      return {
        provider: 'zeabur',
        apiKey: data.zeabur,
        baseUrl: PROVIDER_BASE_URLS.zeabur,
      };
    }

    return null;
  }

  /**
   * Try to load config from environment variables
   */
  private tryLoadFromEnv(): void {
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (envKey && envKey.length > 0) {
      this.config = {
        provider: 'openai',
        apiKey: envKey,
        baseUrl: PROVIDER_BASE_URLS.openai,
      };
      console.log('LLMConfigService: Loaded config from environment variables');
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
}

// Export singleton instance
export const llmConfigService = new LLMConfigService();

// Export class for testing
export { LLMConfigService };
