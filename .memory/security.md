# Security

Rules that must NEVER be broken. Always read this file before any code change.

## Absolute prohibitions

1. **Never store credentials in any project file.** This includes `.gitignore`, `.env`, comments, strings, or any other file.
2. **Never commit API keys, tokens, passwords, or recovery codes.**
3. **Never hardcode secrets in JavaScript.** Browser code is visible to anyone who opens DevTools.
4. **Never add `localStorage` keys that store sensitive data.** It is unencrypted and accessible to any script on the domain.

## What to do if you find secrets

1. Stop immediately. Do not commit.
2. Remove the secret from the file.
3. Rotate the credential at the service provider.
4. Check git history with `git log -p --all -S 'SECRET_VALUE'` to see if it was ever committed.
5. If committed, follow the provider's leak response guide (revoke, rotate, audit).

## Safe patterns

- Use environment variables for server-side secrets.
- Use a password manager for personal credentials.
- Use `.env.example` to show required variables without values.
- Use `process.env.VAR_NAME` — never inline the value.

## This project's history

This repository previously contained live credentials for 8+ services inside `.gitignore`. The file has been replaced with standard ignore patterns. All exposed credentials should be considered compromised and rotated.

## Approved `.gitignore` content only

```text
# Operating system noise
.DS_Store
Thumbs.db
Desktop.ini

# Local editor state
.vscode/*
!.vscode/extensions.json
!.vscode/launch.json
!.vscode/settings.json
.idea/
*.code-workspace

# Dependency and build output
node_modules/
dist/
build/
coverage/
.parcel-cache/
.vite/

# Logs and runtime dumps
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment and secret material
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
secrets/
credentials/
recovery-codes/
```

Nothing else belongs in `.gitignore`.

## Service worker scope

The service worker may cache only same-origin static app-shell files. Do not add analytics, push notifications, background sync, remote scripts, or credential-bearing requests.
