# Testing Guide for syss.la

This document describes the testing setup and how to run tests for the syss.la project.

## Overview

The project uses a comprehensive testing strategy:

- **Unit Tests**: Jest + React Native Testing Library
- **E2E Tests (Native)**: Detox for iOS and Android
- **E2E Tests (Web)**: Playwright for web platform

## Unit Testing

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Writing Unit Tests

Unit tests are located alongside the code they test in `__tests__` directories:

- `hooks/__tests__/` - Tests for React hooks
- `services/__tests__/` - Tests for service layer
- `components/__tests__/` - Tests for React components

Example test structure:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../use-auth';

describe('useAuth', () => {
  it('should handle login', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('token');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Coverage Thresholds

The project maintains the following coverage thresholds:

- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

## E2E Testing - Native (Detox)

### Prerequisites

#### iOS
- Xcode installed
- iOS Simulator
- Run: `xcode-select --install`

#### Android
- Android Studio installed
- Android Emulator configured
- AVD named `Pixel_7_API_34` (or update `.detoxrc.js`)

### Setup

1. Build the app for testing:

```bash
# iOS
npm run build:e2e:ios

# Android
npm run build:e2e:android
```

2. Ensure simulator/emulator is running

### Running E2E Tests

```bash
# iOS
npm run test:e2e:ios

# Android
npm run test:e2e:android
```

### Writing Detox Tests

E2E tests are located in the `e2e/` directory with `.e2e.ts` extension.

Example test:

```typescript
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Feature', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should do something', async () => {
    await detoxExpect(element(by.id('my-element'))).toBeVisible();
    await element(by.id('button')).tap();
  });
});
```

### Test IDs

Add `testID` props to components for Detox to find them:

```tsx
<Button testID="login-button" onPress={handleLogin}>
  Login
</Button>
```

## E2E Testing - Web (Playwright)

### Running Web E2E Tests

```bash
# Run all web tests
npm run test:e2e:web

# Run with UI mode (recommended for development)
npm run test:e2e:web:ui

# Run specific browser
npx playwright test --project=chromium
```

### Writing Playwright Tests

Web E2E tests are located in `e2e/web/` directory with `.spec.ts` extension.

Example test:

```typescript
import { test, expect } from '@playwright/test';

test('should login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: /token/i }).fill('token');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page.getByText('Todos')).toBeVisible();
});
```

### Playwright Features

- **Auto-waiting**: Automatically waits for elements to be ready
- **Screenshots**: Captures screenshots on failure
- **Trace viewer**: Records test execution for debugging
- **Multiple browsers**: Tests on Chromium, Firefox, and WebKit

## Test Organization

```
syss.la/
├── hooks/
│   ├── __tests__/          # Unit tests for hooks
│   │   └── use-auth.test.ts
│   └── use-auth.ts
├── services/
│   ├── github/
│   │   ├── __tests__/      # Unit tests for services
│   │   │   └── auth.test.ts
│   │   └── auth.ts
├── e2e/
│   ├── auth.e2e.ts         # Detox tests for native
│   ├── todos.e2e.ts
│   ├── jest.config.js      # Detox Jest config
│   └── web/                # Playwright tests for web
│       ├── auth.spec.ts
│       └── todos.spec.ts
├── jest.config.js          # Unit test config
├── jest.setup.js           # Jest setup file
├── .detoxrc.js             # Detox configuration
└── playwright.config.ts    # Playwright configuration
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage

  e2e-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:web
```

## Best Practices

### Unit Tests
- Test behavior, not implementation
- Mock external dependencies
- Keep tests focused and isolated
- Use descriptive test names

### E2E Tests
- Use semantic selectors (testID, role, text)
- Avoid hardcoded waits
- Test critical user journeys
- Keep tests independent

### General
- Run tests before committing
- Maintain test coverage
- Update tests when features change
- Document complex test scenarios

## Troubleshooting

### Jest Issues

**Problem**: Module not found errors
```bash
# Clear Jest cache
npx jest --clearCache
```

### Detox Issues

**Problem**: App doesn't launch
```bash
# Rebuild the app
npm run build:e2e:ios  # or android
```

**Problem**: Element not found
- Verify `testID` is set on the component
- Check if element is actually visible
- Use `detox-cli` for debugging

### Playwright Issues

**Problem**: Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify `baseURL` is correct

**Problem**: Browser not installed
```bash
npx playwright install
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Playwright Documentation](https://playwright.dev/)
