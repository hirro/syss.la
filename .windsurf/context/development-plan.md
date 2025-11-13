# syss.la Development Plan

## 🎯 Goal
Create a cross-platform productivity app for developers that combines:
- Personal todos
- GitHub issue integration
- Time tracking
- Personal wiki access

All data is stored in the user’s **own GitHub repository** — private, versioned, and portable.

---

## 🧱 Phase 1 – Core Foundation

### Objectives
- Set up Expo project structure
- Implement GitHub authentication (Personal Access Token)
- Create local SQLite storage
- Sync basic todos (personal + GitHub issues)
- Render lists and detail views

### Authentication Strategy
- **Personal Access Token (PAT)** authentication
- **Rationale:** Fine-grained permission control, no backend required, aligns with privacy-first architecture
- Users maintain full control over token scopes and lifecycle
- Required scopes: `repo` (for storage and issues)

### Deliverables
- `app/` folder with base navigation and screens
- GitHub API client with PAT authentication
- Local DB setup (SQLite)
- Active todo list + GitHub issue view
- Login wizard with token setup instructions
- LICENSE, README, schema, and coding style in repo

---

## 🧭 Phase 2 – Time Tracking

### Objectives
- Add customer and project management
- Implement timers (start/stop, pause, resume)
- Store time entries in GitHub repo
- Display summaries (daily, monthly)

### Deliverables
- Time tracking UI + state management
- JSON persistence for time entries
- Summary screen and filters

---

## 🧩 Phase 3 – Wiki Viewer (Poor Man's Evernote)

### Objectives
- Read markdown entries from `/wiki` folder in GitHub repo
- Add full-text search across all entries
- Support Markdown rendering
- Enable creating, editing, and deleting wiki entries
- Sync wiki entries to/from GitHub

### Deliverables
- New Wiki tab in navigation
- Wiki list screen with search
- Wiki detail screen with markdown rendering
- Wiki editor for create/edit
- SQLite storage with FTS5 for search
- GitHub sync service for wiki entries (`/wiki/*.md`)
- Offline support with local caching

---

## 🌐 Phase 4 – UX Polish & Sync Refinement

### Objectives
- Improve sync logic (detect remote changes)
- Add manual sync and refresh controls
- Polish UI styling and theming
- Implement settings and preferences

### Deliverables
- Offline-aware sync
- Sync status indicators
- Configurable retention for completed todos

---

## 💼 Phase 5 – Packaging & Distribution

### Objectives
- Publish builds for iOS, Android, and Web
- Register domain **syss.la** for landing and docs
- Add App Store and Play Store metadata
- Prepare GitHub Pages documentation

### Deliverables
- Expo EAS build configs
- Landing page on syss.la
- Published open-source release (v1.0.0)

---

## 🧪 Phase 0 – Testing Infrastructure

### Objectives
- Establish comprehensive testing strategy
- Set up unit testing framework
- Configure E2E testing for native and web platforms
- Create example tests and documentation

### Deliverables
- ✅ Jest + React Native Testing Library for unit tests
- ✅ Detox configuration for iOS/Android E2E tests
- ✅ Playwright configuration for web E2E tests
- ✅ Example unit tests (hooks, services)
- ✅ Example E2E tests (auth, todos)
- ✅ Testing documentation (`docs/TESTING.md`)
- ✅ Test scripts in `package.json`
- ✅ ESLint configuration for test files

### Test Coverage Goals
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

---

## 🧠 Future Enhancements

- Offline write queue (delayed sync)
- VS Code extension for integration
- Self-hosted sync backend (optional)
- Multi-account support

---

## 📍 Milestone Summary

| Phase | Goal | Status |
|-------|------|--------|
| 0 | Testing infrastructure | ✅ Complete |
| 1 | Core foundation | ✅ Complete |
| 2 | Time tracking | ✅ Complete |
| 3 | Wiki viewer (Poor Man's Evernote) | ⏳ Pending |
| 4 | UX polish & sync | ⏳ Pending |
| 5 | Release & docs | ⏳ Pending |

---

**Maintainer:** [Jim Arnell](https://github.com/hirro)  
**Project:** [syss.la](https://github.com/hirro/syss.la)  
**License:** AGPL-3.0 or syss.la Commercial
