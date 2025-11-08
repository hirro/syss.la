import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID'; // TODO: Replace with actual client ID
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'syssla',
  path: 'auth/callback',
});

const discovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

let authState: AuthState = {
  token: null,
  isAuthenticated: false,
};

export function getAuthState(): AuthState {
  return { ...authState };
}

export function setAuthToken(token: string | null): void {
  authState = {
    token,
    isAuthenticated: token !== null,
  };
}

export async function signInWithGitHub(): Promise<string | null> {
  try {
    const codeVerifier = Crypto.randomUUID();

    const authRequest = new AuthSession.AuthRequest({
      clientId: GITHUB_CLIENT_ID,
      scopes: ['repo', 'user', 'read:org'],
      redirectUri: REDIRECT_URI,
      usePKCE: true,
      codeChallenge: codeVerifier,
    });

    const result = await authRequest.promptAsync(discovery);

    if (result.type === 'success') {
      // Exchange code for token
      // Note: In production, this should be done through a backend service
      // to keep client secret secure. For now, we'll use device flow or
      // personal access token approach.
      
      // TODO: Implement token exchange via backend
      console.warn('Token exchange not implemented. Use personal access token for now.');
      
      return null;
    }

    return null;
  } catch (error) {
    console.error('GitHub auth error:', error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  setAuthToken(null);
}

// For development: Allow setting a personal access token
export function setPersonalAccessToken(token: string): void {
  setAuthToken(token);
}
