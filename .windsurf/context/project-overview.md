# syss.la – Project Overview

## 🧭 Vision

syss.la is a developer-focused productivity app that merges **personal task management**, **GitHub issue tracking**, **time logging**, and **wiki access** into one cohesive workspace.

The app’s goal is to simplify a developer’s daily workflow by using **GitHub as the single source of truth** — storing all data (todos, logs, and notes) in a personal repository owned by the user.

---

## 🌍 Key Concepts

- **Privacy-first:** All user data is stored in the user’s GitHub account, not syss.la’s servers.
- **Cross-platform:** Built with **Expo** (React Native), works on iOS, Android, and Web.
- **Offline-aware:** Local SQLite database for caching and search.
- **Extensible:** Future support for additional integrations and plugins.

---

## 🧱 Architecture

| Layer | Technology | Purpose |
|-------|-------------|----------|
| UI | React Native + TypeScript | Unified codebase for mobile/web |
| Data | GitHub REST API + local SQLite | Storage and sync |
| Auth | GitHub OAuth (PKCE) | Secure authentication |
| Schema | JSON-based (docs/storage-schema.json) | Defines persistent data structure |
| Backend | None | Client communicates directly with GitHub |

### Data flow
1. User authenticates via GitHub OAuth.  
2. App syncs todos, time entries, and wiki files to local DB.  
3. Changes (adds/edits/deletes) are pushed to GitHub when online.  
4. Local cache enables search and quick access.  

---

## 📁 Repository Structure

```
syss.la/
 ├─ app/                     # Expo app source (TypeScript)
 ├─ docs/                    # Schemas, documentation
 │   └─ storage-schema.json
 ├─ .windsurf/               # AI guidance and rules
 │   ├─ rules/
 │   │   └─ coding-style.md
 │   └─ context/
 │       └─ project-overview.md
 ├─ LICENSE.md
 ├─ COMMERCIAL_LICENSE.txt
 ├─ README.md
 └─ package.json
```

---

## ⚙️ Data Storage in GitHub

Each user’s GitHub repo acts as their own “backend”:

```
/todos/
  active.json
  completed/YYYY-MM.json
/time/
  customers.json
  projects.json
  entries/YYYY-MM.json
/wiki/
  *.md
/meta/
  schema-version.json
```

Data is structured, versioned, and readable directly on GitHub.

---

## 🔒 Licensing

syss.la is **dual-licensed**:

- **AGPL-3.0** for open-source and personal use.  
- **Commercial License** for closed-source redistribution.

SPDX identifier:
```
AGPL-3.0-or-later OR LicenseRef-syss.la-Commercial
```

---

## 💡 Branding

- **Name:** syss.la  
- **Domain:** syss.la  
- **Meaning:** “To occupy oneself with something” (Swedish)  
- **Aesthetic:** Nordic minimalism; simple, calm, and developer-centric.  

---

## 👤 Maintainer

- **Author:** Jim Arnell  
- **GitHub:** [@hirro](https://github.com/hirro)  
- **Contact:** contact@syss.la  

---

This document defines the context for syss.la to guide AI-assisted development tools (e.g., Windsurf AI).  
It provides the background, structure, and goals necessary to maintain project alignment across contributors and automated systems.
