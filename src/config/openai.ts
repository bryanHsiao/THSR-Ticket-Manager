/**
 * OpenAI API configuration
 * For GPT-4 Vision OCR functionality
 */

/**
 * OpenAI API Key from environment variables
 * Set this in .env file as VITE_OPENAI_API_KEY
 */
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

/**
 * OpenAI API base URL
 */
export const OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * Check if OpenAI API is properly configured
 * @returns true if OPENAI_API_KEY is set
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(OPENAI_API_KEY && OPENAI_API_KEY.length > 0);
}
