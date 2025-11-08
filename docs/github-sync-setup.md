# GitHub Sync Setup Guide

## Overview

Syssla now supports bidirectional sync with your GitHub repository, storing your todos as JSON files that you can view and edit directly on GitHub.

## How It Works

### Storage Location

Your todos are stored in your GitHub repository at:

```
your-repo/
  └── todos/
      ├── active.json          # All active todos
      └── completed/
          └── YYYY-MM.json     # Completed todos by month
```

### Sync Strategy

- **Local First**: Todos are always stored locally in SQLite for fast access
- **Bidirectional**: Changes sync both ways (local ↔ GitHub)
- **Conflict Resolution**: Newer timestamps win (based on `updatedAt` or `createdAt`)
- **Merge Logic**: Combines local and remote todos, preferring the most recent version

## Setup Instructions

### 1. Authenticate with GitHub

1. Go to **Settings** tab
2. Create a GitHub Personal Access Token at: https://github.com/settings/tokens
3. Required scopes: `repo`, `user`, `read:org`
4. Enter your token and sign in

### 2. Configure Storage Repository

1. In **Settings** tab, scroll to "GitHub Storage" section
2. Enter:
   - **GitHub Username/Org**: Your GitHub username or organization
   - **Repository Name**: The repo where todos will be stored (e.g., `my-todos`)
   - **Branch**: Branch name (default: `main`)
3. Tap "Save Configuration"

**Note**: The repository must already exist. Create it on GitHub first if needed.

### 3. Sync Your Todos

1. Go to **Todos** tab
2. Tap "Sync" button
3. The sync will:
   - Fetch your GitHub issues (if any)
   - Pull todos from GitHub storage
   - Merge with local todos
   - Push the merged result back to GitHub

## Sync Functions

### Full Sync (Recommended)

Triggered by the "Sync" button in the Todos tab:

1. Syncs GitHub issues to local database
2. Pulls todos from GitHub storage
3. Merges local and remote todos
4. Pushes merged result back to GitHub

### Manual Functions

Available in the sync service:

- `syncTodosToGitHub()` - Push local todos to GitHub
- `syncTodosFromGitHub()` - Pull todos from GitHub
- `fullSync()` - Complete bidirectional sync

## Data Format

Todos are stored as JSON arrays in `todos/active.json`:

```json
[
  {
    "id": "personal-1699123456789",
    "source": "personal",
    "title": "My todo item",
    "description": "Optional description",
    "createdAt": "2025-11-08T12:00:00.000Z",
    "updatedAt": "2025-11-08T12:30:00.000Z",
    "status": "open",
    "labels": ["important"]
  },
  {
    "id": "github-owner-repo-123",
    "source": "github-issue",
    "title": "Fix bug in login",
    "createdAt": "2025-11-08T10:00:00.000Z",
    "github": {
      "owner": "myusername",
      "repo": "myproject",
      "issueNumber": 123,
      "state": "open",
      "url": "https://github.com/myusername/myproject/issues/123"
    }
  }
]
```

## Troubleshooting

### "Sync configuration not set"

- Go to Settings → GitHub Storage
- Enter your repository details
- Tap "Save Configuration"

### "Failed to sync"

- Ensure you're authenticated (Settings → GitHub Authentication)
- Verify the repository exists on GitHub
- Check that your token has `repo` scope
- Ensure the repository is not empty (create a README.md if needed)

### Conflicts

The sync uses timestamp-based conflict resolution:
- Compares `updatedAt` (or `createdAt` if no update timestamp)
- Keeps the version with the newer timestamp
- Both local and remote are preserved in the merge

## Best Practices

1. **Sync Regularly**: Tap "Sync" before and after making changes
2. **One Device**: For now, use one device at a time to avoid complex conflicts
3. **Backup**: Your GitHub repo serves as a backup - you can view/restore todos anytime
4. **Manual Edits**: You can edit `todos/active.json` directly on GitHub if needed

## Future Enhancements

- Automatic background sync
- Conflict resolution UI
- Completed todos archiving
- Multi-device conflict handling
- Offline queue for pending changes

---

**Note**: This is Phase 1 implementation. The sync is manual and uses a simple "newest wins" strategy for conflicts.
