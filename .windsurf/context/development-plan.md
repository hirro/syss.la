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
- Implement GitHub authentication (OAuth PKCE)
- Create local SQLite storage
- Sync basic todos (personal + GitHub issues)
- Render lists and detail views

### Deliverables
- `app/` folder with base navigation and screens
- GitHub API client
- Local DB setup
- Active todo list + GitHub issue view
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

## 🧩 Phase 3 – Wiki Integration

### Objectives
- Read personal GitHub wiki pages
- Add local search index
- Support Markdown rendering
- Prepare for future editing support

### Deliverables
- Wiki browser and search
- Markdown viewer
- Indexed wiki metadata in local DB

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

## 🧠 Future Enhancements

- Offline write queue (delayed sync)
- VS Code extension for integration
- Self-hosted sync backend (optional)
- Multi-account support

---

## 📍 Milestone Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Core foundation | 🔜 |
| 2 | Time tracking | ⏳ |
| 3 | Wiki integration | ⏳ |
| 4 | UX polish & sync | ⏳ |
| 5 | Release & docs | ⏳ |

---

**Maintainer:** [Jim Arnell](https://github.com/hirro)  
**Project:** [syss.la](https://github.com/hirro/syss.la)  
**License:** AGPL-3.0 or syss.la Commercial
