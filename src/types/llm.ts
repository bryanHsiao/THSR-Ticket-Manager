/**
 * LLM Configuration Types
 * Supports multiple LLM providers (OpenAI, Zeabur, etc.)
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'zeabur';

/**
 * LLM configuration
 */
export interface LLMConfig {
  /** Provider type */
  provider: LLMProvider;
  /** API key */
  apiKey: string;
  /** API base URL */
  baseUrl: string;
}

/**
 * DRAPI response format
 * Example: { "openai": "sk-xxx" } or { "zeabur": "xxx" }
 */
export type DRAPIResponse = {
  [key in LLMProvider]?: string;
};
