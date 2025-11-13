# Testing Quick Start

## 🚀 Quick Commands

### Unit Tests
```bash
npm test                    # Run all unit tests
npm run test:watch          # Run in watch mode
npm run test:coverage       # Run with coverage report
```

### E2E Tests - Web (Playwright)
```bash
npm run test:e2e:web        # Run all web E2E tests
npm run test:e2e:web:ui     # Run with UI mode (recommended)
```

### E2E Tests - Native (Detox)
```bash
# iOS
npm run build:e2e:ios       # Build app for testing (first time)
npm run test:e2e:ios        # Run iOS E2E tests

# Android
npm run build:e2e:android   # Build app for testing (first time)
npm run test:e2e:android    # Run Android E2E tests
```

## 📁 Test Structure

```
syss.la/
├── hooks/__tests__/              # Unit tests for hooks
├── services/github/__tests__/    # Unit tests for services
├── e2e/
│   ├── auth.e2e.ts              # Detox tests (native)
│   ├── todos.e2e.ts
│   └── web/
│       ├── auth.spec.ts         # Playwright tests (web)
│       └── todos.spec.ts
```

## 📚 Documentation

See [docs/TESTING.md](docs/TESTING.md) for comprehensive testing guide.

## ✅ What's Configured

- **Jest** - Unit testing framework
- **React Native Testing Library** - Component testing
- **Detox** - Native E2E testing (iOS/Android)
- **Playwright** - Web E2E testing
- **Coverage reporting** - 70% threshold

## 🎯 Next Steps

1. Add `testID` props to your components for E2E tests
2. Write unit tests for new hooks and services
3. Add E2E tests for critical user flows
4. Run tests before committing code

## 🐛 Troubleshooting

**Jest cache issues:**
```bash
npx jest --clearCache
```

**Detox build issues:**
```bash
# Rebuild the app
npm run build:e2e:ios  # or android
```

**Playwright browser issues:**
```bash
npx playwright install
```
