/**
 * OpenAI API configuration
 * For GPT-4 Vision OCR functionality
 *
 * Supports multiple providers:
 * - OpenAI (direct)
 * - Zeabur (OpenAI-compatible proxy)
 *
 * Configuration priority:
 * 1. DRAPI endpoint (fetched at runtime)
 * 2. Environment variables (VITE_OPENAI_API_KEY)
 */

import { llmConfigService } from '../services/llmConfigService';

/**
 * Get OpenAI API Key
 * Dynamically fetched from llmConfigService
 */
export function getOpenAIApiKey(): string {
  return llmConfigService.getApiKey();
}

/**
 * Get OpenAI API base URL
 * Returns the appropriate base URL for the configured provider
 */
export function getOpenAIApiBase(): string {
  return llmConfigService.getBaseUrl();
}

/**
 * Check if OpenAI API is properly configured
 * @returns true if API key is available
 */
export function isOpenAIConfigured(): boolean {
  return llmConfigService.isConfigured();
}

/**
 * Legacy exports for backward compatibility
 * These are now dynamic getters
 */
export const OPENAI_API_KEY = '';  // Use getOpenAIApiKey() instead
export const OPENAI_API_BASE = 'https://api.openai.com/v1';  // Use getOpenAIApiBase() instead
