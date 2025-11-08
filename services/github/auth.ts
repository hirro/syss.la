import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

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

const TOKEN_KEY = 'github_token';

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

let authState: AuthState = {
  token: null,
  isAuthenticated: false,
};

// Load token from secure storage on module initialization
let isInitialized = false;

async function initializeAuth(): Promise<void> {
  if (isInitialized) return;
  
  try {
    console.log('🔐 Loading auth token from secure storage...');
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      console.log('✅ Token found in secure storage');
      authState = {
        token,
        isAuthenticated: true,
      };
    } else {
      console.log('⚠️ No token found in secure storage');
    }
  } catch (error) {
    console.error('❌ Failed to load token from secure storage:', error);
  }
  
  isInitialized = true;
}

export async function getAuthState(): Promise<AuthState> {
  await initializeAuth();
  return { ...authState };
}

export async function setAuthToken(token: string | null): Promise<void> {
  console.log('💾 Saving auth token to secure storage...');
  
  authState = {
    token,
    isAuthenticated: token !== null,
  };
  
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      console.log('✅ Token saved to secure storage');
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      console.log('✅ Token removed from secure storage');
    }
  } catch (error) {
    console.error('❌ Failed to save token to secure storage:', error);
    throw error;
  }
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
  await setAuthToken(null);
}

// For development: Allow setting a personal access token
export async function setPersonalAccessToken(token: string): Promise<void> {
  await setAuthToken(token);
}
