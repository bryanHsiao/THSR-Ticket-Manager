/**
 * Google Authentication Service
 * Task 16: Implement Google login service
 *
 * Uses @react-oauth/google for OAuth 2.0 authentication
 * Implements login, logout, authorization check, and token management
 *
 * Requirements: 3.1, NFR-Security
 * - Uses OAuth 2.0 authorization
 * - Only requests necessary permission scopes (Google Drive)
 * - Tokens are stored in localStorage for persistence
 */

import { GOOGLE_CLIENT_ID, GOOGLE_DRIVE_SCOPE, STORAGE_KEYS } from '../config/google';
import type { GoogleUser } from '../types/user';

/**
 * Interface for Google OAuth token response
 */
interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Interface for Google user info API response
 */
interface GoogleUserInfoResponse {
  email: string;
  name: string;
  picture: string;
}

/**
 * Google Authentication Service
 *
 * Provides methods for Google OAuth 2.0 authentication including:
 * - login(): Initiates Google login flow
 * - logout(): Clears authentication state
 * - isAuthorized(): Checks if user is currently authorized
 * - getAccessToken(): Retrieves the stored access token
 */
class GoogleAuthService {
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private isInitialized = false;

  /**
   * Initialize the Google OAuth token client
   * Must be called before using login()
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Wait for Google Identity Services script to load
    await this.waitForGoogleScript();

    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
    }

    this.isInitialized = true;
  }

  /**
   * Wait for the Google Identity Services script to be loaded
   */
  private waitForGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        resolve();
        return;
      }

      // Wait for script to load (max 10 seconds)
      const maxAttempts = 100;
      let attempts = 0;

      const checkScript = setInterval(() => {
        attempts++;
        if (typeof google !== 'undefined' && google.accounts?.oauth2) {
          clearInterval(checkScript);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkScript);
          reject(new Error('Google Identity Services script failed to load'));
        }
      }, 100);
    });
  }

  /**
   * Login with Google OAuth 2.0
   * Opens Google sign-in popup and requests Google Drive access
   *
   * @returns Promise<GoogleUser> - User information after successful login
   * @throws Error if login fails or is cancelled
   */
  async login(): Promise<GoogleUser> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: async (response: TokenResponse | { error?: string }) => {
          if ('error' in response && response.error) {
            reject(new Error(`Google login failed: ${response.error}`));
            return;
          }

          const tokenResponse = response as TokenResponse;

          try {
            // Store access token
            this.saveAccessToken(tokenResponse.access_token, tokenResponse.expires_in);

            // Fetch user info
            const userInfo = await this.fetchUserInfo(tokenResponse.access_token);

            // Store user info
            this.saveUserInfo(userInfo);

            resolve(userInfo);
          } catch (error) {
            reject(error);
          }
        },
        error_callback: (error: { type: string; message?: string }) => {
          reject(new Error(`Google login error: ${error.type}`));
        },
      });

      // Request access token
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Logout from Google
   * Revokes the access token and clears stored credentials
   */
  async logout(): Promise<void> {
    const accessToken = this.getAccessToken();

    if (accessToken) {
      try {
        // Revoke the token
        await this.revokeToken(accessToken);
      } catch (error) {
        // Log error but continue with logout
        console.warn('Failed to revoke token:', error);
      }
    }

    // Clear stored credentials
    this.clearStoredCredentials();
  }

  /**
   * Check if the user is currently authorized
   * Validates that a valid (non-expired) access token exists
   *
   * @returns boolean - true if user has valid authorization
   */
  isAuthorized(): boolean {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (!accessToken || !tokenExpiry) {
      return false;
    }

    // Check if token has expired
    const expiryTime = parseInt(tokenExpiry, 10);
    const now = Date.now();

    return now < expiryTime;
  }

  /**
   * Get the current access token
   * Returns null if no token exists or if token has expired
   *
   * @returns string | null - The access token or null
   */
  getAccessToken(): string | null {
    if (!this.isAuthorized()) {
      return null;
    }

    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get stored user information
   *
   * @returns GoogleUser | null - Stored user info or null
   */
  getStoredUser(): GoogleUser | null {
    const userInfoJson = localStorage.getItem(STORAGE_KEYS.USER_INFO);

    if (!userInfoJson) {
      return null;
    }

    try {
      return JSON.parse(userInfoJson) as GoogleUser;
    } catch {
      return null;
    }
  }

  /**
   * Fetch user information from Google API
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const data: GoogleUserInfoResponse = await response.json();

    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  /**
   * Save access token to localStorage
   */
  private saveAccessToken(token: string, expiresIn: number): void {
    const expiryTime = Date.now() + expiresIn * 1000;

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  }

  /**
   * Save user info to localStorage
   */
  private saveUserInfo(user: GoogleUser): void {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  }

  /**
   * Clear all stored credentials
   */
  private clearStoredCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  }

  /**
   * Revoke the access token
   */
  private async revokeToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        google.accounts.oauth2.revoke(token, () => {
          resolve();
        });
      } else {
        // Fallback: call revoke endpoint directly
        fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
          .then(() => resolve())
          .catch(reject);
      }
    });
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();

// Export class for testing purposes
export { GoogleAuthService };
