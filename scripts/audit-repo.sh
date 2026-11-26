#!/usr/bin/env bash
# Score any repository against the Build Standard for LLMs (90 items). Report-only: always exits 0 unless misused.
# Zero dependencies: bash 3.2+, grep, find, git (optional). Reads scripts/audit-checks.tsv and the repo's repo.yaml.
# Usage: audit-repo.sh [REPO_DIR] [--json FILE] [--markdown FILE] [--quiet]
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TSV="$SCRIPT_DIR/audit-checks.tsv"
REPO="."; JSON=""; MD=""; QUIET=0
while [ $# -gt 0 ]; do
  case "$1" in
    --json) JSON="$2"; shift 2 ;;
    --markdown) MD="$2"; shift 2 ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) REPO="$1"; shift ;;
  esac
done
[ -f "$TSV" ] || { echo "audit: missing $TSV" >&2; exit 2; }
[ -d "$REPO" ] || { echo "audit: no such directory: $REPO" >&2; exit 2; }
case "$JSON" in ""|/*) ;; *) JSON="$PWD/$JSON" ;; esac
case "$MD" in ""|/*) ;; *) MD="$PWD/$MD" ;; esac
cd "$REPO" || exit 2
LC_ALL=C; export LC_ALL

TMP="$(mktemp -d 2>/dev/null || mktemp -d -t audit)"
trap 'rm -rf "$TMP"' EXIT
FILES="$TMP/files"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git ls-files -co --exclude-standard > "$FILES"
else
  find . -type f -not -path './.git/*' | sed 's#^\./##' > "$FILES"
fi
# Files shipped by the template as generic plumbing, or that quote check patterns, are not evidence for code checks.
SKIP_RE='^(docs/|scripts/(audit-repo\.sh|Audit-Repo\.ps1|audit-checks\.tsv|new-repo\.sh|New-Repo\.ps1|dev\.sh)$|\.github/workflows/(ci|template-init)\.yml$|\.github/labels\.tsv$|repo\.yaml$|repo-standard\.schema\.json$|LICENSE|CITATION\.cff$|llms(-full)?\.txt$|\.gitignore$|\.gitattributes$|\.editorconfig$|\.env\.example$)|\.md$'
grep -Ev "$SKIP_RE" "$FILES" > "$TMP/code" || true

# ---------- repo.yaml ----------
yaml_flag() { [ -f repo.yaml ] && grep -E "^  $1: *(true|false|auto)" repo.yaml | head -n1 | sed -E "s/^  $1: *(true|false|auto).*/\1/"; }
yaml_status() { [ -f repo.yaml ] && grep -E "^  $1: *\{ *status: *[a-z/]+" repo.yaml | head -n1 | sed -E "s/^  $1: *\{ *status: *([a-z/]+).*/\1/"; }

has_file() { local p; local IFS='|'; for p in $1; do compgen -G "$p" >/dev/null 2>&1 && return 0; done; return 1; }
first_files() { local p f; local IFS='|'; for p in $1; do for f in $p; do [ -e "$f" ] && printf '%s\n' "$f"; done; done; }
code_grep() { [ -s "$TMP/code" ] || return 1; tr '\n' '\0' < "$TMP/code" | xargs -0 grep -EIil -- "$1" 2>/dev/null | head -n1 | grep -q .; }

MANIFEST_RE='^(package\.json|pyproject\.toml|setup\.py|Cargo\.toml|go\.mod|Gemfile|[^/]*\.gemspec|pom\.xml|build\.gradle(\.kts)?|CMakeLists\.txt|meson\.build|vcpkg\.json|conanfile\.(txt|py)|[^/]*\.(csproj|fsproj|sln)|Package\.swift|composer\.json|mix\.exs)$'
detect_flag() {
  case "$1" in
    package) grep -Eq "$MANIFEST_RE" "$FILES" ;;
    ui|visual) grep -Ev '^(docs|examples)/' "$FILES" | grep -Eqi '\.(tsx|jsx|vue|svelte|html|xaml|swift|kt|dart)$' ;;
    native) grep -Eqi '\.(c|cc|cpp|cxx|h|hpp|hh|s|asm)$' "$FILES" ;;
    ai) code_grep '(openai|anthropic|@ai-sdk|langchain|llama_index|llama-index|google-genai|generativeai|xai-sdk|ollama|transformers)' ;;
    *) return 1 ;;
  esac
}
flag_on() {
  [ "$1" = always ] && return 0
  local v; v="$(yaml_flag "$1")"
  [ -z "$v" ] && v="$(grep -E "^#flag	$1	" "$TSV" | cut -f3)"
  case "$v" in true) return 0 ;; false) return 1 ;; *) detect_flag "$1" ;; esac
}

# ---------- builtins: set R (pass|fail|na) and D (detail) ----------
builtin_check() {
  R=fail; D=""
  case "$1" in
    version_consistent)
      if [ ! -f VERSION ]; then D="no VERSION file"; return; fi
      local v; v="$(tr -d '[:space:]' < VERSION)"
      if ! grep -Eq "^## \[?v?$v\]?" CHANGELOG.md 2>/dev/null; then D="CHANGELOG.md has no section for $v"; return; fi
      if [ -f CITATION.cff ] && ! grep -Eq "^version: *\"?$v\"?" CITATION.cff; then D="CITATION.cff version differs from $v"; return; fi
      R=pass; D="VERSION $v matches CHANGELOG and CITATION" ;;
    tests_exist)
      if grep -Eqi '(^|/)(tests?|spec|__tests__|testdata)/|_test\.(go|py|rb|c|cc|cpp|exs)$|(^|/)test_[^/]*\.py$|\.(test|spec)\.[cm]?[jt]sx?$|_spec\.rb$|Tests?\.(java|kt|cs|fs|swift)$' "$FILES"; then R=pass; D="test files found"; else D="no test files found"; fi ;;
    ci_on_push)
      if compgen -G '.github/workflows/*.y*ml' >/dev/null && grep -Eqi '^ *push:|on: *\[?[^#]*push' .github/workflows/*.y*ml; then R=pass; D="workflow runs on push"
      elif has_file '.gitlab-ci.yml|.circleci/config.yml|azure-pipelines.yml|.woodpecker.yml'; then R=pass; D="non-GitHub CI config found"
      else D="no CI workflow that runs on push"; fi ;;
    issue_forms)
      if compgen -G '.github/ISSUE_TEMPLATE/*.y*ml' >/dev/null || compgen -G '.github/ISSUE_TEMPLATE/*.md' >/dev/null; then
        if has_file '.github/pull_request_template.md|.github/PULL_REQUEST_TEMPLATE.md|.github/PULL_REQUEST_TEMPLATE|PULL_REQUEST_TEMPLATE.md|docs/pull_request_template.md'; then D="issue forms present but a PR template exists (banned by R4)"; else R=pass; D="issue forms present, no PR template"; fi
      else D="no .github/ISSUE_TEMPLATE forms"; fi ;;
    git_identity)
      if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then R=na; D="not a git repository"; return; fi
      local br; br="$(git symbolic-ref --short HEAD 2>/dev/null)"
      if [ "$br" != main ]; then D="current branch is '$br', not main"; return; fi
      if ! git rev-parse HEAD >/dev/null 2>&1; then D="no commits yet"; return; fi
      if git log --format='%ae %ce' | grep -Eqi '(example\.(com|org)|placeholder|localhost|invalid|@users\.noreply\.github\.com.*bot|^ *$)'; then D="placeholder, example or bot email in history"; return; fi
      R=pass; D="on main; author identities look real" ;;
    hygiene)
      local big=""; local f
      while IFS= read -r f; do
        [ -f "$f" ] || continue
        if [ "$(wc -c < "$f" | tr -d ' ')" -gt 5242880 ]; then big="$f"; break; fi
      done < "$FILES"
      if [ -n "$big" ]; then D="file over 5 MB: $big"; return; fi
      if grep -Eq '(^|/)(node_modules|target|__pycache__|\.venv|venv|\.next|coverage)/|(^|/)\.env$' "$FILES"; then D="build output, dependencies or .env tracked"; return; fi
      if grep -Ev '^scripts/(audit-repo\.sh|Audit-Repo\.ps1)$' "$FILES" | tr '\n' '\0' | xargs -0 grep -EIl -- 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{32,}|xox[baprs]-[A-Za-z0-9-]{10,}' 2>/dev/null | head -n1 | grep -q .; then D="possible secret found (run gitleaks for detail)"; return; fi
      R=pass; D="no big files, build output, .env or obvious secrets" ;;
    manifest)
      if grep -Eq "$MANIFEST_RE" "$FILES"; then R=pass; D="package manifest found"; else D="no package manifest"; fi ;;
    agents)
      if [ ! -f AGENTS.md ]; then D="no AGENTS.md"; return; fi
      if [ "$(wc -c < AGENTS.md | tr -d ' ')" -ge 32768 ]; then D="AGENTS.md is 32 KiB or more (Codex default cap)"; return; fi
      if [ -f CLAUDE.md ] && ! grep -q '@AGENTS.md' CLAUDE.md; then D="CLAUDE.md does not import @AGENTS.md"; return; fi
      if [ -f GEMINI.md ] && ! grep -q 'AGENTS.md' GEMINI.md; then D="GEMINI.md does not point to AGENTS.md"; return; fi
      if [ -f .github/copilot-instructions.md ]; then D=".github/copilot-instructions.md present (not wanted)"; return; fi
      if ! has_file 'llms.txt'; then D="no llms.txt"; return; fi
      R=pass; D="AGENTS.md canonical; pointers consistent; llms.txt present" ;;
    lockfile)
      if ! grep -Eq "$MANIFEST_RE" "$FILES"; then R=na; D="no package manifest, nothing to lock"; return; fi
      if grep -Eq '(^|/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|uv\.lock|poetry\.lock|Pipfile\.lock|pdm\.lock|requirements[^/]*\.txt|Cargo\.lock|go\.sum|Gemfile\.lock|gradle\.lockfile|packages\.lock\.json|conan\.lock|vcpkg-configuration\.json|composer\.lock|mix\.lock|Package\.resolved)$' "$FILES"; then R=pass; D="lockfile found"; else D="manifest without a lockfile"; fi ;;
    limitations)
      if [ -f LIMITATIONS.md ] || grep -Eqi '^#+ *limitations' README.md 2>/dev/null; then R=pass; D="limitations documented"; else D="no LIMITATIONS.md or README Limitations section"; fi ;;
    *) R=na; D="unknown builtin $1" ;;
  esac
}

# ---------- run checks ----------
OUT="$TMP/results"; : > "$OUT"
while IFS='	' read -r id tier applies check name; do
  case "$id" in ''|\#*) continue ;; esac
  res=""; src=auto; det=""; matched=""
  declared="$(yaml_status "$id")"
  if [ "$declared" = "n/a" ]; then res=na; src=declared; det="declared n/a in repo.yaml"
  elif ! flag_on "$applies"; then res=na; det="not applicable (flag '$applies' is off)"
  else
    type="${check%%:*}"; arg="${check#*:}"
    case "$type" in
      file) if has_file "$arg"; then res=pass; matched="$(first_files "$arg")"; det="found: $(echo "$matched" | head -n1)"; else res=fail; det="missing: $arg"; fi ;;
      all) ok=1; miss=""; OLDIFS="$IFS"; IFS='&'; for p in $arg; do if has_file "$p"; then matched="$matched$(first_files "$p")
"; else ok=0; miss="$miss $p"; fi; done; IFS="$OLDIFS"
           if [ $ok = 1 ]; then res=pass; det="found: ${arg//&/, }"; else res=fail; det="missing:$miss"; fi ;;
      dir) res=fail; det="missing directory: $arg"; OLDIFS="$IFS"; IFS='|'; for p in $arg; do if [ -d "$p" ] && [ -n "$(ls -A "$p" 2>/dev/null)" ]; then res=pass; det="found: $p/"; break; fi; done; IFS="$OLDIFS" ;;
      grep) g="${arg%%:*}"; re="${arg#*:}"; res=fail; det="no match for /$re/ in $g"
            for f in $g; do [ -f "$f" ] || continue; if grep -Eqi -- "$re" "$f"; then res=pass; matched="$f"; det="matched in $f"; break; fi; done ;;
      code) if code_grep "$arg"; then res=pass; det="evidence found in code or config"; else res=fail; det="no code or config matches /$arg/"; fi ;;
      builtin) builtin_check "$arg"; res="$R"; det="$D" ;;
      manual)
        case "$declared" in
          done) res=pass; src=declared; det="declared done in repo.yaml" ;;
          partial) res=partial; src=declared; det="declared partial in repo.yaml" ;;
          todo) res=fail; src=declared; det="declared todo in repo.yaml" ;;
          *) res=unknown; src=none; det="manual item: set its status in repo.yaml" ;;
        esac ;;
    esac
    if [ "$res" = pass ] && [ -n "$matched" ]; then
      while IFS= read -r m; do [ -n "$m" ] && [ -f "$m" ] && grep -q 'TODO(fill)' "$m" && { res=partial; det="$det (still has TODO(fill) markers)"; break; }; done <<< "$matched"
    fi
    if [ "$src" = auto ] && [ "$res" = fail ] && [ "$declared" = "done" ]; then det="$det; declared done but not detected"; fi
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$id" "$tier" "$res" "$src" "$applies" "$name" "$det" >> "$OUT"
done < "$TSV"

count() { awk -F'\t' -v r="$1" -v t="${2:-}" '$3==r && (t=="" || $2==t)' "$OUT" | wc -l | tr -d ' '; }
P=$(count pass); PA=$(count partial); F=$(count fail); NA=$(count na); U=$(count unknown)
CP=$(count pass core); CPA=$(count partial core); CF=$(count fail core)
CHK=$((P + PA + F)); CCHK=$((CP + CPA + CF))
pct() { if [ "$2" -gt 0 ]; then awk -v a="$1" -v b="$2" 'BEGIN{printf "%.1f", 100*a/b}'; else echo "0.0"; fi; }
STRUCT=$(pct $((P + PA)) $CHK); COMPLETE=$(pct "$P" $CHK); CORE=$(pct "$CP" $CCHK)
VERSION_STD="$(head -n1 "$TSV" | sed -E 's/.*Standard v([0-9.]+).*/\1/')"
PH="$(grep -Ev '^(scripts/(audit-repo\.sh|Audit-Repo\.ps1|new-repo\.sh|New-Repo\.ps1)|\.github/workflows/.*)$' "$FILES" | tr '\n' '\0' | xargs -0 grep -EIl '\{\{(PROJECT_NAME|DESCRIPTION|OWNER|YEAR|DATE)\}\}' 2>/dev/null | wc -l | tr -d ' ')"
REPONAME="$(basename "$(pwd)")"

if [ $QUIET = 0 ]; then
  echo "Build Standard v$VERSION_STD audit: $REPONAME"
  echo "================================================================"
  awk -F'\t' '{ m=($3=="pass")?"PASS":($3=="partial")?"PART":($3=="fail")?"FAIL":($3=="na")?" n/a":"  ? "; printf "%s  %s  %-11s %-52.52s %s\n", m, $1, $2, $6, $7 }' "$OUT"
  echo "================================================================"
  echo "Applicable and checked: $CHK   pass $P   partial $PA   fail $F   n/a $NA   unknown (manual, no status) $U"
  echo "Structure score (artifact present):   $STRUCT%  ($((P + PA))/$CHK)"
  echo "Completion score (present and filled): $COMPLETE%  ($P/$CHK)"
  echo "Core items complete:                   $CORE%  ($CP/$CCHK)"
  [ "$PH" -gt 0 ] && echo "Warning: $PH file(s) still contain {{PLACEHOLDERS}}."
fi

jesc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
if [ -n "$JSON" ]; then
  {
    printf '{\n  "standard_version": "%s",\n  "repo": "%s",\n' "$VERSION_STD" "$(jesc "$REPONAME")"
    printf '  "score": {"structure_percent": %s, "completion_percent": %s, "core_completion_percent": %s, "checked": %s, "core_checked": %s},\n' "$STRUCT" "$COMPLETE" "$CORE" "$CHK" "$CCHK"
    printf '  "counts": {"pass": %s, "partial": %s, "fail": %s, "na": %s, "unknown": %s},\n' "$P" "$PA" "$F" "$NA" "$U"
    printf '  "placeholder_files": %s,\n  "items": [\n' "$PH"
    n=0; total=$(wc -l < "$OUT" | tr -d ' ')
    while IFS='	' read -r id tier res src applies name det; do
      n=$((n + 1)); sep=","; [ $n -eq "$total" ] && sep=""
      printf '    {"id": "%s", "tier": "%s", "result": "%s", "source": "%s", "applies": "%s", "name": "%s", "detail": "%s"}%s\n' \
        "$id" "$tier" "$res" "$src" "$applies" "$(jesc "$name")" "$(jesc "$det")" "$sep"
    done < "$OUT"
    printf '  ]\n}\n'
  } > "$JSON"
  [ $QUIET = 0 ] && echo "JSON report: $JSON"
fi
if [ -n "$MD" ]; then
  {
    echo "## Build Standard v$VERSION_STD audit"
    echo
    echo "Structure **$STRUCT%** · Completion **$COMPLETE%** · Core complete **$CORE%** · pass $P, partial $PA, fail $F, n/a $NA, unknown $U"
    echo
    echo "| Result | ID | Tier | Item | Detail |"
    echo "|---|---|---|---|---|"
    awk -F'\t' 'function esc(s,  o, i, c) { o = ""; for (i = 1; i <= length(s); i++) { c = substr(s, i, 1); o = o (c == "|" ? "\\|" : c) } return o } $3!="na" { printf "| %s | %s | %s | %s | %s |\n", $3, $1, $2, esc($6), esc($7) }' "$OUT"
  } >> "$MD"
fi
exit 0
