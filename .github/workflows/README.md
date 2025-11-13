# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the syss.la Expo project.

## Workflows

### 1. CI (`ci.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests

Runs on every push and pull request to ensure code quality:
- **Lint:** Runs ESLint to check code style
- **Test:** Runs Jest tests with coverage reporting
- **Type Check:** Validates TypeScript types

### 2. EAS Build (`eas-build.yml`)
**Triggers:** Manual workflow dispatch

Manually triggered workflow to build the app using Expo Application Services (EAS):
- Choose platform: `all`, `ios`, or `android`
- Choose profile: `development`, `preview`, or `production`
- Builds are submitted to EAS Build service

### 3. Preview Deployment (`preview.yml`)
**Triggers:** Pull Requests (opened, synchronized, reopened)

Automatically creates preview builds for pull requests:
- Builds for all platforms using the `preview` profile
- Posts a comment on the PR with build information
- Allows testing changes before merging

### 4. Production Deployment (`production.yml`)
**Triggers:** Git tags matching `v*.*.*`, Manual workflow dispatch

Handles production releases:
- Builds production versions for iOS and Android
- Submits to App Store Connect and Google Play (if configured)
- Creates GitHub releases for version tags

### 5. Web Deployment (`web-deploy.yml`)
**Triggers:** Push to `main`, Manual workflow dispatch

Deploys the web version of the app:
- Exports static web build
- Deploys to GitHub Pages
- Accessible at your configured domain

## Setup Requirements

### Required Secrets

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

1. **`EXPO_TOKEN`** (Required for all EAS workflows)
   - Generate at: https://expo.dev/accounts/[account]/settings/access-tokens
   - Used for authentication with Expo services

2. **`CODECOV_TOKEN`** (Optional, for coverage reporting)
   - Get from: https://codecov.io/
   - Used to upload test coverage reports

### EAS Configuration

Ensure you have an `eas.json` file in your project root with build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./path-to-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### GitHub Pages Setup (for Web Deployment)

1. Go to `Settings > Pages`
2. Set source to `gh-pages` branch
3. Optionally configure a custom domain

## Usage

### Running CI
CI runs automatically on every push and pull request. No manual action needed.

### Creating Preview Builds
1. Open a pull request
2. The preview workflow will automatically trigger
3. Check the PR comments for build status and links

### Building with EAS
1. Go to `Actions` tab
2. Select `EAS Build` workflow
3. Click `Run workflow`
4. Choose platform and profile
5. Click `Run workflow` button

### Deploying to Production
**Option 1: Using Git Tags**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Option 2: Manual Trigger**
1. Go to `Actions` tab
2. Select `Production Deployment` workflow
3. Click `Run workflow`

### Deploying Web Version
Automatically deploys when pushing to `main` branch, or manually trigger from Actions tab.

## Troubleshooting

### Build Failures
- Check that `EXPO_TOKEN` is correctly set
- Verify `eas.json` configuration
- Review build logs in EAS dashboard

### Test Failures
- Run tests locally: `npm test`
- Check test coverage: `npm run test:coverage`
- Review failed test output in Actions logs

### Deployment Issues
- Ensure GitHub Pages is enabled
- Verify custom domain DNS settings
- Check deployment logs in Actions tab

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
