# Windsurf Ignore Rules

This file tells Windsurf AI which paths or files to **exclude** from indexing and analysis.
It works similarly to a `.gitignore` file but is specific to AI context ingestion.

---

## 🚫 Excluded Paths

# Build outputs
/node_modules/
/dist/
/build/
/.expo/

# Platform artifacts
/android/
/ios/
/web-build/

# IDE / editor files
/.idea/
/.vscode/
/.DS_Store

# Temporary or environment files
.env
.env.*
npm-debug.log
yarn-error.log

# Dependencies and generated code
package-lock.json
yarn.lock

# Binary / large files
*.zip
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.mp4
*.pdf

# Tests snapshots (too verbose for AI context)
**/__snapshots__/
**/*.snap

# GitHub-specific noise
.github/
CODE_OF_CONDUCT.md
CONTRIBUTING.md

# Local documentation builds
/docs/generated/
/coverage/

# AI-specific: skip large dataset or schema files
/docs/storage-schema.json

---

## ✅ Notes
- Windsurf AI still sees file *names* and structure, but ignores file **content** listed above.
- Keep this list updated if you add new large or irrelevant folders.
