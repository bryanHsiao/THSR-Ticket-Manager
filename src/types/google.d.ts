/**
 * Type declarations for Google Identity Services
 * https://developers.google.com/identity/oauth2/web/reference/js-reference
 */

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(overrideConfig?: { prompt?: string }): void;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse | ErrorResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }

  interface ErrorResponse {
    error: string;
    error_description?: string;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(token: string, callback: () => void): void;
}

declare namespace google.accounts.id {
  interface GsiButtonConfiguration {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: string;
    locale?: string;
  }

  function initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;

  function renderButton(
    parent: HTMLElement,
    options: GsiButtonConfiguration
  ): void;

  function prompt(): void;
}
