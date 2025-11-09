# syss.la

> **Tasks, notes & time for developers**  
> A personal productivity app that integrates your GitHub issues, todos, wiki, and time tracking — all synced through your own GitHub account.

---

## 🌟 Overview

**syss.la** helps developers manage work the way they already do — in GitHub.  
It combines personal todos, issue tracking, and time logging into a single app that works across **iOS, Android, and Web** (built with Expo).

### Key Features

- ✅ **Personal Todos** — local + GitHub-synced tasks  
- 🐙 **GitHub Integration** — view and manage issues assigned to you  
- 🕓 **Time Tracking** — simple start/stop timers with per-project summaries  
- 🗂️ **Wiki Viewer** — read and search your personal GitHub wiki  
- ☁️ **Storage** — all data stored in your **own GitHub repo**, readable as JSON  
- 🔍 **Local Indexing** — fast search and offline read access  

---

## 🧩 Tech Stack

| Area | Tech |
|------|------|
| App | [Expo](https://expo.dev/) (React Native) + TypeScript |
| Auth | GitHub OAuth (PKCE flow) |
| Data | GitHub REST API + local SQLite |
| Backend | None required — all synced directly with your GitHub repo |
| License | Dual (AGPL-3.0 or Commercial) |

---

## 🚀 Getting Started

### Prerequisites
- Node ≥ 22 (use `nvm use 22`)
- Expo CLI  
- GitHub account with personal access token

### Setup
```bash
git clone https://github.com/hirro/syss.la.git
cd syss.la
nvm use 22
npm install
npx expo start
```

Then open in the Expo app on your phone or web browser.

### Authentication
1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens
2. Required scopes: `repo`, `user`, `read:org`
3. Open the app and go to **Settings** tab
4. Enter your token to authenticate
5. Go to **Todos** tab and tap "Sync GitHub" to fetch your issues

**Note:** For production use, implement proper OAuth flow. Current implementation uses personal access tokens for development.

---

## 🗄️ Data Storage Format

syss.la stores your todos, time entries, and other data in your **personal GitHub repo**, for example:

```
/todos/active.json
/todos/completed/2025-01.json
/time/customers.json
/time/projects.json
/time/entries/2025-01.json
/wiki/...
```

Files are small, human-readable JSON, easy to browse or version in GitHub.

---

## 🔒 License

syss.la is **dual-licensed** under:

- [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) for open use  
- A [commercial license](./COMMERCIAL_LICENSE.txt) for closed-source or embedded applications  

```
SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-syss.la-Commercial
```

© 2025 [Jim Arnell](https://github.com/hirro)

For commercial inquiries: **contact@syss.la**

---

## 🤝 Contributing

Contributions are welcome under the AGPL-3.0 license.  
Please open issues or pull requests via [GitHub](https://github.com/hirro/syss.la).

Before submitting PRs:
- Follow the established code style and TypeScript conventions.  
- Include tests where practical.  
- Do not commit secrets or credentials.

---

## 🧭 Roadmap

- [ ] Offline write-queue support  
- [ ] Editable GitHub wiki pages  
- [ ] Optional self-hosted sync backend  
- [ ] Companion VS Code extension  

---

## 🩵 About

**syss.la** means *“to occupy oneself with something”* in Swedish —  
the perfect word for a developer’s personal workspace.

---

**syss.la** — *do things your way.*
