# Contributing to [Your App Name]

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS only) or Android Studio
- A GitHub account for testing

### Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/your-app.git
   cd your-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your platform**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app on your device

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in [Issues](https://github.com/yourusername/your-app/issues)
- Use the bug report template
- Include steps to reproduce, expected behavior, and screenshots if applicable
- Specify the platform (iOS/Android/Web) and version

### Suggesting Features

- Check existing [Feature Requests](https://github.com/yourusername/your-app/issues?q=is%3Aissue+label%3Aenhancement)
- Open a new issue with the feature request template
- Describe the problem you're trying to solve
- Explain how your feature would work

### Submitting Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use prefixes: `feature/`, `fix/`, `docs/`, `refactor/`

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Test on multiple platforms when possible

3. **Commit your changes**
   ```bash
   git commit -m "feat: add description of your changes"
   ```
   Use conventional commit messages:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `style:` formatting, missing semicolons, etc.
   - `refactor:` code restructuring
   - `test:` adding tests
   - `chore:` maintenance tasks

4. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a PR on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/videos for UI changes
   - Notes on testing performed

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Use functional components with hooks
- Follow React Native best practices
- Keep components small and focused
- Use meaningful variable and function names

### File Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── hooks/          # Custom hooks
├── utils/          # Helper functions
├── types/          # TypeScript types
└── services/       # API and GitHub integration
```

### Platform-Specific Code

When writing platform-specific code, use:

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web-specific code
} else {
  // Native code
}
```

Or create platform-specific files:
- `component.tsx` - shared code
- `component.web.tsx` - web-specific
- `component.native.tsx` - native-specific

### Testing

- Test your changes on iOS, Android, and Web when possible
- Verify offline functionality
- Check GitHub API integration
- Test with different screen sizes

## Questions?

- Open a [Discussion](https://github.com/yourusername/your-app/discussions)
- Join our community chat (if applicable)
- Tag maintainers in your PR for review

## Code of Conduct

Be respectful, inclusive, and considerate. We're all here to build something great together.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

Thank you for contributing! 🎉
