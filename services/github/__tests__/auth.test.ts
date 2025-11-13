import * as SecureStore from 'expo-secure-store';
import { setAuthToken, setPersonalAccessToken, signOut } from '../auth';

// Mock expo-secure-store
jest.mock('expo-secure-store');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setAuthToken', () => {
    it('should save token to secure storage', async () => {
      const mockToken = 'ghp_test123';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await setAuthToken(mockToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('github_token', mockToken);
    });

    it('should remove token from secure storage when null', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await setAuthToken(null);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('github_token');
    });

    it('should throw error if storage fails', async () => {
      const mockError = new Error('Storage error');
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(mockError);

      await expect(setAuthToken('test-token')).rejects.toThrow('Storage error');
    });
  });

  describe('setPersonalAccessToken', () => {
    it('should set token using setAuthToken', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await setPersonalAccessToken('ghp_personal_token');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('github_token', 'ghp_personal_token');
    });
  });

  describe('signOut', () => {
    it('should clear token', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await signOut();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('github_token');
    });
  });
});
