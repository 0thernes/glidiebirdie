# Build Standard for LLMs

_Universal repo fundamentals and a verification ladder for one-person, AI-native builders_

Version 1.2.0 · 2026-11-24 · Owner: Alex Donahue (0thernes) · License: CC BY 4.0

## Contents

1. [Preamble for LLMs](#preamble-for-llms)
2. [Hard rules](#hard-rules)
3. [Finding classes](#finding-classes)
4. [Order of operations](#order-of-operations)
5. [Minimum core set](#minimum-core-set)
6. [Agent entry points](#agent-entry-points)
7. [Quick checklist](#quick-checklist)
8. [Part A: Repo Fundamentals](#part-a-repo-fundamentals)
9. [Part B: Verification Ladder](#part-b-verification-ladder-prove-it-isnt-bs)

## Preamble for LLMs

You are building for a one-person, AI-native builder. This standard tells you what every repository must contain (Part A, 45 items) and how to prove the work is real (Part B, 45 items). It applies to every language, stack and tool.

Each item has an id, a tier (core, recommended, advanced), an applies_when condition, a 'done when' check you can verify yourself, and an evidence artifact you must leave behind. If applies_when does not match the project, mark the item not applicable with a one-line reason; do not skip silently.

Speed matters more than ceremony. Nothing in this standard may gate, block or slow a commit or push. Checks inform; they never prevent. Commit and push straight to main.

Never fabricate. Every number, claim, badge and screenshot must come from a real run of the current code. If you could not verify something, say so and classify it.

## Hard rules

These override every item below. Nothing here may be weakened by a tool default.

- **R1. Nothing may gate, block or slow a commit or push.** No branch protection, no required status checks, no commit or tag signing requirements, no git hooks (pre-commit, pre-push, commit-msg), no push protection, no merge queues, and no coverage, lint, SAST (such as CodeQL) or SBOM requirement that fails or blocks anything; those tools may only report.
- **R2. Commit and push straight to main.** No pull requests and no feature branches. Fixes for failing checks are follow-up commits to main.
- **R3. CI is informational.** CI reports results on every push. A red CI run is a finding to fix, never a barrier.
- **R4. Banned tools and files.** No Dependabot or Renovate auto-PRs, no PR templates, no CodeRabbit, no Copilot review or .github/copilot-instructions.md, no FUNDING file unless the owner asks.
- **R5. One-person lean, not corporate.** Prefer one file over a framework, one command over a checklist, plain text over portals. Add process only if it directly helps the owner build or prove the work.
- **R6. Never fabricate.** Every claim, number, badge, screenshot and test result must come from a real run of the current code. Unverified means labeled unverified.
- **R7. Classify every finding.** Each finding is exactly one of: bug, error, issue, problem, concern, dilemma, conflict, gap, hole, blindspot (definitions below).
- **R8. Precedence when rules collide.** Owner's explicit instruction, then these hard rules, then this standard's items, then ecosystem conventions.

## Finding classes

Classify every finding as exactly one of these ten.

| Class | Definition | What to do | Example |
|---|---|---|---|
| bug | A defect in program logic: the code runs but does something different from its specification or intent. | Fix the code and add a regression test (B07). | A sort returns items out of order for duplicate keys. |
| error | A wrong artifact or failed execution outside program logic: an incorrect number, claim, doc, config, version, build or command. | Correct the artifact and re-verify against evidence. | README says 100x faster; the benchmark measures 20x. |
| issue | A weakness in something that exists: it works and is not wrong, but it is unclear, inconsistent, fragile or hard to maintain. | Improve it and note why in the commit or changelog. | Two docs describe the same setup step differently; a 400-line function nobody can follow. |
| problem | An external obstacle that blocks progress and is not caused by the project's own code or artifacts. | Work around it or report it with what is needed to unblock. | Expired GitHub token; network blocks a tunnel; toolchain unavailable on the runner. |
| concern | A risk that has not caused harm yet: something that could fail, mislead, cost money or create security or legal exposure later. | Record the risk, its likelihood and impact, and a mitigation or a reason to accept it. | An API key has no spending cap; a core dependency has a single maintainer. |
| dilemma | A trade-off between two or more valid options where the right choice depends on the owner's priorities. | Present the options with consequences and a recommendation; the owner decides. | Ship the native extension for speed or stay pure-scripting for portability. |
| conflict | Two requirements, sources or rules contradict each other, so satisfying one violates the other. | Resolve with the precedence rule (R8) or escalate to the owner. | A tool's default setup adds a pre-commit hook, but R1 bans hooks. |
| gap | Something required or expected is missing: a file, feature, doc or item this standard or the task calls for does not exist yet, but nothing present is wrong. | Add the missing piece and its evidence. | No SECURITY.md; the README promises a CSV export that does not exist. |
| hole | A missing check or safeguard: a path that nothing verifies or protects, so a defect could get through unnoticed. | Add the test, check or validation, then show it catches a planted fault. | No test covers the CSV export path; user input reaches a shell command unvalidated. |
| blindspot | Something outside current attention: a user, platform, failure mode or assumption nobody has examined, so what is wrong there is unknown. | Examine it on purpose (test, review or measurement) and file what you find under the other classes. | Never run on Windows; nobody checked behavior on a full disk; benchmarks use English text only. |

## Order of operations

1. Read the project's AGENTS.md first (create it if missing, using item A32), then this standard.
2. Decide which items apply: evaluate applies_when for all 90 items and list not-applicable ones with a reason.
3. Do the minimum core set (below) before anything else.
4. Then do remaining core items, then recommended, then advanced, ordered by effort (S before M before L).
5. For each item, run its 'done when' check and save its evidence artifact in the repo.
6. Commit small, meaningful commits straight to main and push after each working step. Never open a PR or feature branch.
7. Report results: items done, items not applicable (with reason), items not done, and every finding classified as exactly one of the ten finding classes.

## Minimum core set

Do these first on every project, in this order:

- A01 README with a one-line purpose
- A03 Quickstart that works from a clean clone
- A06 LICENSE
- A07 CHANGELOG
- A08 Semantic version, tags and a single version source
- A09 Automated tests that pass
- A10 Informational CI
- A12 .gitignore
- A24 No secrets, build output or huge files committed
- A31 Task runner with one-word commands
- A32 Agent entry points: AGENTS.md canonical, plus CLAUDE.md, GEMINI.md, Cursor rules, llms.txt
- B01 Reproducible build from a clean clone
- B02 Pinned toolchains and lockfiles
- B04 CLAIMS.md ledger
- B05 Falsifiable tests per claim
- B06 Negative tests
- B07 Regression test per fixed bug
- B41 Limitations and real-vs-metaphor
- B43 Replication protocol

## Agent entry points

One canonical source (AGENTS.md plus this standard); every other file only points to it, so they never drift.

| File | Read by | Convention | Source |
|---|---|---|---|
| AGENTS.md | Codex, OpenCode, Grok Build, Antigravity, Cursor, Grok Bot, Claude Code (when no CLAUDE.md), most others | Canonical. Plain Markdown, no frontmatter. Codex concatenates AGENTS.md files from the git root to the working directory and caps the total at 32 KiB by default (project_doc_max_bytes); nested files apply to their subtree. | https://agents.md ; https://learn.chatgpt.com/docs/agent-configuration/agents-md ; https://opencode.ai/docs/instructions ; https://docs.x.ai/build/features/project-rules |
| CLAUDE.md | Claude Code (also OpenCode fallback when a directory has no AGENTS.md) | Thin pointer containing the line @AGENTS.md. Claude Code expands @path imports (relative to the file, up to 4 hops). If both files exist without the import, Claude Code reads only CLAUDE.md, so the import is required. | https://code.claude.com/docs/en/memory |
| GEMINI.md | Gemini CLI; also read by Antigravity | Thin pointer containing the line @./AGENTS.md (Gemini CLI memory import). Alternative: set context.fileName to ["AGENTS.md"] in .gemini/settings.json and omit GEMINI.md. Antigravity reads both AGENTS.md and GEMINI.md as always-on rules, so GEMINI.md must stay a pointer to avoid duplicated rules. | https://geminicli.com/docs/cli/gemini-md/ ; https://antigravity.google/docs/rules/ |
| .cursor/rules/build-standard.mdc | Cursor and Grok Bot | Project rules must use the .mdc extension (plain .md there is ignored) with YAML frontmatter; alwaysApply: true loads it in every session. Cursor also reads AGENTS.md natively, so the rule only points to AGENTS.md and the full standard. | https://cursor.com/docs/rules |
| llms.txt | Retrieval by any LLM or web agent | llmstxt.org format: H1 title (required), blockquote summary, optional text, then H2 sections of `[name](url): note` links to Markdown files. | https://llmstxt.org |
| llms-full.txt | Bulk ingestion by any LLM | Not part of the llmstxt.org spec; a widely used convention (popularized by Mintlify) for one file with the full content. Here it is generated from AGENTS.md plus the full standard and must never be hand-edited. | https://www.mintlify.com/docs/ai/llmstxt |
| build-standard-prompt.md | Chat models with no repo access: GPT, Claude, Gemini, Grok | Paste-ready condensed standard (about 2 to 4k tokens): hard rules, finding classes, order of operations and all 90 item names with tier and scope. | Generated in this pack |

Not wanted:

- .github/copilot-instructions.md (owner excluded Copilot)
- .agents/rules/*.md for Antigravity (optional; Antigravity already reads AGENTS.md, so not added to avoid duplication)

## Quick checklist

| Part A: Repo Fundamentals | Part B: Verification Ladder |
|---|---|
| [ ] A01 README with a one-line purpose (core) | [ ] B01 Reproducible build from a clean clone (core) |
| [ ] A02 Badge ribbon (recommended) | [ ] B02 Pinned toolchains and lockfiles (core) |
| [ ] A03 Quickstart that works from a clean clone (core) | [ ] B03 Determinism checks (core) |
| [ ] A04 Usage examples (core) | [ ] B04 CLAIMS.md ledger (core) |
| [ ] A05 Demo media (recommended) | [ ] B05 Falsifiable tests per claim (core) |
| [ ] A06 LICENSE (core) | [ ] B06 Negative tests (core) |
| [ ] A07 CHANGELOG (core) | [ ] B07 Regression test per fixed bug (core) |
| [ ] A08 Semantic version, tags and a single version source (core) | [ ] B08 Golden and snapshot tests (recommended) |
| [ ] A09 Automated tests that pass (core) | [ ] B09 Contract and API tests (recommended) |
| [ ] A10 Informational CI (core) | [ ] B10 Property-based tests (core) |
| [ ] A11 Releases (recommended) | [ ] B11 Differential testing (recommended) |
| [ ] A12 .gitignore (core) | [ ] B12 Reference implementation as test oracle (recommended) |
| [ ] A13 .gitattributes and .editorconfig (recommended) | [ ] B13 Mutation testing (recommended) |
| [ ] A14 CONTRIBUTING guide (recommended) | [ ] B14 Metamorphic testing (advanced) |
| [ ] A15 CODE_OF_CONDUCT (recommended) | [ ] B15 Fuzzing (recommended) |
| [ ] A16 SECURITY.md (core) | [ ] B16 Sanitizers and runtime checkers (core) |
| [ ] A17 SUPPORT.md (recommended) | [ ] B17 Static analysis and linters, report-only (recommended) |
| [ ] A18 Issue templates (recommended) | [ ] B18 Strict type checking (recommended) |
| [ ] A19 About description and topics (core) | [ ] B19 Concurrency and race testing (advanced) |
| [ ] A20 docs/ folder (recommended) | [ ] B20 Numeric and floating-point stability (advanced) |
| [ ] A21 Architecture Decision Records (recommended) | [ ] B21 Failure injection (advanced) |
| [ ] A22 CITATION.cff (advanced) | [ ] B22 Formal specification and proof (advanced) |
| [ ] A23 Clean history and correct identity (core) | [ ] B23 Design model checking (advanced) |
| [ ] A24 No secrets, build output or huge files committed (core) | [ ] B24 Verified implementation language (advanced) |
| [ ] A25 Cross-platform CI (recommended) | [ ] B25 Bounded model checking of real code (advanced) |
| [ ] A26 Social preview image (recommended) | [ ] B26 Honest benchmarks (core) |
| [ ] A27 Pages demo or docs site (advanced) | [ ] B27 Performance tracking over time, report-only (advanced) |
| [ ] A28 Package manifest (recommended) | [ ] B28 Controls and multiple seeds (core) |
| [ ] A29 ROADMAP.md (recommended) | [ ] B29 Significance testing (core) |
| [ ] A30 Labels for the finding classes (recommended) | [ ] B30 Effect sizes and confidence intervals (core) |
| [ ] A31 Task runner with one-word commands (core) | [ ] B31 Multiple-comparison correction (recommended) |
| [ ] A32 Agent entry points: AGENTS.md canonical, plus CLAUDE.md, GEMINI.md, Cursor rules, llms.txt (core) | [ ] B32 Pre-registration of hypotheses (advanced) |
| [ ] A33 Environment and configuration documented (core) | [ ] B33 ML evaluation on held-out data (core) |
| [ ] A34 Observability basics: logs, errors, health (recommended) | [ ] B34 AI hallucination and regression evals (core) |
| [ ] A35 Data, migrations, backups and an offsite repo mirror (recommended) | [ ] B35 Security scanning, report-only, with optional SBOM (recommended) |
| [ ] A36 One-command deploy and rollback (recommended) | [ ] B36 Threat model (recommended) |
| [ ] A37 Performance budgets (advanced) | [ ] B37 Release hashes and checksums (core) |
| [ ] A38 Accessibility and internationalization (core) | [ ] B38 Build provenance and attestations (recommended) |
| [ ] A39 Third-party licensing and attribution (recommended) | [ ] B39 Data checksums and dataset versioning (recommended) |
| [ ] A40 AI components pinned, evaluated and budgeted (core) | [ ] B40 Audit trail (recommended) |
| [ ] A41 Deprecation and upgrade path (advanced) | [ ] B41 Limitations and real-vs-metaphor (core) |
| [ ] A42 Maintenance status (recommended) | [ ] B42 What would prove us wrong (core) |
| [ ] A43 examples/ directory (recommended) | [ ] B43 Replication protocol (core) |
| [ ] A44 FAQ and glossary (recommended) | [ ] B44 Independent replication (advanced) |
| [ ] A45 Privacy and personal-data handling (core) | [ ] B45 Peer and red-team review (recommended) |

## Part A: Repo Fundamentals

What every repository should contain, whatever the language or stack.

### A01 · README with a one-line purpose

- **Category:** Docs & Identity
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** The README is the front door for humans and LLMs. If the first line does not say what the thing is, who it is for and why it exists, every later reader guesses, and guesses drift.
- **How to do it:** Open README.md with the project name, a single sentence stating what it does and for whom, then status, quickstart, usage, results or screenshots, architecture pointer, limitations, license. Keep the top screen scannable; push depth into docs/.
- **Examples:**
  - Python: README.md rendered on PyPI via readme = 'README.md' in pyproject.toml
  - JS/TS: README.md shown on npm; keep the first paragraph under 300 characters
  - Rust: readme = 'README.md' in Cargo.toml so crates.io shows it
  - Go: README.md plus a package doc comment that pkg.go.dev renders
  - Ruby: README.md listed in the gemspec files and metadata
  - C/C++: README.md with build-from-source commands for CMake or Make
  - Java: README.md with Maven and Gradle coordinates
- **Done when:** README.md exists at the repo root; its first non-heading sentence states what the project does; it links to quickstart, usage, license and limitations; every command in it runs as written from a clean clone.
- **Evidence:** README.md

### A02 · Badge ribbon

- **Category:** Docs & Identity
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** Badges give an instant, machine-checked status summary (build, version, license, language) and signal the project is alive. They must reflect reality, never decoration.
- **How to do it:** Add one row of badges under the title: CI status, latest release, license, language or runtime version, package registry version if published. Use shields.io or the CI provider's native badge. Only add a badge backed by a real, live source.
- **Examples:**
  - Python: PyPI version and supported-Python badges from shields.io
  - JS/TS: npm version and bundle-size badges
  - Rust: crates.io and docs.rs badges
  - Go: pkg.go.dev reference and Go Report Card badges
  - Ruby: Gem version badge
  - C/C++: CI badge per OS from GitHub Actions
  - Java: Maven Central version badge
- **Done when:** Every badge URL resolves (HTTP 200) and shows a true value; no badge points at a service the repo does not use.
- **Evidence:** README.md badge row; badge URLs return 200

### A03 · Quickstart that works from a clean clone

- **Category:** Docs & Identity
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** If a stranger or a fresh LLM session cannot get from git clone to a running result in a few commands, the project is effectively unusable and unverifiable.
- **How to do it:** Write the shortest path: prerequisites with exact versions, clone, install, run, expected output. Provide it per OS where it differs. Test it in a clean container or fresh VM and paste the real expected output.
- **Examples:**
  - Python: uv sync then uv run app --help
  - JS/TS: pnpm install then pnpm dev
  - Rust: cargo run --release -- --help
  - Go: go run ./cmd/app
  - Ruby: bundle install then bundle exec bin/app
  - C/C++: cmake -B build -S . then cmake --build build
  - Java: ./gradlew run or mvn -q exec:java
- **Done when:** Running the quickstart commands verbatim in a clean environment produces the documented expected output with zero undocumented steps.
- **Evidence:** Quickstart section in README.md; a transcript or CI smoke job log

### A04 · Usage examples

- **Category:** Docs & Identity
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Examples are the spec most people and LLMs actually read. Real, runnable examples prevent misuse and double as smoke tests.
- **How to do it:** Document the main commands, flags, API calls or UI flows with copy-paste examples and their real outputs. Cover the common path, one advanced path and one failure path. Keep examples executable and test them.
- **Examples:**
  - Python: doctest-style examples run by pytest --doctest-glob='*.md'
  - JS/TS: examples verified with a markdown code-block runner in CI
  - Rust: doc examples compiled and run by cargo test
  - Go: Example functions run by go test
  - Ruby: YARD @example tags plus a spec that runs them
  - C/C++: example programs compiled by CMake in CI
  - Java: JUnit tests mirroring each README snippet
- **Done when:** Each documented example runs and its shown output matches actual output; at least one error case is documented.
- **Evidence:** Usage section; examples test run log

### A05 · Demo media

- **Category:** Docs & Identity
- **Tier:** recommended
- **Effort:** S
- **Applies when:** projects with visible output (UI, CLI, visualization)
- **Why it matters:** A GIF, screenshot or short clip proves the thing runs and shows what it does faster than prose. It is also evidence, not decoration, when captured from a real run.
- **How to do it:** Capture from a real run, not a mockup. Keep media small (GIF under ~5 MB, PNG/WebP stills), store under docs/media/ or assets/, and caption with the command that produced it.
- **Examples:**
  - CLI tools: asciinema or vhs recordings
  - Web UIs: Playwright screenshots captured in CI
  - Python data/plots: matplotlib figures saved by a script in the repo
  - Rust/Go/C++ visual apps: ffmpeg-encoded GIF of a real run
  - Ruby: terminal recording of the CLI
  - Java desktop: screenshots of the real app window
- **Done when:** At least one image or GIF in the README is produced by a documented command from the current code and is under the size budget.
- **Evidence:** docs/media/ files plus the generating command

### A06 · LICENSE

- **Category:** Legal
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Without a license, nobody may legally use, copy or modify the code, and LLMs cannot safely reuse it. The license is the legal API.
- **How to do it:** Pick an OSI license deliberately (MIT for maximum reuse, Apache-2.0 for a patent grant, GPL/AGPL for copyleft). Put the full text in LICENSE with the year and the copyright holder, and declare the same SPDX identifier in the package manifest.
- **Examples:**
  - Python: license = 'MIT' in pyproject.toml
  - JS/TS: "license": "MIT" in package.json
  - Rust: license = 'MIT OR Apache-2.0' in Cargo.toml
  - Go: LICENSE file detected by pkg.go.dev
  - Ruby: spec.license = 'MIT' in the gemspec
  - C/C++: SPDX-License-Identifier header comments
  - Java: licenses block in pom.xml
- **Done when:** LICENSE exists, contains a recognized license text with the correct holder, and the SPDX id in every manifest matches it.
- **Evidence:** LICENSE; manifest license field

### A07 · CHANGELOG

- **Category:** Versioning & Release
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** A human-written history of notable changes lets users and LLMs understand what changed and why without reading diffs, and feeds release notes.
- **How to do it:** Use the Keep a Changelog layout: an Unreleased section on top, then one section per version with Added, Changed, Deprecated, Removed, Fixed, Security. Update it in the same commit as the change.
- **Examples:**
  - Python: CHANGELOG.md, optionally towncrier fragments
  - JS/TS: CHANGELOG.md, optionally changesets
  - Rust: CHANGELOG.md, optionally git-cliff from commits
  - Go: CHANGELOG.md alongside module tags
  - Ruby: CHANGELOG.md included in the gem files
  - C/C++: CHANGELOG.md or NEWS
  - Java: CHANGELOG.md mirrored in release notes
- **Done when:** CHANGELOG.md exists; its newest version heading equals the current version and the latest tag; Unreleased is present.
- **Evidence:** CHANGELOG.md

### A08 · Semantic version, tags and a single version source

- **Category:** Versioning & Release
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** One authoritative version number, matched by tags, code and docs, makes every artifact traceable to a commit. Drift between them is a classic error.
- **How to do it:** Follow SemVer (MAJOR.MINOR.PATCH). Keep the version in one place (VERSION file or manifest) and derive the rest. Tag releases as vX.Y.Z with annotated tags. Add a test that asserts all declared versions agree.
- **Examples:**
  - Python: version in pyproject.toml, read at runtime with importlib.metadata
  - JS/TS: version in package.json
  - Rust: version in Cargo.toml, read with env!("CARGO_PKG_VERSION")
  - Go: git tags vX.Y.Z are the version; ldflags inject it into binaries
  - Ruby: VERSION constant read from the VERSION file
  - C/C++: project(VERSION x.y.z) in CMakeLists.txt, generated header
  - Java: version in pom.xml or gradle.properties
- **Done when:** A test or script confirms the manifest version, VERSION file, CHANGELOG heading, CITATION version and latest git tag are identical.
- **Evidence:** VERSION or manifest; git tag list; version-consistency test

### A09 · Automated tests that pass

- **Category:** Quality & CI
- **Tier:** core
- **Effort:** M
- **Applies when:** always
- **Why it matters:** Tests are executable claims. Without them nothing in the README is verifiable and every change is a gamble.
- **How to do it:** Add a test suite runnable with one command. Cover the core logic, public interfaces and every claim in the README. Keep it fast by default; tag slow tests separately. Tests must pass on the default branch.
- **Examples:**
  - Python: pytest
  - JS/TS: vitest or node --test
  - Rust: cargo test
  - Go: go test ./...
  - Ruby: minitest or rspec
  - C/C++: ctest with Catch2 or GoogleTest
  - Java: JUnit 5 via mvn test or gradle test
- **Done when:** The single test command exits 0 on a clean clone; the test count is greater than zero and reported.
- **Evidence:** Test command output with pass count

### A10 · Informational CI

- **Category:** Quality & CI
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** CI proves the code builds and tests pass on a machine that is not yours. Under this standard it informs; it never gates, blocks or delays a commit or push.
- **How to do it:** Run build, tests and smoke checks on every push to main. Never configure required status checks, branch protection or merge gates. Failures are reported and fixed by follow-up commits to main.
- **Examples:**
  - GitHub Actions workflow on: push to main
  - Python: setup-python plus uv or pip, then pytest
  - JS/TS: setup-node, pnpm install, pnpm test
  - Rust: dtolnay/rust-toolchain, cargo test
  - Go: setup-go, go test ./...
  - Ruby: ruby/setup-ruby, bundle exec rake
  - C/C++ and Java: matrix of compilers or JDKs
- **Done when:** A workflow runs on push to main and is green on the latest commit; the repo has no branch protection and no required checks.
- **Evidence:** .github/workflows/ci.yml; latest run URL; branch protection API shows none

### A11 · Releases

- **Category:** Versioning & Release
- **Tier:** recommended
- **Effort:** S
- **Applies when:** anything users download or depend on
- **Why it matters:** A release is a named, immutable snapshot with notes and artifacts, so users and LLMs can pin to something that does not move.
- **How to do it:** On each version tag, publish a release with notes taken from the CHANGELOG and any built artifacts plus checksums. Automate it with a tag-triggered workflow that only runs after the push, never before it.
- **Examples:**
  - GitHub: gh release create vX.Y.Z --notes-file notes.md
  - Python: build wheel and sdist, attach and publish to PyPI
  - JS/TS: npm publish from a tag workflow
  - Rust: cargo publish plus cargo-dist binaries
  - Go: GoReleaser
  - Ruby: gem build and gem push
  - C/C++ and Java: attach binaries or jars with SHA-256 sums
- **Done when:** The latest tag has a published release whose notes match its CHANGELOG section and whose attached artifacts have checksums.
- **Evidence:** Release page URL; SHA256SUMS file

### A12 · .gitignore

- **Category:** Repo Hygiene
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Keeps build output, caches, secrets and editor junk out of history so the repo stays small, clean and safe.
- **How to do it:** Start from the github/gitignore template for each language in the stack, then add project outputs, local env files (.env), logs and OS files.
- **Examples:**
  - Python: __pycache__/, .venv/, dist/, *.egg-info/
  - JS/TS: node_modules/, dist/, .next/, coverage/
  - Rust: target/
  - Go: /bin/, vendor/ if not vendored deliberately
  - Ruby: .bundle/, vendor/bundle/, pkg/, tmp/
  - C/C++: build/, *.o, *.so, *.a, compile_commands.json if generated
  - Java: target/, build/, .gradle/, *.class
- **Done when:** After a full build and test run, git status shows no untracked generated files.
- **Evidence:** .gitignore; clean git status after build

### A13 · .gitattributes and .editorconfig

- **Category:** Repo Hygiene
- **Tier:** recommended
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Normalized line endings, binary detection and consistent indentation stop noisy diffs and cross-platform breakage (especially Windows CRLF in scripts).
- **How to do it:** Add .gitattributes with '* text=auto eol=lf', explicit binary patterns, and linguist hints for vendored or generated files. Add .editorconfig with charset, indentation and final-newline rules per file type.
- **Examples:**
  - All stacks: '*.sh text eol=lf' and '*.png binary' in .gitattributes
  - Python: indent_size = 4 for *.py
  - JS/TS: indent_size = 2 for *.{js,ts,json}
  - Go: indent_style = tab for *.go
  - Rust: indent_size = 4 for *.rs
  - Ruby: indent_size = 2 for *.rb
  - C/C++/Java: per-project style mirrored by clang-format or google-java-format
- **Done when:** Both files exist; git ls-files --eol shows no mixed line endings in text files.
- **Evidence:** .gitattributes; .editorconfig; git ls-files --eol output

### A14 · CONTRIBUTING guide

- **Category:** Community
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** Tells humans and agents how to build, test and propose changes, and states the house rules, including that work goes straight to main.
- **How to do it:** Describe setup, the task-runner commands, test and style expectations, commit message style, and the direct-to-main workflow. State that there are no PR gates and that issues are the place for discussion.
- **Examples:**
  - Python: uv sync; just test; just lint
  - JS/TS: pnpm i; pnpm test
  - Rust: cargo test; cargo clippy
  - Go: go test ./...; go vet ./...
  - Ruby: bundle exec rake
  - C/C++: cmake presets
  - Java: ./gradlew check
- **Done when:** CONTRIBUTING.md exists, every command in it works, and it states the direct-to-main, no-gates workflow.
- **Evidence:** CONTRIBUTING.md

### A15 · CODE_OF_CONDUCT

- **Category:** Community
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos with any outside interaction
- **Why it matters:** Sets expectations for behavior in issues and discussions and gives a contact for problems. It is cheap and standard.
- **How to do it:** Adopt Contributor Covenant 2.1 verbatim and fill in the contact method.
- **Examples:**
  - All stacks: CODE_OF_CONDUCT.md from contributor-covenant.org
  - GitHub: detected automatically in the community profile
- **Done when:** CODE_OF_CONDUCT.md exists with a real contact method filled in.
- **Evidence:** CODE_OF_CONDUCT.md

### A16 · SECURITY.md

- **Category:** Community
- **Tier:** core
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** Tells people how to report a vulnerability privately instead of in a public issue, and what versions get fixes.
- **How to do it:** State supported versions, the private reporting channel (GitHub private vulnerability reporting or an email), and expected response time. Enable private vulnerability reporting; it never blocks pushes.
- **Examples:**
  - GitHub: Settings > Security > Private vulnerability reporting enabled
  - Python/JS/Rust/Go/Ruby/C/Java: same file shape for every ecosystem
- **Done when:** SECURITY.md exists with supported versions and a working private channel.
- **Evidence:** SECURITY.md; repo setting screenshot or API output

### A17 · SUPPORT.md

- **Category:** Community
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** Routes questions to the right place (Discussions, FAQ, issues) so issues stay actionable.
- **How to do it:** List where to ask questions, where to report bugs, what information to include, and the maintenance status and response expectations of a one-person project.
- **Examples:**
  - GitHub: link to Discussions and the issue forms
  - All stacks: link docs/faq.md
- **Done when:** SUPPORT.md exists and every link in it resolves.
- **Evidence:** SUPPORT.md

### A18 · Issue templates

- **Category:** Community
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** Structured issue forms collect versions, reproduction steps and the finding class up front, so reports are actionable by a human or an LLM.
- **How to do it:** Add issue forms for bug, feature and question. Include a required dropdown for the finding class (bug, error, issue, problem, concern, dilemma, conflict, gap, hole, blindspot), environment fields and reproduction steps. Add config.yml linking to Discussions and SECURITY.md. Do not add PR templates.
- **Examples:**
  - GitHub: .github/ISSUE_TEMPLATE/bug.yml, feature.yml, config.yml
  - GitLab: .gitlab/issue_templates/*.md
  - All stacks: ask for runtime version (python --version, node -v, rustc -V, go version, ruby -v, gcc --version, java -version)
- **Done when:** Issue forms render on the new-issue page and include the finding-class dropdown with all ten classes; no pull_request_template exists.
- **Evidence:** .github/ISSUE_TEMPLATE/*

### A19 · About description and topics

- **Category:** Discoverability
- **Tier:** core
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** The About line and topics are how people and search engines (and LLM retrieval) find and categorize the repo.
- **How to do it:** Set a one-sentence description matching the README purpose, a homepage URL (Pages or docs), and 5 to 20 accurate topics covering language, domain and techniques.
- **Examples:**
  - GitHub CLI: gh repo edit --description '...' --homepage URL --add-topic ruby --add-topic artificial-life
  - All stacks: include the language topic (python, typescript, rust, go, ruby, cpp, java)
- **Done when:** gh repo view --json description,homepageUrl,repositoryTopics shows a non-empty description matching the README and at least 5 topics.
- **Evidence:** Repo metadata JSON

### A20 · docs/ folder

- **Category:** Docs & Identity
- **Tier:** recommended
- **Effort:** M
- **Applies when:** anything beyond a single small script
- **Why it matters:** Keeps the README short while giving depth: architecture, design, results and operations, so readers and LLMs can load exactly the context they need.
- **How to do it:** Create docs/ with architecture.md (components, data flow, a diagram), and topic files as needed (results, operations, FAQ, glossary). Link each from the README. Keep docs next to code and update them in the same commit.
- **Examples:**
  - Python: mkdocs or plain markdown in docs/
  - JS/TS: docs/ rendered by VitePress or Docusaurus if a site is wanted
  - Rust: docs/ plus rustdoc for the API
  - Go: docs/ plus godoc comments
  - Ruby: docs/ plus YARD
  - C/C++: docs/ plus Doxygen if API docs are needed
  - Java: docs/ plus Javadoc
- **Done when:** docs/architecture.md exists, includes a diagram, and every docs link from the README resolves.
- **Evidence:** docs/ tree

### A21 · Architecture Decision Records

- **Category:** Docs & Identity
- **Tier:** recommended
- **Effort:** S
- **Applies when:** projects with non-obvious design choices
- **Why it matters:** ADRs record why a choice was made and what was rejected, so a future LLM does not undo a deliberate decision or relitigate it.
- **How to do it:** Add docs/adr/NNNN-title.md, one per significant decision: context, decision, alternatives considered, consequences, status. Keep an index file. Never edit history; supersede with a new ADR.
- **Examples:**
  - All stacks: docs/adr/0001-record-architecture-decisions.md (Nygard format)
  - Tooling optional: adr-tools or log4brains, or plain markdown
- **Done when:** docs/adr/ has an index and at least one ADR per major design choice named in the architecture doc.
- **Evidence:** docs/adr/*.md

### A22 · CITATION.cff

- **Category:** Discoverability
- **Tier:** advanced
- **Effort:** S
- **Applies when:** research, data, benchmarks, or anything people may cite
- **Why it matters:** Makes the project citable with correct authorship and version; GitHub shows a 'Cite this repository' button.
- **How to do it:** Add CITATION.cff (Citation File Format 1.2) with title, authors, version, date-released, license and repository URL. Keep its version in sync with A08.
- **Examples:**
  - All stacks: CITATION.cff validated with cffconvert --validate
  - Optional: a BibTeX block in the README generated from it
- **Done when:** cffconvert --validate passes and its version equals the current version.
- **Evidence:** CITATION.cff; validation output

### A23 · Clean history and correct identity

- **Category:** Repo Hygiene
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Commits are the audit trail. Wrong author emails, placeholder identities or junk commits make provenance unclear.
- **How to do it:** Set user.name and user.email to the owner's real identity before the first commit. Write imperative, meaningful commit messages. Commit and push straight to main. Do not rewrite already-pushed history without the owner's explicit say-so.
- **Examples:**
  - All stacks: git config user.name and user.email set per repo
  - Conventional-style messages optional: feat:, fix:, docs:
- **Done when:** git log shows only the owner's real identity (or clearly attributed co-authors) and no placeholder emails; all work is on main.
- **Evidence:** git log --format='%an <%ae> %s' output

### A24 · No secrets, build output or huge files committed

- **Category:** Repo Hygiene
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Secrets in history are compromised forever; build output and large binaries bloat clones and hide what is source.
- **How to do it:** Keep secrets in environment variables or a secret store, with only .env.example committed. Ignore build output. Store large media outside git or via Git LFS. Scan history with a secret scanner in report-only mode.
- **Examples:**
  - All stacks: gitleaks detect --no-git=false run in CI as report-only
  - Python/JS: .env ignored, .env.example committed
  - Rust/Go/C/C++/Java: target/, bin/, build/ ignored
  - Large files: git lfs track '*.mp4' or host externally
- **Done when:** A secret scan of full history reports zero findings, no tracked file exceeds the size budget (default 5 MB), and no generated output is tracked.
- **Evidence:** Secret scan report; largest-files listing

### A25 · Cross-platform CI

- **Category:** Quality & CI
- **Tier:** recommended
- **Effort:** M
- **Applies when:** software meant to run on more than one OS
- **Why it matters:** Things that pass on your machine break on Windows or macOS (paths, line endings, native toolchains). An informational matrix shows where.
- **How to do it:** Add an OS matrix (ubuntu, macos, windows) and the supported runtime versions. Keep it informational with fail-fast off so one OS failing still reports the others.
- **Examples:**
  - GitHub Actions: runs-on matrix [ubuntu-latest, macos-latest, windows-latest], fail-fast false
  - Python: several Python versions
  - JS/TS: Node LTS versions
  - Rust: stable plus MSRV
  - Go: last two Go releases
  - Ruby: two supported Rubies
  - C/C++: gcc, clang, MSVC; Java: two LTS JDKs
- **Done when:** CI shows a run per OS in the support statement; README lists which OSes are tested versus untested.
- **Evidence:** CI matrix run URL

### A26 · Social preview image

- **Category:** Discoverability
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** The card shown when the link is shared; a real one makes the project recognizable and credible.
- **How to do it:** Make a 1280x640 PNG under 1 MB with the name, one-line purpose and a real screenshot or result. Upload it in repo settings and keep the source in docs/media/.
- **Examples:**
  - All stacks: docs/media/social-preview.png uploaded via GitHub Settings > Social preview
- **Done when:** Sharing the repo URL shows the custom image; the source file is in the repo.
- **Evidence:** docs/media/social-preview.png

### A27 · Pages demo or docs site

- **Category:** Discoverability
- **Tier:** advanced
- **Effort:** M
- **Applies when:** projects with a browsable demo, docs, or results
- **Why it matters:** A live URL lets anyone see it working without installing anything, the fastest proof that it is real.
- **How to do it:** Publish a static demo, docs or results page with GitHub Pages (or any static host) from a workflow on push to main. Link it as the repo homepage.
- **Examples:**
  - Python: mkdocs gh-deploy, or a Pyodide demo
  - JS/TS: Vite build deployed via actions/deploy-pages
  - Rust: WASM build with trunk or wasm-pack
  - Go: WASM or a static results page
  - Ruby: Jekyll or a static export of results
  - C/C++: Emscripten build
  - Java: Javadoc site
- **Done when:** The homepage URL returns 200 and shows content generated from the current main.
- **Evidence:** Pages URL; deploy workflow run

### A28 · Package manifest

- **Category:** Packaging & Tooling
- **Tier:** recommended
- **Effort:** S
- **Applies when:** libraries or tools others install
- **Why it matters:** A manifest makes the project installable, declares dependencies and metadata, and is what registries and LLMs read first.
- **How to do it:** Create the ecosystem's manifest with name, version (from A08), license, description, homepage, repository, minimum runtime version and dependencies. Make sure building the package works even if you never publish it.
- **Examples:**
  - Python: pyproject.toml (PEP 621)
  - JS/TS: package.json with engines, exports, files
  - Rust: Cargo.toml with rust-version
  - Go: go.mod
  - Ruby: *.gemspec with required_ruby_version
  - C/C++: CMake package config or vcpkg.json or conanfile
  - Java: pom.xml or build.gradle.kts
- **Done when:** The package builds locally with the standard command (python -m build, npm pack, cargo package, gem build, etc.) and its metadata matches README and LICENSE.
- **Evidence:** Manifest file; built package artifact

### A29 · ROADMAP.md

- **Category:** Lifecycle
- **Tier:** recommended
- **Effort:** S
- **Applies when:** projects expected to keep evolving
- **Why it matters:** States what is next, what is deliberately out of scope and what is done, so contributors and LLMs build toward the same goal.
- **How to do it:** Write Now, Next, Later and Not planned sections with short items; link issues where they exist. Update when priorities change.
- **Examples:**
  - All stacks: ROADMAP.md at root, optionally a pinned roadmap issue
- **Done when:** ROADMAP.md exists with Now, Next, Later and Not planned sections and was updated within the last release cycle.
- **Evidence:** ROADMAP.md

### A30 · Labels for the finding classes

- **Category:** Community
- **Tier:** recommended
- **Effort:** S
- **Applies when:** repos that use an issue tracker
- **Why it matters:** Consistent labels make triage instant. Using the ten finding classes as labels makes every report land in exactly one bucket.
- **How to do it:** Create labels: bug, error, issue, problem, concern, dilemma, conflict, gap, hole, blindspot (one per finding class, with the definitions as descriptions), plus a small set of area and priority labels. Delete unused defaults.
- **Examples:**
  - GitHub CLI: gh label create dilemma --description 'Trade-off between valid options; the owner decides' --color D4C5F9
  - GitLab: project labels via API
  - All stacks: same label set across every repo
- **Done when:** gh label list shows all ten finding-class labels with their definitions.
- **Evidence:** Label list output

### A31 · Task runner with one-word commands

- **Category:** Packaging & Tooling
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** One discoverable entry point (just test, just bench, just release) means humans and LLMs never guess at long commands, and docs stay short.
- **How to do it:** Add a justfile (or Makefile, Taskfile, npm scripts) with recipes: setup, build, test, lint, bench, run, reproduce, release, clean. Make 'just' with no arguments list the recipes. Recipes must never install git hooks.
- **Examples:**
  - Any stack: justfile with test := 'pytest -q' style recipes
  - JS/TS: package.json scripts
  - Rust: cargo aliases plus justfile
  - Go: Makefile or Taskfile.yml
  - Ruby: Rakefile tasks
  - C/C++: CMake presets plus justfile
  - Java: Gradle tasks
- **Done when:** Running the runner with no arguments lists recipes; setup, test and reproduce recipes exist and succeed.
- **Evidence:** justfile or equivalent; recipe list output

### A32 · Agent entry points: AGENTS.md canonical, plus CLAUDE.md, GEMINI.md, Cursor rules, llms.txt

- **Category:** LLM Interface
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Every coding agent looks for its own file first. One canonical AGENTS.md plus thin pointer files means OpenCode, Codex, Claude Code, Gemini CLI, Antigravity, Cursor, Grok Build and Grok Bot all start from the same rules and commands, and the files can never drift apart.
- **How to do it:** Write AGENTS.md at the root as the single source of truth: purpose, layout map, setup, test and verify commands, conventions, the hard rules (direct to main, nothing gates a push), the ten finding classes, and known traps; keep it under 32 KiB and link the full standard at docs/build-standard.md. Add thin pointers that contain no rules of their own: CLAUDE.md with the line @AGENTS.md, GEMINI.md with the line @./AGENTS.md, and .cursor/rules/build-standard.mdc with alwaysApply true pointing at AGENTS.md. Add llms.txt (llmstxt.org format: H1, blockquote summary, H2 link lists) and llms-full.txt (AGENTS.md plus the full standard concatenated, generated by a script, never hand-edited). Do not add .github/copilot-instructions.md.
- **Examples:**
  - Codex, OpenCode, Grok Build, Antigravity, Cursor: read AGENTS.md natively
  - Claude Code: CLAUDE.md containing @AGENTS.md (import syntax)
  - Gemini CLI: GEMINI.md containing @./AGENTS.md, or context.fileName set to AGENTS.md in .gemini/settings.json
  - Cursor and Grok Bot: .cursor/rules/build-standard.mdc with frontmatter alwaysApply: true
  - Web retrieval: llms.txt and generated llms-full.txt at the root
  - Chat models without repo access: paste build-standard-prompt.md
- **Done when:** AGENTS.md exists, is under 32 KiB, has commands that run, the hard rules and the finding classes; CLAUDE.md, GEMINI.md and the .mdc rule each reference AGENTS.md and add no conflicting rules; llms.txt links resolve; llms-full.txt is regenerated from sources and matches them; no copilot-instructions.md exists.
- **Evidence:** AGENTS.md; CLAUDE.md; GEMINI.md; .cursor/rules/build-standard.mdc; llms.txt; llms-full.txt

### A33 · Environment and configuration documented

- **Category:** Operations
- **Tier:** core
- **Effort:** S
- **Applies when:** anything configurable by env vars, flags or files
- **Why it matters:** Undocumented config is the most common cause of 'works on my machine'. Each setting needs a name, default, type and meaning.
- **How to do it:** Commit .env.example with every variable and a safe placeholder, and document each in docs/configuration.md (name, type, default, required, effect). Fail fast with a clear message when a required value is missing.
- **Examples:**
  - Python: pydantic-settings with a documented Settings class
  - JS/TS: zod-validated process.env
  - Rust: clap with env fallback, or envy
  - Go: envconfig or flag package with defaults
  - Ruby: ENV.fetch with explicit defaults
  - C/C++: getenv wrapper with a documented table
  - Java: Spring @ConfigurationProperties or a plain properties file
- **Done when:** Every variable read by the code appears in .env.example and the config doc; starting with a required variable missing exits with a clear error.
- **Evidence:** .env.example; docs/configuration.md

### A34 · Observability basics: logs, errors, health

- **Category:** Operations
- **Tier:** recommended
- **Effort:** M
- **Applies when:** services, long-running jobs, or deployed apps
- **Why it matters:** When it breaks at 3am you need to know what happened. Structured logs, captured errors and a health check are the minimum to diagnose anything.
- **How to do it:** Emit structured logs (JSON or key=value) with levels and request or run ids. Capture unhandled errors with stack traces. Expose a health or status endpoint or command. Never log secrets.
- **Examples:**
  - Python: logging or structlog plus a /healthz route
  - JS/TS: pino plus /healthz
  - Rust: tracing plus tracing-subscriber JSON
  - Go: log/slog plus /healthz
  - Ruby: Logger with JSON formatter
  - C/C++: spdlog
  - Java: SLF4J with Logback JSON encoder plus Actuator health
- **Done when:** Logs are structured with levels; an induced error produces a logged stack trace; the health check returns OK on a running instance.
- **Evidence:** Sample log lines; health check output

### A35 · Data, migrations, backups and an offsite repo mirror

- **Category:** Operations
- **Tier:** recommended
- **Effort:** M
- **Applies when:** always for the repo mirror; migrations and restore tests only when the project stores persistent data
- **Why it matters:** Data outlives code, and a one-person repo on one host is one account lockout away from gone. Versioned migrations, tested restores and an offsite copy of the repository itself are the cheapest insurance there is.
- **How to do it:** Version every schema change as an ordered, forward-only migration in the repo, keep a seed script for a working dev dataset, and document backup and restore and actually test a restore. Separately, keep an offsite mirror of the git repository (a second remote on another host, a scheduled git bundle to external storage, or both) and note where it lives in docs/operations.md.
- **Examples:**
  - Python: Alembic or Django migrations
  - JS/TS: Prisma Migrate, Drizzle or Knex
  - Rust: sqlx migrate or refinery
  - Go: golang-migrate or goose
  - Ruby: ActiveRecord migrations
  - Java: Flyway or Liquibase
  - Any stack: git remote add backup <codeberg-or-gitlab-url> then git push backup --mirror
  - Any stack: git bundle create repo-YYYYMMDD.bundle --all copied to a separate drive or cloud bucket
- **Done when:** An offsite mirror or bundle of the repo exists and is no older than the last release; if the project stores data, migrations apply cleanly to an empty database and a documented backup has been restored once with the log saved.
- **Evidence:** Mirror remote or bundle location in docs/operations.md; migrations/ directory; restore test log

### A36 · One-command deploy and rollback

- **Category:** Operations
- **Tier:** recommended
- **Effort:** M
- **Applies when:** anything deployed
- **Why it matters:** If deploying takes a checklist, it will be done wrong. If rolling back takes more than one command, outages last longer.
- **How to do it:** Provide 'just deploy' and 'just rollback' (or equivalent) that deploy a specific version and restore the previous one. Deploy immutable, versioned artifacts. Document what the rollback does to data.
- **Examples:**
  - Containers: docker build tagged with the version, then deploy by tag
  - Vercel/Netlify: promote previous deployment
  - Python/Ruby/JS servers: deploy a tagged release; rollback redeploys the previous tag
  - Rust/Go/C/C++: ship a versioned binary; rollback swaps a symlink
  - Java: versioned jar or container image
- **Done when:** Deploy and rollback each run as a single command and have been exercised once with the log saved.
- **Evidence:** Task runner recipes; deploy and rollback logs

### A37 · Performance budgets

- **Category:** Quality & CI
- **Tier:** advanced
- **Effort:** M
- **Applies when:** performance-sensitive code, UIs, or anything with speed claims
- **Why it matters:** A stated budget turns 'fast' into a checkable number and catches slow drift before users do.
- **How to do it:** Pick 1 to 3 budgets (latency, throughput, memory, bundle size, startup time). Measure them with a repeatable benchmark and report the result in CI as information, not as a gate.
- **Examples:**
  - Python: pytest-benchmark
  - JS/TS: Lighthouse CI or size-limit, report-only
  - Rust: criterion
  - Go: go test -bench with benchstat
  - Ruby: benchmark-ips
  - C/C++: Google Benchmark
  - Java: JMH
- **Done when:** docs/ lists each budget with its current measured value and the command to measure it; CI publishes the numbers.
- **Evidence:** Budget table; benchmark output

### A38 · Accessibility and internationalization

- **Category:** UX
- **Tier:** core
- **Effort:** M
- **Applies when:** accessibility: only projects with a user interface; i18n note: any project with user-facing text
- **Why it matters:** Inaccessible UIs exclude people and break keyboard, screen-reader and automation (including LLM browser agents). Hard-coded strings, dates and number formats make later localization a rewrite.
- **How to do it:** Target WCAG 2.2 AA: semantic markup, labels, keyboard navigation, visible focus, contrast, reduced-motion support, alt text; run an automated checker and one manual keyboard pass. For i18n, use UTF-8 everywhere, keep user-facing strings out of logic (resource files or a message catalog), format dates, numbers and currency with locale-aware APIs, and state in the README which locales are supported, even if it is English only.
- **Examples:**
  - Web (JS/TS): axe-core via @axe-core/playwright; Intl.DateTimeFormat and i18next or FormatJS
  - Python: pa11y against the running app; gettext or Babel
  - Rust: AccessKit for GUIs; fluent-rs for messages
  - Go: golang.org/x/text/message
  - Ruby: rails-i18n or the i18n gem
  - Java: accessible names in Swing/JavaFX; ResourceBundle and java.text formatters
  - Mobile: Android Accessibility Scanner, iOS Accessibility Inspector, platform string catalogs
- **Done when:** If there is a UI, an automated scan reports zero serious or critical violations and a keyboard-only pass completes the main flow; user-facing strings are not hard-coded in logic and the README states the supported locales.
- **Evidence:** Accessibility scan report; manual pass notes; locale statement in README

### A39 · Third-party licensing and attribution

- **Category:** Legal
- **Tier:** recommended
- **Effort:** S
- **Applies when:** projects with dependencies, copied code, fonts, data or media
- **Why it matters:** You must honor the licenses of what you ship. Copied snippets, fonts, datasets and images all carry terms.
- **How to do it:** Generate a dependency license report. Keep THIRD_PARTY_NOTICES (or NOTICE) listing bundled code, assets, data and their licenses. Check for license incompatibilities (e.g. GPL into MIT binaries).
- **Examples:**
  - Python: pip-licenses
  - JS/TS: license-checker or npx license-report
  - Rust: cargo-about or cargo-deny check licenses (report-only)
  - Go: go-licenses
  - Ruby: license_finder
  - C/C++: manual NOTICE plus reuse lint
  - Java: license-maven-plugin
- **Done when:** A license report exists for all shipped dependencies, bundled assets are listed with source and license, and no incompatibility is unexplained.
- **Evidence:** THIRD_PARTY_NOTICES; license report

### A40 · AI components pinned, evaluated and budgeted

- **Category:** AI
- **Tier:** core
- **Effort:** M
- **Applies when:** only projects that call or ship an AI model
- **Why it matters:** Model behavior changes silently when versions or prompts drift, and token costs can explode without anyone noticing. Pinning, an eval suite and a hard cost budget are the only way to know an AI feature still works and is still affordable.
- **How to do it:** Pin exact model ids and versions, sampling parameters and prompt templates in versioned files; keep prompts in the repo, not inline strings. Maintain an eval set and run it on every model or prompt change, recording scores over time. Set budgets: max tokens per call, per run and per month, with a cost estimate per model; log tokens and cost per call; cache repeated calls; fail or fall back to a cheaper model when a budget is hit; document the numbers in docs/ai.md.
- **Examples:**
  - Python: promptfoo or inspect-ai for evals; tiktoken or provider usage fields for token counts
  - JS/TS: promptfoo; Vercel AI SDK usage object logged per call
  - Any stack: model id like provider/model@2026-05-01 in config, never 'latest'
  - Any stack: AI_MAX_TOKENS_PER_CALL and AI_MONTHLY_BUDGET_USD in .env.example, enforced in a wrapper
  - Rust/Go/Ruby/Java: golden-response fixtures with tolerant scorers plus a usage logger
- **Done when:** Model ids and params are pinned in config; prompts live in versioned files; an eval command writes a score file; per-call, per-run and monthly token or cost budgets are documented and enforced in code; a usage log shows tokens and cost per call.
- **Evidence:** Model config; prompts/ directory; eval results file; docs/ai.md budgets; usage log

### A41 · Deprecation and upgrade path

- **Category:** Lifecycle
- **Tier:** advanced
- **Effort:** S
- **Applies when:** libraries, APIs, file formats or CLIs others depend on
- **Why it matters:** Breaking users without warning destroys trust. A clear deprecation policy and upgrade notes make change safe.
- **How to do it:** Announce deprecations one minor version before removal, emit runtime warnings, and write UPGRADING.md (or a CHANGELOG section) with before and after examples for each breaking change.
- **Examples:**
  - Python: warnings.warn(..., DeprecationWarning)
  - JS/TS: @deprecated JSDoc plus console.warn once
  - Rust: #[deprecated(since, note)]
  - Go: // Deprecated: comment convention
  - Ruby: Gem::Deprecate or warn
  - C/C++: [[deprecated]] attribute
  - Java: @Deprecated(since, forRemoval)
- **Done when:** Every removed or changed public API in a MAJOR release has a prior deprecation and an upgrade entry with an example.
- **Evidence:** UPGRADING.md or CHANGELOG deprecation entries

### A42 · Maintenance status

- **Category:** Lifecycle
- **Tier:** recommended
- **Effort:** S
- **Applies when:** public repos
- **Why it matters:** Users need to know whether to depend on it: active, maintained, experimental, or archived. One-person projects should say so honestly.
- **How to do it:** State the status in the README (badge or line) using a fixed vocabulary: experimental, active, maintenance-only, archived. Update it when it changes; archive the repo when abandoned.
- **Examples:**
  - All stacks: repostatus.org badge or a 'Status:' line in README
  - GitHub: gh repo archive when done
- **Done when:** README declares one status from the fixed vocabulary and it matches recent activity.
- **Evidence:** README status line

### A43 · examples/ directory

- **Category:** Docs & Identity
- **Tier:** recommended
- **Effort:** S
- **Applies when:** libraries, APIs, frameworks, CLIs
- **Why it matters:** Complete, runnable examples teach faster than reference docs and are excellent context for LLMs generating code against the project.
- **How to do it:** Add examples/ with small, self-contained programs for the main use cases, each with a one-line header comment and a run command. Run them in CI as smoke tests.
- **Examples:**
  - Python: examples/*.py run by a pytest smoke test
  - JS/TS: examples/*.ts run with tsx
  - Rust: examples/*.rs run with cargo run --example
  - Go: examples/<name>/main.go
  - Ruby: examples/*.rb
  - C/C++: examples/ built by CMake
  - Java: examples module
- **Done when:** Each file in examples/ runs successfully in CI with exit code 0.
- **Evidence:** examples/ directory; CI smoke log

### A44 · FAQ and glossary

- **Category:** Docs & Identity
- **Tier:** recommended
- **Effort:** S
- **Applies when:** projects with users beyond the author or with domain-specific terms
- **Why it matters:** The FAQ answers the questions everyone asks once, including the skeptical ones; the glossary defines the project's vocabulary so humans and LLMs use terms consistently.
- **How to do it:** Keep docs/faq.md with real questions from issues, chats and LLM sessions, each answered with a link to evidence or docs, including 'why not use X' and 'what is this not'. Keep docs/glossary.md with each project-specific term, a one-sentence definition and where it appears in code, including the ten finding classes and any metaphors versus literal terms.
- **Examples:**
  - All stacks: docs/faq.md linked from README and SUPPORT.md
  - All stacks: docs/glossary.md alphabetized, linked from README and AGENTS.md
- **Done when:** docs/faq.md exists with at least 5 real questions answered with links to evidence or docs, and every project-specific term used in the README is defined in docs/glossary.md.
- **Evidence:** docs/faq.md; docs/glossary.md

### A45 · Privacy and personal-data handling

- **Category:** Legal
- **Tier:** core
- **Effort:** M
- **Applies when:** only projects that collect, store, process or log personal data (including analytics, telemetry and AI prompts with user content)
- **Why it matters:** Personal data is a legal and trust liability. Knowing what you collect, why, where it goes and how to delete it is required by GDPR, CCPA and similar laws, and keeps prompts, logs and backups from leaking it.
- **How to do it:** Write docs/privacy.md: a data inventory (each field, purpose, legal basis, where stored, retention, who can access it, which third parties or AI providers receive it). Collect the minimum, keep personal data out of logs and test fixtures, encrypt in transit and at rest, support export and deletion, make telemetry opt-in, and test that redaction works.
- **Examples:**
  - Python: structlog processors that redact emails and tokens; Faker for synthetic fixtures
  - JS/TS: pino redact paths; consent-gated analytics
  - Rust/Go: log field allowlists instead of logging whole structs
  - Ruby: Rails filter_parameters
  - Java: Logback masking patterns
  - AI apps: strip or pseudonymize personal data before sending prompts; check the provider's retention settings
- **Done when:** docs/privacy.md lists every personal-data field with purpose, storage, retention and recipients; a test shows logs redact personal data; deletion or export is documented and works.
- **Evidence:** docs/privacy.md; redaction test; deletion procedure

## Part B: Verification Ladder: prove it isn't BS

How to show the work is real, correct and reproducible, from cheapest to strongest.

### B01 · Reproducible build from a clean clone

- **Category:** Reproducibility
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** If nobody else can rebuild it, nobody can check it. Reproducibility is the floor every other proof stands on.
- **How to do it:** Provide one command (just reproduce) that goes from a clean clone to built artifacts and key results. Run it in a clean container or fresh CI runner. Record the toolchain versions it used.
- **Examples:**
  - Python: uv sync --frozen then just reproduce
  - JS/TS: pnpm install --frozen-lockfile
  - Rust: cargo build --locked
  - Go: go build with -trimpath and go.sum
  - Ruby: bundle install --frozen (BUNDLE_FROZEN=true)
  - C/C++: CMake presets in a pinned Docker image
  - Java: Gradle wrapper with dependency locking
  - Any stack: Nix flake or Dockerfile with digest-pinned base image
- **Done when:** In a fresh environment, the reproduce command exits 0 and regenerates the headline results with matching checksums or values.
- **Evidence:** Reproduce log with toolchain versions; result files

### B02 · Pinned toolchains and lockfiles

- **Category:** Reproducibility
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Floating versions mean the same commit builds differently next month. Pinning makes results attributable to code, not to the day you ran it.
- **How to do it:** Commit lockfiles and a toolchain pin file. Pin CI actions and container images to versions or digests. Never use 'latest' for anything that affects output.
- **Examples:**
  - Python: uv.lock or poetry.lock plus .python-version
  - JS/TS: pnpm-lock.yaml plus .nvmrc or packageManager field
  - Rust: Cargo.lock plus rust-toolchain.toml
  - Go: go.sum plus toolchain directive in go.mod
  - Ruby: Gemfile.lock plus .ruby-version
  - C/C++: vcpkg baseline or conan lockfile plus compiler version
  - Java: gradle.lockfile plus .sdkmanrc or toolchain block
- **Done when:** Lockfile and toolchain pin are committed; no dependency or CI image is specified as 'latest' or an unbounded range in a way that changes output.
- **Evidence:** Lockfiles; toolchain file; CI config

### B03 · Determinism checks

- **Category:** Reproducibility
- **Tier:** core
- **Effort:** S
- **Applies when:** anything with randomness, concurrency, or time-dependent output
- **Why it matters:** Same input plus same seed must give the same output, or nobody can tell a real change from noise. Non-determinism hides bugs and fakes results.
- **How to do it:** Thread an explicit seed through every random source. Remove hidden inputs (wall-clock time, hash ordering, thread scheduling, locale). Add a test that runs twice and compares output hashes, and runs across backends or platforms where relevant.
- **Examples:**
  - Python: random.Random(seed), numpy default_rng(seed), PYTHONHASHSEED fixed
  - JS/TS: seeded PRNG such as seedrandom; no Math.random in core logic
  - Rust: rand_chacha::ChaCha8Rng::seed_from_u64
  - Go: rand.New(rand.NewPCG(seed, seed))
  - Ruby: Random.new(seed)
  - C/C++: std::mt19937_64 with explicit seed
  - Java: new SplittableRandom(seed)
- **Done when:** A test runs the core computation twice with the same seed and asserts identical output hashes; it passes.
- **Evidence:** Determinism test; output hashes

### B04 · CLAIMS.md ledger

- **Category:** Claims & Tests
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Every number and promise in the README must be traceable to the command and test that produces it. Untraceable claims are where BS hides.
- **How to do it:** Create CLAIMS.md: a table with claim id, exact claim text, where it appears, command that produces it, test that checks it, last verified value and date, status (verified, unverified, retracted). If a claim cannot be linked to a test, remove or mark it unverified.
- **Examples:**
  - All stacks: a CLAIMS.md row such as: C01; 'selection beats drift (p<0.05)'; README#results; just control; test_control.rb; p=0.009; 2026-11-22; verified
  - Optional: a script that greps README numbers and checks each appears in CLAIMS.md
- **Done when:** Every quantitative or behavioral claim in README and docs has a CLAIMS.md row with a runnable command and a test; no row is missing a status.
- **Evidence:** CLAIMS.md

### B05 · Falsifiable tests per claim

- **Category:** Claims & Tests
- **Tier:** core
- **Effort:** M
- **Applies when:** always
- **Why it matters:** A claim is only meaningful if some outcome would prove it false. Encoding that outcome as a failing test turns marketing into science.
- **How to do it:** For each claim in CLAIMS.md, write a test that would fail if the claim were false (thresholds, equalities, orderings). Verify the test can fail by temporarily breaking the code or the threshold once.
- **Examples:**
  - Python: assert speedup > 1.5 in a pytest marked slow
  - JS/TS: expect(result).toEqual(reference)
  - Rust: assert_eq!(c_backend(world), rust_backend(world))
  - Go: if got != want { t.Fatalf(...) }
  - Ruby: assert_operator p_value, :<, 0.05
  - C/C++: REQUIRE(checksum == expected)
  - Java: assertTrue(fitnessSelection > fitnessDrift)
- **Done when:** Each CLAIMS.md row links to a test that passes now and was shown to fail when the claim was deliberately broken.
- **Evidence:** Claim tests; one recorded failing run per claim

### B06 · Negative tests

- **Category:** Claims & Tests
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Code that accepts everything proves nothing. Negative tests show that bad input, bad state and misuse are rejected loudly instead of silently producing garbage.
- **How to do it:** For each input boundary, test invalid, empty, oversized, malformed and hostile values, and assert the specific error. Test that forbidden operations fail.
- **Examples:**
  - Python: with pytest.raises(ValueError, match='...')
  - JS/TS: expect(() => parse('')).toThrow(/empty/)
  - Rust: assert!(parse("").is_err())
  - Go: if err == nil { t.Fatal("expected error") }
  - Ruby: assert_raises(ArgumentError)
  - C/C++: REQUIRE_THROWS_AS(f(), std::invalid_argument)
  - Java: assertThrows(IllegalArgumentException.class, ...)
- **Done when:** Every public input boundary has at least one test asserting a specific rejection.
- **Evidence:** Negative test cases

### B07 · Regression test per fixed bug

- **Category:** Claims & Tests
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** A bug fixed without a test comes back. A regression test is proof the fix is real and stays real.
- **How to do it:** Before fixing a bug, write a test that reproduces it and fails. Fix the code, see it pass, and name the test after the bug or issue number. Record it in the CHANGELOG under Fixed.
- **Examples:**
  - Python: test_issue_42_negative_energy
  - JS/TS: it('regression #42: ...')
  - Rust: #[test] fn regression_42()
  - Go: TestRegression42
  - Ruby: test_regression_42
  - C/C++: TEST_CASE("regression 42")
  - Java: @Test void regression42()
- **Done when:** Every entry under Fixed in the CHANGELOG maps to a named regression test that passes.
- **Evidence:** Regression tests; CHANGELOG Fixed entries

### B08 · Golden and snapshot tests

- **Category:** Claims & Tests
- **Tier:** recommended
- **Effort:** S
- **Applies when:** deterministic outputs: renderers, compilers, reports, CLIs, serializers
- **Why it matters:** Golden files pin entire outputs, so any unintended change in behavior shows up as a diff, even in places nobody thought to assert.
- **How to do it:** Store reviewed expected outputs under tests/golden/. Compare byte-for-byte or with a documented normalizer. Updating goldens requires an explicit command and a commit message explaining why.
- **Examples:**
  - Python: syrupy or pytest-regressions
  - JS/TS: vitest toMatchSnapshot or toMatchFileSnapshot
  - Rust: insta
  - Go: goldie or testdata/*.golden with -update flag
  - Ruby: approvals gem
  - C/C++: approval tests (ApprovalTests.cpp)
  - Java: ApprovalTests.Java
- **Done when:** Golden tests pass; goldens are only changed in commits whose message explains the behavior change.
- **Evidence:** tests/golden/ files

### B09 · Contract and API tests

- **Category:** Claims & Tests
- **Tier:** recommended
- **Effort:** M
- **Applies when:** anything exposing or consuming an API, file format, or protocol
- **Why it matters:** Interfaces are promises to others. Contract tests prove the promise holds on both sides and catch breaking changes before users do.
- **How to do it:** Write the contract down (OpenAPI, JSON Schema, protobuf, GraphQL schema, file format spec). Validate real responses and files against it in tests. For consumed APIs, test against recorded or stubbed provider contracts.
- **Examples:**
  - Python: schemathesis against OpenAPI
  - JS/TS: zod or ajv schema validation; Pact
  - Rust: jsonschema crate; serde round-trip tests
  - Go: kin-openapi validation
  - Ruby: committee or json_schemer
  - C/C++: protobuf conformance tests
  - Java: Spring Cloud Contract or Pact JVM
- **Done when:** Every public endpoint or format has a machine-readable contract and a test validating real output against it.
- **Evidence:** Contract files; contract test results

### B10 · Property-based tests

- **Category:** Generative Testing
- **Tier:** core
- **Effort:** M
- **Applies when:** any non-trivial logic
- **Why it matters:** Hand-picked examples test what you thought of. Properties tested over thousands of random inputs find what you did not.
- **How to do it:** Identify invariants (round-trips, conservation laws, ordering, idempotence, bounds) and test them with a property-based library. Keep the failing seeds it finds as permanent regression cases.
- **Examples:**
  - Python: Hypothesis
  - JS/TS: fast-check
  - Rust: proptest or quickcheck
  - Go: testing/quick or rapid
  - Ruby: rantly or prop_check
  - C/C++: RapidCheck
  - Java: jqwik
  - Haskell: QuickCheck
- **Done when:** At least one property test per core module runs at least 1,000 cases and passes; shrunk counterexamples found earlier are kept as fixed tests.
- **Evidence:** Property test files; run output with case counts

### B11 · Differential testing

- **Category:** Generative Testing
- **Tier:** recommended
- **Effort:** M
- **Applies when:** code with a second implementation, a previous version, or an equivalent library
- **Why it matters:** If two independent implementations agree on many random inputs, both are probably right; if they disagree, one is lying. It is the cheapest strong oracle.
- **How to do it:** Run the same generated inputs through two implementations (fast vs simple, native vs scripting, new vs previous release, yours vs a trusted library) and assert equal outputs.
- **Examples:**
  - Python: compare against a numpy or reference implementation
  - JS/TS: compare a new parser with the previous release on a corpus
  - Rust/C/asm: same world state through every backend, identical checksums
  - Go: compare against the standard library equivalent
  - Ruby: pure-Ruby path versus C-extension path
  - Java: compare with a well-known library
- **Done when:** A differential test runs at least 1,000 random inputs through each implementation pair with zero mismatches.
- **Evidence:** Differential test output

### B12 · Reference implementation as test oracle

- **Category:** Generative Testing
- **Tier:** recommended
- **Effort:** M
- **Applies when:** optimized, native, concurrent or complex code
- **Why it matters:** A small, obviously-correct (slow) version of the core logic is the spec you can execute. Fast code is then checked against it.
- **How to do it:** Write the simplest possible implementation of the core, optimized for readability, not speed. Keep it in the repo under reference/ and use it as the oracle in differential and property tests.
- **Examples:**
  - Python: reference.py with plain loops
  - JS/TS: naive implementation in tests/reference.ts
  - Rust: a #[cfg(test)] naive module
  - Go: reference_test.go
  - Ruby: pure-Ruby reference of a C extension
  - C/C++: scalar reference for SIMD code
  - Java: straightforward reference class in test sources
- **Done when:** A reference implementation exists, is documented as the oracle, and is exercised by at least one differential or property test.
- **Evidence:** reference/ code; tests using it

### B13 · Mutation testing

- **Category:** Generative Testing
- **Tier:** recommended
- **Effort:** M
- **Applies when:** code whose tests you want to trust
- **Why it matters:** Passing tests prove little if they would also pass on broken code. Mutation testing plants bugs and checks the tests catch them.
- **How to do it:** Run a mutation tool over core modules. Review surviving mutants: add tests or document why the mutant is equivalent. Report the mutation score; never gate on it.
- **Examples:**
  - Python: mutmut or cosmic-ray
  - JS/TS: Stryker
  - Rust: cargo-mutants
  - Go: go-mutesting or gremlins
  - Ruby: mutant
  - C/C++: Mull or dextool mutate
  - Java: PIT (pitest)
- **Done when:** A mutation report exists for core modules, its score is recorded in docs, and every surviving mutant is either killed by a new test or explained.
- **Evidence:** Mutation report

### B14 · Metamorphic testing

- **Category:** Generative Testing
- **Tier:** advanced
- **Effort:** M
- **Applies when:** code with no easy oracle: simulations, ML, search, numerics, compilers
- **Why it matters:** When you cannot know the right answer, you can still know how answers must relate (scaling input scales output; reordering does not change a sum).
- **How to do it:** Define metamorphic relations between transformed inputs and outputs and test them with generated inputs.
- **Examples:**
  - Python: shuffling rows must not change model aggregate metrics
  - JS/TS: search(query) results superset of search(query + filter)
  - Rust/C++: rotating a simulation world must rotate its trajectory
  - Go: compressing then decompressing returns the original
  - Ruby: doubling all energies doubles total energy
  - Java: sort(list) equals sort(shuffle(list))
- **Done when:** At least two metamorphic relations are tested on generated inputs and pass.
- **Evidence:** Metamorphic test files

### B15 · Fuzzing

- **Category:** Robustness
- **Tier:** recommended
- **Effort:** M
- **Applies when:** parsers, decoders, native code, network or file input, anything taking untrusted input
- **Why it matters:** Fuzzers throw millions of malformed inputs at your boundaries and find crashes, hangs and memory bugs that no human would write as a test.
- **How to do it:** Write a fuzz harness for each input boundary, seed it with a small corpus, run it for a fixed time budget, and commit any crashing inputs as regression tests. Run it on a schedule or manually, report-only.
- **Examples:**
  - Python: Atheris
  - JS/TS: Jazzer.js
  - Rust: cargo-fuzz (libFuzzer)
  - Go: native go test -fuzz
  - Ruby: ruzzy
  - C/C++: libFuzzer or AFL++
  - Java: Jazzer
- **Done when:** Each input boundary has a harness; a documented run of at least 10 minutes per harness found no new crashes, or every crash found is fixed with a regression test.
- **Evidence:** Fuzz harnesses; corpus; run log

### B16 · Sanitizers and runtime checkers

- **Category:** Robustness
- **Tier:** core
- **Effort:** S
- **Applies when:** only native or unsafe code (C, C++, asm, unsafe Rust, extensions, FFI)
- **Why it matters:** Memory corruption and undefined behavior can silently fake results. Sanitizers turn them into loud, located failures.
- **How to do it:** Build a sanitizer variant and run the full test suite under it: AddressSanitizer, UndefinedBehaviorSanitizer, and ThreadSanitizer for concurrent code. Use Valgrind or Miri where sanitizers do not reach.
- **Examples:**
  - C/C++: -fsanitize=address,undefined -fno-omit-frame-pointer
  - Rust: cargo +nightly miri test for unsafe code; RUSTFLAGS=-Zsanitizer=address
  - Go: go test -race; go build -asan
  - Python/Ruby C extensions: build the extension with ASan and run tests with LD_PRELOAD of libasan
  - Java (JNI): -Xcheck:jni
  - Any native: valgrind --error-exitcode=1
- **Done when:** The full test suite passes under ASan and UBSan (and TSan if concurrent) with zero reports.
- **Evidence:** Sanitizer run log

### B17 · Static analysis and linters, report-only

- **Category:** Static Assurance
- **Tier:** recommended
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Linters and analyzers catch whole classes of mistakes before runtime at near-zero cost. Under this standard they inform; they never block a commit or push.
- **How to do it:** Run the ecosystem's standard linter and analyzer via the task runner and in informational CI. Fix findings in follow-up commits. Never install them as git hooks.
- **Examples:**
  - Python: ruff check
  - JS/TS: eslint, biome
  - Rust: cargo clippy -- -W clippy::pedantic
  - Go: go vet, staticcheck
  - Ruby: rubocop
  - C/C++: clang-tidy, cppcheck
  - Java: Error Prone, SpotBugs
- **Done when:** A lint command exists in the task runner, runs in CI as information, and its finding count is reported; no hook or required check exists.
- **Evidence:** Lint output

### B18 · Strict type checking

- **Category:** Static Assurance
- **Tier:** recommended
- **Effort:** S
- **Applies when:** typed or gradually typed languages
- **Why it matters:** Types are machine-checked documentation. Strict mode removes a whole category of runtime errors.
- **How to do it:** Enable the strictest reasonable mode, compile with warnings on, and run the checker in the task runner and informational CI. Avoid escape hatches (any, type: ignore, unsafe casts) without a comment.
- **Examples:**
  - Python: mypy --strict or pyright strict
  - JS/TS: tsc --noEmit with strict: true
  - Rust: cargo check and cargo clippy with warnings reported, never denied as a gate
  - Go: compiler plus go vet
  - Ruby: Sorbet or Steep with RBS
  - C/C++: -Wall -Wextra -Wpedantic -Wconversion
  - Java: javac -Xlint:all
- **Done when:** The type checker in strict mode reports zero errors, or the remaining count is recorded and decreasing.
- **Evidence:** Type check output

### B19 · Concurrency and race testing

- **Category:** Robustness
- **Tier:** advanced
- **Effort:** M
- **Applies when:** only concurrent, parallel or async code
- **Why it matters:** Races pass tests 999 times and corrupt data on the 1000th. Dedicated tools explore interleavings that normal runs never hit.
- **How to do it:** Run race detectors, stress tests with many iterations and randomized scheduling, and systematic interleaving explorers where available.
- **Examples:**
  - Go: go test -race -count=100
  - Rust: loom for lock-free code; shuttle
  - C/C++: ThreadSanitizer; rr chaos mode
  - Java: jcstress; Lincheck
  - Python: pytest-repeat with threads; free-threaded build tests
  - JS/TS: randomized async ordering in tests
  - Ruby: Ractor or thread stress tests
- **Done when:** Race detector runs report zero races and stress tests pass at least 100 repeated iterations.
- **Evidence:** Race detector and stress logs

### B20 · Numeric and floating-point stability

- **Category:** Robustness
- **Tier:** advanced
- **Effort:** M
- **Applies when:** only numeric, scientific, financial, ML or simulation code
- **Why it matters:** Floating point is not real arithmetic. Results that change with compiler flags, platforms or summation order are not results.
- **How to do it:** Use tolerances with stated rationale instead of exact equality, test edge values (0, negative zero, NaN, infinity, subnormals, huge and tiny), check results under different optimization levels or platforms, use stable algorithms (Kahan summation, log-sum-exp), and use integers or decimals for money.
- **Examples:**
  - Python: math.isclose, numpy.testing.assert_allclose with rtol
  - JS/TS: Number.EPSILON-aware comparisons; decimal.js for money
  - Rust: approx crate; avoid -ffast-math equivalents
  - Go: math.Nextafter-based checks
  - Ruby: BigDecimal for money
  - C/C++: compare -O0 vs -O3 results; avoid -ffast-math where results matter
  - Java: BigDecimal; StrictMath
- **Done when:** Edge-value tests pass, tolerances are documented, and results agree across at least two platforms or optimization levels within tolerance.
- **Evidence:** Numeric test results; tolerance table

### B21 · Failure injection

- **Category:** Robustness
- **Tier:** advanced
- **Effort:** M
- **Applies when:** services, I/O-heavy code, or anything with external dependencies
- **Why it matters:** Real systems fail: disks fill, networks drop, APIs time out. Proving graceful failure is part of proving it works.
- **How to do it:** Inject failures in tests: timeouts, connection errors, partial writes, full disk, permission errors, malformed upstream responses, killed processes. Assert clean errors, retries with limits, and no data corruption.
- **Examples:**
  - Python: pytest monkeypatch raising OSError; toxiproxy
  - JS/TS: msw or nock returning errors and delays
  - Rust: fail crate (failpoints)
  - Go: httptest servers returning 500s and delays
  - Ruby: webmock to_timeout
  - C/C++: LD_PRELOAD fault injection
  - Java: WireMock faults; Toxiproxy
- **Done when:** Each external dependency has at least one test simulating its failure, and each asserts a clean, specific error and intact data.
- **Evidence:** Failure-injection tests

### B22 · Formal specification and proof

- **Category:** Formal Methods
- **Tier:** advanced
- **Effort:** L
- **Applies when:** core logic where a bug would be catastrophic or the claim is mathematical
- **Why it matters:** Tests check examples; proofs check all cases. For a small, critical kernel, a machine-checked proof is the strongest correctness evidence there is.
- **How to do it:** Write a small formal model of the core rules in a proof assistant and prove key properties (invariants, conservation, termination, determinism). Link the model to the code with differential tests from the spec, or by extracting the reference implementation from it. State exactly what is and is not proven.
- **Examples:**
  - Lean 4: model the step function and prove an invariant with lake build
  - Coq/Rocq: prove properties and extract OCaml or Haskell reference code
  - Isabelle/HOL: model and prove with Sledgehammer assistance
  - Agda: dependently typed spec for small kernels
  - Any stack: generate test vectors from the proven model and run them against production code
- **Done when:** The proof project builds with no unproven placeholders (no sorry, admit or oops); docs state which properties are proven and how the model is linked to the code.
- **Evidence:** proofs/ directory; build log; statement of proven properties

### B23 · Design model checking

- **Category:** Formal Methods
- **Tier:** advanced
- **Effort:** M
- **Applies when:** distributed, concurrent, protocol, or state-machine designs
- **Why it matters:** Design bugs in protocols and state machines hide in rare interleavings. Model checkers explore every state of a small model and find them before code exists.
- **How to do it:** Write a model of the design and its invariants, then exhaustively check it for small bounds. Keep the model next to the code and update it with design changes.
- **Examples:**
  - TLA+: spec plus TLC or Apalache model checking
  - Alloy: relational model with Alloy Analyzer
  - P language: model of communicating state machines
  - Promela/SPIN: protocol models
  - Any stack: a check recipe in the task runner (just model-check)
- **Done when:** The model checks with zero invariant violations at documented bounds; the model file and check command are in the repo.
- **Evidence:** Model files; checker output

### B24 · Verified implementation language

- **Category:** Formal Methods
- **Tier:** advanced
- **Effort:** L
- **Applies when:** small critical components where you can write the code in a verification-aware language
- **Why it matters:** Instead of proving a model and hoping the code matches, write the component in a language that verifies the code itself against its spec.
- **How to do it:** Implement the critical component with pre- and postconditions and invariants in a verification-aware language, verify it, and compile or transpile it into the main stack.
- **Examples:**
  - Dafny: verify, then compile to C#, Java, Go, Python or JS
  - Verus: verified Rust
  - F*: verified code extracted to C or OCaml
  - SPARK: verified Ada
  - Why3: verified OCaml or C via plugins
  - Liquid Haskell: refinement types
- **Done when:** The verifier reports success with no assumed or skipped obligations, and the verified component is the one shipped.
- **Evidence:** Verified source; verifier output

### B25 · Bounded model checking of real code

- **Category:** Formal Methods
- **Tier:** advanced
- **Effort:** M
- **Applies when:** only native or systems code (Rust, C, C++)
- **Why it matters:** Checks the actual source, not a model, for all inputs up to a bound: overflows, out-of-bounds, panics and user assertions.
- **How to do it:** Write proof harnesses for core functions with symbolic inputs and assertions. Run the checker at documented bounds. Keep harnesses in the repo.
- **Examples:**
  - Rust: Kani (cargo kani) proof harnesses
  - C: CBMC with __CPROVER assumptions; ESBMC
  - C: Frama-C WP with ACSL contracts
  - C++: ESBMC or CBMC for subsets
  - Go: Gobra (verifier) for annotated code
  - Java: JBMC; KeY
- **Done when:** Every harness verifies successfully at the stated bound; unwinding assertions pass so the bound is honest.
- **Evidence:** Harness files; checker output

### B26 · Honest benchmarks

- **Category:** Performance Evidence
- **Tier:** core
- **Effort:** M
- **Applies when:** only when making any speed, memory or efficiency claim
- **Why it matters:** Speed claims are the most commonly inflated. Honest benchmarks report spread, hardware and correctness, and include losses.
- **How to do it:** Use warmup and repeated fresh runs; report median plus spread (IQR or min-max) and the run count; name the hardware, OS, compiler and flags; verify output correctness (checksum) during the timed runs; compare against a fair baseline; publish raw data and the command; include the cases where you lose.
- **Examples:**
  - Python: pyperf or pytest-benchmark
  - JS/TS: tinybench or mitata
  - Rust: criterion or divan
  - Go: go test -bench -count=10 then benchstat
  - Ruby: benchmark-ips with checksums asserted
  - C/C++: Google Benchmark or hyperfine
  - Java: JMH
  - Any CLI: hyperfine --warmup 3 --runs 10 --export-json
- **Done when:** The benchmark doc shows median and spread over at least 5 runs, hardware and toolchain, a correctness check per run, the exact command, and raw data files.
- **Evidence:** docs/benchmarks.md; raw JSON or CSV; hardware info

### B27 · Performance tracking over time, report-only

- **Category:** Performance Evidence
- **Tier:** advanced
- **Effort:** M
- **Applies when:** performance-sensitive projects
- **Why it matters:** Slowdowns creep in one commit at a time. Tracking numbers over history shows exactly when and where, without blocking anyone.
- **How to do it:** Run a small benchmark suite in CI on a schedule or on push, store results with the commit hash, and chart them. Alert as information only; never gate.
- **Examples:**
  - GitHub Actions: benchmark-action/github-action-benchmark with fail-on-alert false
  - Python: asv (airspeed velocity)
  - Rust: criterion baselines saved per commit
  - Go: benchstat against the previous main
  - Java: JMH results archived per commit
  - Any stack: append to bench-history.csv with commit, date, median
- **Done when:** A history file or dashboard shows benchmark results for at least the last several commits or releases, keyed by commit hash.
- **Evidence:** Benchmark history file or chart

### B28 · Controls and multiple seeds

- **Category:** Statistical Evidence
- **Tier:** core
- **Effort:** M
- **Applies when:** only experimental, stochastic, simulation, ML or A/B claims
- **Why it matters:** A result from one run with no control is an anecdote. A control arm plus many seeds separates the effect from luck.
- **How to do it:** Define the treatment and a control that differs only in the factor under test (e.g. selection vs random drift, new model vs baseline). Run each across many seeds (at least 5, ideally 10 to 30). Report per-seed results, not only averages.
- **Examples:**
  - Python: loop over seeds, save per-seed CSV
  - R or Python: tidy per-seed results table
  - Rust/Go/C++: CLI flag --seed and a script sweeping seeds
  - Ruby: --control mode running both arms per seed
  - JS/TS: A/B harness with fixed seed lists
- **Done when:** Results include a control arm and at least 5 seeds per arm, with per-seed raw data committed.
- **Evidence:** Per-seed results file; experiment script

### B29 · Significance testing

- **Category:** Statistical Evidence
- **Tier:** core
- **Effort:** S
- **Applies when:** only experimental or comparative claims
- **Why it matters:** Differences between arms can be noise. A proper test says how surprising the difference would be if there were no real effect.
- **How to do it:** Choose the test before looking at results. Prefer assumption-light tests: exact or Monte Carlo permutation tests, Mann-Whitney U, Wilcoxon signed-rank for paired designs. Report the test, the statistic, the p-value and the sample sizes.
- **Examples:**
  - Python: scipy.stats.permutation_test, mannwhitneyu
  - R: coin::oneway_test, wilcox.test
  - JS/TS: a small permutation-test function with seeded RNG
  - Rust/Go/Ruby/Java: implement a permutation test over per-seed results; verify against scipy on a fixture
- **Done when:** Each comparative claim states the test used, the sample sizes and the p-value, and the analysis script reproduces them.
- **Evidence:** Analysis script; stats output

### B30 · Effect sizes and confidence intervals

- **Category:** Statistical Evidence
- **Tier:** core
- **Effort:** S
- **Applies when:** only experimental or comparative claims
- **Why it matters:** A tiny p-value can hide a trivial effect. Effect sizes with bootstrap confidence intervals say how big the difference is and how sure you are.
- **How to do it:** Report an effect size (difference in medians or means, Cohen's d, Cliff's delta, relative improvement) with a 95% bootstrap confidence interval (at least 10,000 resamples, seeded).
- **Examples:**
  - Python: scipy.stats.bootstrap
  - R: boot package
  - JS/TS: seeded bootstrap function
  - Rust/Go/Ruby/Java/C++: percentile or BCa bootstrap over per-seed results
- **Done when:** Every comparative claim reports an effect size with a 95% CI, and the CI computation is in the analysis script with a fixed seed.
- **Evidence:** Effect size table with CIs

### B31 · Multiple-comparison correction

- **Category:** Statistical Evidence
- **Tier:** recommended
- **Effort:** S
- **Applies when:** only when testing more than one metric, arm or hypothesis
- **Why it matters:** Test 20 metrics and one will be 'significant' by luck. Correction keeps the false-positive rate honest.
- **How to do it:** When reporting several tests, adjust p-values with Holm-Bonferroni (family-wise) or Benjamini-Hochberg (false discovery rate), state which, and report adjusted values.
- **Examples:**
  - Python: statsmodels.stats.multitest.multipletests(method='holm')
  - R: p.adjust(p, method='holm')
  - Any stack: implement Holm in a few lines and test it against a known fixture
- **Done when:** When more than one test is reported, adjusted p-values and the correction method are shown.
- **Evidence:** Adjusted p-value table

### B32 · Pre-registration of hypotheses

- **Category:** Statistical Evidence
- **Tier:** advanced
- **Effort:** S
- **Applies when:** only experimental claims
- **Why it matters:** Deciding the hypothesis, metric and test after seeing data lets you find whatever you want. Writing them down first prevents fooling yourself.
- **How to do it:** Before running the experiment, commit PREREGISTRATION.md with hypotheses, primary and secondary metrics, arms, seeds, sample size, test, correction and the stopping rule. Results reference that commit; deviations are listed.
- **Examples:**
  - Any stack: PREREGISTRATION.md committed before the run, referenced by hash in results
  - Optional: OSF preregistration for formal research
- **Done when:** A preregistration file exists with a commit earlier than the results commit, and results list any deviations from it.
- **Evidence:** PREREGISTRATION.md; git log timestamps

### B33 · ML evaluation on held-out data

- **Category:** AI & ML Evidence
- **Tier:** core
- **Effort:** M
- **Applies when:** only projects that train, fine-tune or select ML models
- **Why it matters:** A model scored on data it has seen proves nothing. Clean held-out evaluation with leakage checks is the minimum for any ML claim.
- **How to do it:** Split train, validation and test before any modeling and freeze the test set (hash it). Check for leakage (duplicates, time leakage, group leakage). Report metrics with confidence intervals and a simple baseline. Evaluate the test set once per final model.
- **Examples:**
  - Python: scikit-learn GroupKFold; datasets with fixed splits; dedup with hashing
  - Hugging Face: lighteval or inspect-ai on held-out sets
  - JS/TS: tfjs evaluation on frozen split files
  - Rust: linfa with fixed splits
  - Any stack: test-set SHA-256 recorded in CLAIMS.md
- **Done when:** Test-set hash is recorded, a leakage check script passes, and reported metrics include a baseline and confidence intervals.
- **Evidence:** Split files and hashes; eval report

### B34 · AI hallucination and regression evals

- **Category:** AI & ML Evidence
- **Tier:** core
- **Effort:** M
- **Applies when:** only projects that call or ship generative AI
- **Why it matters:** LLM features fail silently: invented facts, broken formats, prompt-injection, and quality drops after a model or prompt change.
- **How to do it:** Maintain an eval set covering correct answers, refusal cases, grounding (answers must cite provided sources), format validity, prompt-injection attempts and past failures. Score with deterministic checks first and model-graded checks second (with a pinned grader). Run on every model or prompt change and record scores over time.
- **Examples:**
  - Python: inspect-ai, promptfoo, deepeval, ragas for RAG grounding
  - JS/TS: promptfoo, evalite
  - Any stack: JSONL eval cases plus a scorer script; results appended to evals/history.csv
  - Any stack: injection cases from a red-team prompt list
- **Done when:** An eval command produces a score file; scores for the current model and prompt version are recorded and compared to the previous version; every past AI failure is an eval case.
- **Evidence:** evals/ cases; score history

### B35 · Security scanning, report-only, with optional SBOM

- **Category:** Security & Supply Chain
- **Tier:** recommended
- **Effort:** S
- **Applies when:** always; SBOM only for distributed binaries or when a downstream user asks
- **Why it matters:** Known-vulnerable dependencies, leaked secrets and obvious injection patterns are cheap to find, and an SBOM lists exactly what ships. Under this standard scanners inform and never block pushes.
- **How to do it:** Run a dependency vulnerability scan, a secret scan of history and a basic SAST pass via the task runner and scheduled or informational CI, and triage findings with the ten finding classes. Optionally generate a CycloneDX or SPDX SBOM at release time and attach it to the release.
- **Examples:**
  - Python: pip-audit, bandit, cyclonedx-py
  - JS/TS: npm audit or pnpm audit; npm sbom --sbom-format cyclonedx
  - Rust: cargo audit; cargo cyclonedx
  - Go: govulncheck; cyclonedx-gomod
  - Ruby: bundler-audit, brakeman for Rails
  - C/C++: osv-scanner, flawfinder
  - Java: OWASP dependency-check; cyclonedx-maven-plugin
  - Any stack: gitleaks, semgrep, syft (all report-only)
- **Done when:** A scan report exists for the latest release with each finding triaged as fixed, accepted with reason, or not applicable; if an SBOM is produced it is attached to the release and validates against its schema.
- **Evidence:** Scan reports; triage notes; optional sbom.cdx.json

### B36 · Threat model

- **Category:** Security & Supply Chain
- **Tier:** recommended
- **Effort:** S
- **Applies when:** anything that handles untrusted input, secrets, money, personal data, network traffic or AI tool use
- **Why it matters:** You cannot defend against attacks you never listed. A one-page threat model names the assets, entry points and attackers, so tests and scans target the real risks instead of generic ones.
- **How to do it:** Write docs/threat-model.md: assets, trust boundaries and entry points (with a data-flow sketch), threats per boundary using STRIDE (or the OWASP LLM Top 10 for AI features, including prompt injection and tool abuse), the mitigation for each, and the test or check that proves it. Revisit it when the architecture changes.
- **Examples:**
  - Any stack: STRIDE table in docs/threat-model.md
  - Web apps: OWASP ASVS level 1 checklist
  - AI apps: OWASP Top 10 for LLM Applications, prompt-injection eval cases linked from B34
  - Tooling optional: OWASP Threat Dragon or pytm (threat model as code)
  - Native code: memory-safety threats linked to B15 and B16
- **Done when:** docs/threat-model.md lists assets, entry points and threats with a mitigation and a linked test or check for each, and is dated within the last major release.
- **Evidence:** docs/threat-model.md

### B37 · Release hashes and checksums

- **Category:** Provenance
- **Tier:** core
- **Effort:** S
- **Applies when:** anything released or downloaded
- **Why it matters:** A checksum lets anyone verify they got exactly the artifact you built, unmodified.
- **How to do it:** Generate SHA-256 checksums for every release artifact into SHA256SUMS, attach it to the release, and document the verify command.
- **Examples:**
  - Linux: sha256sum * > SHA256SUMS; sha256sum -c SHA256SUMS
  - macOS: shasum -a 256
  - Windows: Get-FileHash -Algorithm SHA256
  - Go: GoReleaser checksums
  - Rust: cargo-dist checksums
  - Python/JS/Ruby/Java: hashes of wheels, tarballs, gems, jars
- **Done when:** Every release artifact has a SHA-256 entry, and the documented verify command succeeds on downloaded artifacts.
- **Evidence:** SHA256SUMS

### B38 · Build provenance and attestations

- **Category:** Provenance
- **Tier:** recommended
- **Effort:** S
- **Applies when:** released artifacts and published results
- **Why it matters:** Proves which commit and which CI run produced an artifact, so nobody has to trust that the binary or result came from the code shown.
- **How to do it:** Build releases in CI and generate signed provenance attestations for artifacts (this signs artifacts after the push; it does not require signed commits and never gates pushes). GitHub artifact attestations need a public repo (private repos need GitHub Enterprise Cloud), so let the step fail softly elsewhere. Document how to verify.
- **Examples:**
  - GitHub: actions/attest-build-provenance, verify with gh attestation verify
  - SLSA: slsa-github-generator
  - Python: PyPI trusted publishing with attestations
  - JS/TS: npm publish --provenance
  - Containers: cosign attest
  - Rust/Go/Java/C++: attest the binaries built in CI
- **Done when:** gh attestation verify (or equivalent) succeeds for the latest release artifact against the repo.
- **Evidence:** Attestation; verification output

### B39 · Data checksums and dataset versioning

- **Category:** Provenance
- **Tier:** recommended
- **Effort:** S
- **Applies when:** projects that use or publish datasets, benchmark data or experiment results
- **Why it matters:** Results depend on data. If the data silently changes, results become unverifiable. Hashes and versions pin exactly which data produced which numbers.
- **How to do it:** Record SHA-256 hashes of every input dataset and every published result file in a manifest. Version large data with a data tool or external storage plus manifest. Check hashes before use.
- **Examples:**
  - Any stack: data/MANIFEST.sha256 checked by just verify-data
  - Python: DVC; Hugging Face dataset revisions pinned by commit
  - JS/TS: hash check script before loading
  - Rust/Go/Ruby/Java/C++: verify hash at load time and fail with a clear error
- **Done when:** A data manifest lists every input and result file with its hash, and the verify command passes.
- **Evidence:** Data manifest; verify output

### B40 · Audit trail

- **Category:** Provenance
- **Tier:** recommended
- **Effort:** S
- **Applies when:** always
- **Why it matters:** When someone asks how a number or decision came to be, an append-only record answers it. For AI-built projects this includes which agent did what.
- **How to do it:** Keep commits small and descriptive, and keep runs/ or docs/run-log.md recording each experiment and benchmark run: date, commit, command, environment, results file, and which human or agent ran it. Never rewrite past entries; add corrections as new entries.
- **Examples:**
  - Any stack: docs/run-log.md appended by the reproduce and bench recipes
  - Python: MLflow or plain JSONL run records
  - Any stack: git notes or tags pointing to result files
  - AI-built repos: Co-authored-by trailers or a log line naming the agent and model
- **Done when:** Every published result maps to a run-log entry with commit hash, command and environment.
- **Evidence:** docs/run-log.md or runs/*.jsonl

### B41 · Limitations and real-vs-metaphor

- **Category:** Honesty
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Overclaiming is the fastest way to lose credibility. Stating what is untested, approximate or metaphorical makes everything else believable.
- **How to do it:** Add a Limitations section to the README: what is not tested, which platforms are untested, sample-size caveats, known bugs, and a table separating literal claims from metaphors or marketing language. Record corrections to past claims openly.
- **Examples:**
  - All stacks: README Limitations section plus docs/limitations.md for detail
  - Research projects: threats-to-validity section
  - AI projects: model card style known-failure list
- **Done when:** README has a Limitations section listing at least the untested platforms, sample-size caveats and any metaphorical language; past corrections are recorded in the CHANGELOG.
- **Evidence:** README Limitations section

### B42 · What would prove us wrong

- **Category:** Honesty
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Stating in advance which observations would falsify each main claim is what separates a testable claim from BS.
- **How to do it:** For each headline claim, write the specific observation that would refute it and how someone could look for it. Link these from CLAIMS.md.
- **Examples:**
  - All stacks: FALSIFICATION.md or a column in CLAIMS.md: 'refuted if C backend checksum differs from Ruby on any seed'
  - Performance: 'refuted if median speedup < 1.2x on documented hardware'
  - ML/AI: 'refuted if held-out accuracy CI includes the baseline'
- **Done when:** Every headline claim has a written refutation condition and a way for a third party to test it.
- **Evidence:** FALSIFICATION.md or CLAIMS.md column

### B43 · Replication protocol

- **Category:** Replication & Review
- **Tier:** core
- **Effort:** S
- **Applies when:** always
- **Why it matters:** Independent replication is only possible if the steps, environment and expected results are written down precisely.
- **How to do it:** Write REPLICATION.md: hardware and OS requirements, exact setup commands, the reproduce command, expected outputs with tolerances, expected runtime, how to compare results, and how to report a replication (issue form).
- **Examples:**
  - All stacks: REPLICATION.md plus just reproduce
  - Any stack: a Dockerfile or devcontainer for an exact environment
  - Research: an issue form 'Replication report'
- **Done when:** Following REPLICATION.md on a second machine reproduces the headline results within the stated tolerances.
- **Evidence:** REPLICATION.md; second-machine run log

### B44 · Independent replication

- **Category:** Replication & Review
- **Tier:** advanced
- **Effort:** M
- **Applies when:** projects making public performance, scientific or AI claims
- **Why it matters:** The strongest evidence is someone else getting the same result on their own hardware without your help.
- **How to do it:** Ask a third party (a person or an independent agent run in a fresh environment with no shared state) to follow REPLICATION.md. Record their environment, outcome and any differences, and cite it in the README, including failed replications.
- **Examples:**
  - Any stack: replication reports as GitHub issues labeled replication
  - Research: Papers with Code or ReScience-style reports
  - AI-built repos: a fresh agent session in a clean container following only REPLICATION.md
- **Done when:** At least one replication report from a different machine and operator is linked from the README with its outcome.
- **Evidence:** Replication report links

### B45 · Peer and red-team review

- **Category:** Replication & Review
- **Tier:** recommended
- **Effort:** S
- **Applies when:** always; deeper for security, AI and public claims
- **Why it matters:** Authors miss their own blind spots. An adversarial review tries to break the claims, the code and the security, and records what it found.
- **How to do it:** Ask a reviewer (a person or a separate LLM session instructed to attack, not to praise) to try to refute each claim, find bugs and attack inputs. Record findings classified as bug, error, issue, problem, concern, dilemma, conflict, gap, hole or blindspot, and their resolution, in docs/reviews/. Reviews never gate commits or pushes.
- **Examples:**
  - Any stack: docs/reviews/2026-11-22-redteam.md with classified findings
  - AI projects: prompt-injection and jailbreak attempts against the feature
  - Security: a threat-model pass (STRIDE) on the architecture doc
  - Research: an external reader checks the statistics
- **Done when:** At least one review record exists for the latest major release, every finding is classified with exactly one finding class, and each has a resolution.
- **Evidence:** docs/reviews/*.md
