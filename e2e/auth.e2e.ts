import { device, element, by, expect as detoxExpect } from 'detox';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen when not authenticated', async () => {
    await detoxExpect(element(by.text('Welcome to syss.la'))).toBeVisible();
  });

  it('should allow user to enter personal access token', async () => {
    // Look for the token input field
    await detoxExpect(element(by.id('token-input'))).toBeVisible();
    
    // Type a test token
    await element(by.id('token-input')).typeText('ghp_test_token_123');
    
    // Tap the login button
    await element(by.id('login-button')).tap();
    
    // Should navigate to main app
    // Note: Update these selectors based on your actual app structure
    await detoxExpect(element(by.text('Todos'))).toBeVisible();
  });

  it('should persist authentication across app restarts', async () => {
    // Assuming user is logged in from previous test
    await device.reloadReactNative();
    
    // Should still be on main screen, not login
    await detoxExpect(element(by.text('Todos'))).toBeVisible();
  });

  it('should allow user to logout', async () => {
    // Navigate to settings or profile
    await element(by.id('settings-tab')).tap();
    
    // Tap logout button
    await element(by.id('logout-button')).tap();
    
    // Should return to login screen
    await detoxExpect(element(by.text('Welcome to syss.la'))).toBeVisible();
  });
});
