# Security Policy

## Supported Version

The `main` branch is the supported version.

## Reporting A Vulnerability

Please report security concerns privately through GitHub's security advisory flow when
available. If that is not available, open a minimal issue that says a private security
report is needed without posting sensitive details.

## Scope

This is a static browser game. Security concerns usually fall into these areas:

- Unsafe links or injected markup.
- Sensitive material accidentally committed to the repo.
- Browser storage behavior that could expose private data.
- Supply-chain risk from proposed dependencies.

## Project Rules

- Do not commit credentials or private recovery material.
- Do not add runtime dependencies without a strong reason.
- Do not store sensitive user data in `localStorage`.
- Keep the game safe to run as static files.

## Content Security Policy Note

Because GitHub Pages does not support custom HTTP response headers, GlidieBirdie delivers its Content Security Policy via `<meta http-equiv="Content-Security-Policy">` in `index.html`. Per the W3C CSP specification, the `frame-ancestors` directive is ignored inside `<meta>` tags and can only be enforced via an HTTP response header on hosts that support custom headers (e.g., Cloudflare Pages, Netlify, or a reverse proxy). Since GlidieBirdie has no accounts, cookies, or authenticated state, clickjacking carries no credential or session risk.
