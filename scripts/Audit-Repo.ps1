<#
.SYNOPSIS
  Score any repository against the Build Standard for LLMs (90 items). Report-only: always exits 0 unless misused.
.DESCRIPTION
  PowerShell 5.1+ or 7+, no modules. Same checks and output as audit-repo.sh (reads scripts/audit-checks.tsv and repo.yaml).
.EXAMPLE
  pwsh scripts/Audit-Repo.ps1 -Path . -Json audit.json
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Path = ".",
  [string]$Json = "",
  [string]$Markdown = "",
  [switch]$Quiet
)
$ErrorActionPreference = "Stop"
$Tsv = Join-Path $PSScriptRoot "audit-checks.tsv"
if (-not (Test-Path -LiteralPath $Tsv)) { Write-Error "audit: missing $Tsv"; exit 2 }
if (-not (Test-Path -LiteralPath $Path -PathType Container)) { Write-Error "audit: no such directory: $Path"; exit 2 }
if ($Json -and -not [System.IO.Path]::IsPathRooted($Json)) { $Json = Join-Path (Get-Location).Path $Json }
if ($Markdown -and -not [System.IO.Path]::IsPathRooted($Markdown)) { $Markdown = Join-Path (Get-Location).Path $Markdown }
Set-Location -LiteralPath $Path
$Root = (Get-Location).Path

function Test-Git { try { $null = git rev-parse --is-inside-work-tree 2>$null; return ($LASTEXITCODE -eq 0) } catch { return $false } }
$IsGit = Test-Git
if ($IsGit) { $Files = @(git ls-files -co --exclude-standard) }
else {
  $Files = @(Get-ChildItem -Recurse -File -Force | Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } |
    ForEach-Object { $_.FullName.Substring($Root.Length + 1) -replace '\\', '/' })
}
$Files = @($Files | Where-Object { $_ })
$SkipRe = '^(docs/|scripts/(audit-repo\.sh|Audit-Repo\.ps1|audit-checks\.tsv|new-repo\.sh|New-Repo\.ps1|dev\.sh)$|\.github/workflows/(ci|template-init)\.yml$|\.github/labels\.tsv$|repo\.yaml$|repo-standard\.schema\.json$|LICENSE|CITATION\.cff$|llms(-full)?\.txt$|\.gitignore$|\.gitattributes$|\.editorconfig$|\.env\.example$)|\.md$'
$CodeFiles = @($Files | Where-Object { $_ -cnotmatch $SkipRe })
$ManifestRe = '^(package\.json|pyproject\.toml|setup\.py|Cargo\.toml|go\.mod|Gemfile|[^/]*\.gemspec|pom\.xml|build\.gradle(\.kts)?|CMakeLists\.txt|meson\.build|vcpkg\.json|conanfile\.(txt|py)|[^/]*\.(csproj|fsproj|sln)|Package\.swift|composer\.json|mix\.exs)$'
$TsvLines = Get-Content -LiteralPath $Tsv -Encoding UTF8
$Yaml = if (Test-Path -LiteralPath "repo.yaml") { Get-Content -LiteralPath "repo.yaml" -Encoding UTF8 } else { @() }

function Get-YamlFlag([string]$n) {
  foreach ($l in $Yaml) { if ($l -cmatch "^  ${n}: *(true|false|auto)") { return $Matches[1] } }; return ""
}
function Get-YamlStatus([string]$id) {
  foreach ($l in $Yaml) { if ($l -cmatch "^  ${id}: *\{ *status: *([a-z/]+)") { return $Matches[1] } }; return ""
}
function Get-Matches([string]$alts) {
  $out = @()
  foreach ($p in $alts.Split('|')) {
    if ($p -match '[\*\?]') { $out += @(Get-ChildItem -Path $p -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }) }
    elseif (Test-Path -LiteralPath $p) { $out += (Resolve-Path -LiteralPath $p).Path }
  }
  return ,$out
}
function Test-Any([string]$alts) { return ((Get-Matches $alts).Count -gt 0) }
function Test-TextFile([string]$f) {
  $full = if ([System.IO.Path]::IsPathRooted($f)) { $f } else { Join-Path $Root $f }
  try { $fs = [System.IO.File]::OpenRead($full) } catch { return $false }
  try { $buf = New-Object byte[] 8000; $n = $fs.Read($buf, 0, 8000); for ($i = 0; $i -lt $n; $i++) { if ($buf[$i] -eq 0) { return $false } }; return $true } finally { $fs.Dispose() }
}
function Test-Grep([string]$file, [string]$re) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { return $false }
  return [bool](Select-String -LiteralPath $file -Pattern $re -Quiet -ErrorAction SilentlyContinue)
}
function Test-CodeGrep([string]$re) {
  foreach ($f in $CodeFiles) { if ((Test-Path -LiteralPath $f -PathType Leaf) -and (Test-TextFile $f) -and (Test-Grep $f $re)) { return $true } }
  return $false
}
function Test-DetectFlag([string]$n) {
  switch ($n) {
    "package" { return [bool]($Files | Where-Object { $_ -cmatch $ManifestRe }) }
    { $_ -in "ui", "visual" } { return [bool]($Files | Where-Object { $_ -cnotmatch '^(docs|examples)/' -and $_ -match '\.(tsx|jsx|vue|svelte|html|xaml|swift|kt|dart)$' }) }
    "native" { return [bool]($Files | Where-Object { $_ -match '\.(c|cc|cpp|cxx|h|hpp|hh|s|asm)$' }) }
    "ai" { return (Test-CodeGrep '(openai|anthropic|@ai-sdk|langchain|llama_index|llama-index|google-genai|generativeai|xai-sdk|ollama|transformers)') }
    default { return $false }
  }
}
$FlagDefaults = @{}
foreach ($l in $TsvLines) { if ($l.StartsWith("#flag`t")) { $c = $l.Split("`t"); $FlagDefaults[$c[1]] = $c[2] } }
function Test-FlagOn([string]$n) {
  if ($n -eq "always") { return $true }
  $v = Get-YamlFlag $n
  if (-not $v) { $v = $FlagDefaults[$n] }
  if ($v -eq "true") { return $true }; if ($v -eq "false") { return $false }
  return (Test-DetectFlag $n)
}
function Get-Size([string]$f) { return (Get-Item -LiteralPath $f -Force).Length }

function Invoke-Builtin([string]$name) {
  $R = "fail"; $D = ""
  switch ($name) {
    "version_consistent" {
      if (-not (Test-Path -LiteralPath "VERSION")) { $D = "no VERSION file"; break }
      $v = ((Get-Content -LiteralPath "VERSION" -Raw) -replace '\s', '')
      $ve = [regex]::Escape($v)
      if (-not (Test-Grep "CHANGELOG.md" "^## \[?v?$ve\]?")) { $D = "CHANGELOG.md has no section for $v"; break }
      if ((Test-Path -LiteralPath "CITATION.cff") -and -not (Test-Grep "CITATION.cff" "^version: *`"?$ve`"?")) { $D = "CITATION.cff version differs from $v"; break }
      $R = "pass"; $D = "VERSION $v matches CHANGELOG and CITATION"
    }
    "tests_exist" {
      if ($Files | Where-Object { $_ -match '(^|/)(tests?|spec|__tests__|testdata)/|_test\.(go|py|rb|c|cc|cpp|exs)$|(^|/)test_[^/]*\.py$|\.(test|spec)\.[cm]?[jt]sx?$|_spec\.rb$|Tests?\.(java|kt|cs|fs|swift)$' }) { $R = "pass"; $D = "test files found" } else { $D = "no test files found" }
    }
    "ci_on_push" {
      $wf = Get-Matches ".github/workflows/*.y*ml"
      if ($wf.Count -gt 0 -and ($wf | Where-Object { Test-Grep $_ '^ *push:|on: *\[?[^#]*push' })) { $R = "pass"; $D = "workflow runs on push" }
      elseif (Test-Any ".gitlab-ci.yml|.circleci/config.yml|azure-pipelines.yml|.woodpecker.yml") { $R = "pass"; $D = "non-GitHub CI config found" }
      else { $D = "no CI workflow that runs on push" }
    }
    "issue_forms" {
      if ((Test-Any ".github/ISSUE_TEMPLATE/*.y*ml") -or (Test-Any ".github/ISSUE_TEMPLATE/*.md")) {
        if (Test-Any ".github/pull_request_template.md|.github/PULL_REQUEST_TEMPLATE.md|.github/PULL_REQUEST_TEMPLATE|PULL_REQUEST_TEMPLATE.md|docs/pull_request_template.md") { $D = "issue forms present but a PR template exists (banned by R4)" }
        else { $R = "pass"; $D = "issue forms present, no PR template" }
      } else { $D = "no .github/ISSUE_TEMPLATE forms" }
    }
    "git_identity" {
      if (-not $IsGit) { $R = "na"; $D = "not a git repository"; break }
      $br = (git symbolic-ref --short HEAD 2>$null)
      if ($br -ne "main") { $D = "current branch is '$br', not main"; break }
      $null = git rev-parse HEAD 2>$null; if ($LASTEXITCODE -ne 0) { $D = "no commits yet"; break }
      $ids = @(git log --format='%ae %ce')
      if ($ids | Where-Object { $_ -match '(example\.(com|org)|placeholder|localhost|invalid|@users\.noreply\.github\.com.*bot|^ *$)' }) { $D = "placeholder, example or bot email in history"; break }
      $R = "pass"; $D = "on main; author identities look real"
    }
    "hygiene" {
      $big = $Files | Where-Object { (Test-Path -LiteralPath $_ -PathType Leaf) -and (Get-Size $_) -gt 5242880 } | Select-Object -First 1
      if ($big) { $D = "file over 5 MB: $big"; break }
      if ($Files | Where-Object { $_ -match '(^|/)(node_modules|target|__pycache__|\.venv|venv|\.next|coverage)/|(^|/)\.env$' }) { $D = "build output, dependencies or .env tracked"; break }
      $secretRe = 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{32,}|xox[baprs]-[A-Za-z0-9-]{10,}'
      $hit = $false
      foreach ($f in ($Files | Where-Object { $_ -cnotmatch '^scripts/(audit-repo\.sh|Audit-Repo\.ps1)$' })) {
        if ((Test-Path -LiteralPath $f -PathType Leaf) -and (Test-TextFile $f) -and (Select-String -LiteralPath $f -Pattern $secretRe -CaseSensitive -Quiet)) { $hit = $true; break }
      }
      if ($hit) { $D = "possible secret found (run gitleaks for detail)"; break }
      $R = "pass"; $D = "no big files, build output, .env or obvious secrets"
    }
    "manifest" { if ($Files | Where-Object { $_ -cmatch $ManifestRe }) { $R = "pass"; $D = "package manifest found" } else { $D = "no package manifest" } }
    "agents" {
      if (-not (Test-Path -LiteralPath "AGENTS.md")) { $D = "no AGENTS.md"; break }
      if ((Get-Size "AGENTS.md") -ge 32768) { $D = "AGENTS.md is 32 KiB or more (Codex default cap)"; break }
      if ((Test-Path -LiteralPath "CLAUDE.md") -and -not (Select-String -LiteralPath "CLAUDE.md" -SimpleMatch '@AGENTS.md' -Quiet)) { $D = "CLAUDE.md does not import @AGENTS.md"; break }
      if ((Test-Path -LiteralPath "GEMINI.md") -and -not (Select-String -LiteralPath "GEMINI.md" -SimpleMatch 'AGENTS.md' -Quiet)) { $D = "GEMINI.md does not point to AGENTS.md"; break }
      if (Test-Path -LiteralPath ".github/copilot-instructions.md") { $D = ".github/copilot-instructions.md present (not wanted)"; break }
      if (-not (Test-Path -LiteralPath "llms.txt")) { $D = "no llms.txt"; break }
      $R = "pass"; $D = "AGENTS.md canonical; pointers consistent; llms.txt present"
    }
    "lockfile" {
      if (-not ($Files | Where-Object { $_ -cmatch $ManifestRe })) { $R = "na"; $D = "no package manifest, nothing to lock"; break }
      if ($Files | Where-Object { $_ -cmatch '(^|/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|uv\.lock|poetry\.lock|Pipfile\.lock|pdm\.lock|requirements[^/]*\.txt|Cargo\.lock|go\.sum|Gemfile\.lock|gradle\.lockfile|packages\.lock\.json|conan\.lock|vcpkg-configuration\.json|composer\.lock|mix\.lock|Package\.resolved)$' }) { $R = "pass"; $D = "lockfile found" }
      else { $D = "manifest without a lockfile" }
    }
    "limitations" {
      if ((Test-Path -LiteralPath "LIMITATIONS.md") -or (Test-Grep "README.md" '^#+ *limitations')) { $R = "pass"; $D = "limitations documented" } else { $D = "no LIMITATIONS.md or README Limitations section" }
    }
    default { $R = "na"; $D = "unknown builtin $name" }
  }
  return @($R, $D)
}

$Results = New-Object System.Collections.Generic.List[object]
foreach ($line in $TsvLines) {
  if (-not $line -or $line.StartsWith("#")) { continue }
  $c = $line.Split("`t"); $id = $c[0]; $tier = $c[1]; $applies = $c[2]; $check = $c[3]; $name = $c[4]
  $res = ""; $src = "auto"; $det = ""; $matched = @()
  $declared = Get-YamlStatus $id
  if ($declared -eq "n/a") { $res = "na"; $src = "declared"; $det = "declared n/a in repo.yaml" }
  elseif (-not (Test-FlagOn $applies)) { $res = "na"; $det = "not applicable (flag '$applies' is off)" }
  else {
    $i = $check.IndexOf(':'); if ($i -ge 0) { $type = $check.Substring(0, $i); $arg = $check.Substring($i + 1) } else { $type = $check; $arg = "" }
    switch ($type) {
      "file" { $m = Get-Matches $arg; if ($m.Count -gt 0) { $res = "pass"; $matched = $m; $det = "found: " + ($m[0].Substring($Root.Length + 1) -replace '\\', '/') } else { $res = "fail"; $det = "missing: $arg" } }
      "all" {
        $ok = $true; $miss = ""
        foreach ($p in $arg.Split('&')) { $m = Get-Matches $p; if ($m.Count -gt 0) { $matched += $m } else { $ok = $false; $miss += " $p" } }
        if ($ok) { $res = "pass"; $det = "found: " + ($arg -replace '&', ', ') } else { $res = "fail"; $det = "missing:$miss" }
      }
      "dir" {
        $res = "fail"; $det = "missing directory: $arg"
        foreach ($p in $arg.Split('|')) { if ((Test-Path -LiteralPath $p -PathType Container) -and @(Get-ChildItem -LiteralPath $p -Force).Count -gt 0) { $res = "pass"; $det = "found: $p/"; break } }
      }
      "grep" {
        $j = $arg.IndexOf(':'); $g = $arg.Substring(0, $j); $re = $arg.Substring($j + 1)
        $res = "fail"; $det = "no match for /$re/ in $g"
        $cands = if ($g -match '[\*\?]') { Get-Matches $g } else { @($g) }
        foreach ($f in $cands) {
          if (Test-Grep $f $re) { $res = "pass"; $matched = @($f); $rel = if ([System.IO.Path]::IsPathRooted($f)) { $f.Substring($Root.Length + 1) -replace '\\', '/' } else { $f }; $det = "matched in $rel"; break }
        }
      }
      "code" { if (Test-CodeGrep $arg) { $res = "pass"; $det = "evidence found in code or config" } else { $res = "fail"; $det = "no code or config matches /$arg/" } }
      "builtin" { $r = Invoke-Builtin $arg; $res = $r[0]; $det = $r[1] }
      "manual" {
        switch ($declared) {
          "done" { $res = "pass"; $src = "declared"; $det = "declared done in repo.yaml" }
          "partial" { $res = "partial"; $src = "declared"; $det = "declared partial in repo.yaml" }
          "todo" { $res = "fail"; $src = "declared"; $det = "declared todo in repo.yaml" }
          default { $res = "unknown"; $src = "none"; $det = "manual item: set its status in repo.yaml" }
        }
      }
    }
    if ($res -eq "pass" -and $matched.Count -gt 0) {
      foreach ($m in $matched) { if ((Test-Path -LiteralPath $m -PathType Leaf) -and (Select-String -LiteralPath $m -SimpleMatch 'TODO(fill)' -Quiet)) { $res = "partial"; $det = "$det (still has TODO(fill) markers)"; break } }
    }
    if ($src -eq "auto" -and $res -eq "fail" -and $declared -eq "done") { $det = "$det; declared done but not detected" }
  }
  $Results.Add([pscustomobject][ordered]@{ id = $id; tier = $tier; result = $res; source = $src; applies = $applies; name = $name; detail = $det })
}

function Get-Count([string]$r, [string]$t = "") { return @($Results | Where-Object { $_.result -eq $r -and ($t -eq "" -or $_.tier -eq $t) }).Count }
function Get-Pct([int]$a, [int]$b) { if ($b -gt 0) { return [math]::Round(100.0 * $a / $b, 1, [MidpointRounding]::AwayFromZero) } else { return 0.0 } }
$P = Get-Count pass; $PA = Get-Count partial; $F = Get-Count fail; $NA = Get-Count na; $U = Get-Count unknown
$CP = Get-Count pass core; $CPA = Get-Count partial core; $CF = Get-Count fail core
$CHK = $P + $PA + $F; $CCHK = $CP + $CPA + $CF
$STRUCT = Get-Pct ($P + $PA) $CHK; $COMPLETE = Get-Pct $P $CHK; $CORE = Get-Pct $CP $CCHK
$StdVersion = ($TsvLines[0] -replace '.*Standard v([0-9.]+).*', '$1')
$phSkip = '^(scripts/(audit-repo\.sh|Audit-Repo\.ps1|new-repo\.sh|New-Repo\.ps1)|\.github/workflows/.*)$'
$PH = @($Files | Where-Object { $_ -cnotmatch $phSkip -and (Test-Path -LiteralPath $_ -PathType Leaf) -and (Test-TextFile $_) -and (Select-String -LiteralPath $_ -Pattern '\{\{(PROJECT_NAME|DESCRIPTION|OWNER|YEAR|DATE)\}\}' -CaseSensitive -Quiet) }).Count
$RepoName = Split-Path -Leaf $Root
$inv = [System.Globalization.CultureInfo]::InvariantCulture
function Fmt([double]$x) { return $x.ToString("0.0", $inv) }

if (-not $Quiet) {
  Write-Output "Build Standard v$StdVersion audit: $RepoName"
  Write-Output ("=" * 64)
  foreach ($r in $Results) {
    $mark = switch ($r.result) { "pass" { "PASS" } "partial" { "PART" } "fail" { "FAIL" } "na" { " n/a" } default { "  ? " } }
    $nm = if ($r.name.Length -gt 52) { $r.name.Substring(0, 52) } else { $r.name }
    Write-Output ("{0}  {1}  {2,-11} {3,-52} {4}" -f $mark, $r.id, $r.tier, $nm, $r.detail)
  }
  Write-Output ("=" * 64)
  Write-Output "Applicable and checked: $CHK   pass $P   partial $PA   fail $F   n/a $NA   unknown (manual, no status) $U"
  Write-Output ("Structure score (artifact present):   {0}%  ({1}/{2})" -f (Fmt $STRUCT), ($P + $PA), $CHK)
  Write-Output ("Completion score (present and filled): {0}%  ({1}/{2})" -f (Fmt $COMPLETE), $P, $CHK)
  Write-Output ("Core items complete:                   {0}%  ({1}/{2})" -f (Fmt $CORE), $CP, $CCHK)
  if ($PH -gt 0) { Write-Output "Warning: $PH file(s) still contain {{PLACEHOLDERS}}." }
}
if ($Json) {
  $obj = [ordered]@{
    standard_version  = $StdVersion
    repo              = $RepoName
    score             = [ordered]@{ structure_percent = $STRUCT; completion_percent = $COMPLETE; core_completion_percent = $CORE; checked = $CHK; core_checked = $CCHK }
    counts            = [ordered]@{ pass = $P; partial = $PA; fail = $F; na = $NA; unknown = $U }
    placeholder_files = $PH
    items             = $Results
  }
  $obj | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Json -Encoding UTF8
  if (-not $Quiet) { Write-Output "JSON report: $Json" }
}
if ($Markdown) {
  $md = @("## Build Standard v$StdVersion audit", "", ("Structure **{0}%** · Completion **{1}%** · Core complete **{2}%** · pass $P, partial $PA, fail $F, n/a $NA, unknown $U" -f (Fmt $STRUCT), (Fmt $COMPLETE), (Fmt $CORE)), "", "| Result | ID | Tier | Item | Detail |", "|---|---|---|---|---|")
  $md += $Results | Where-Object { $_.result -ne "na" } | ForEach-Object { "| $($_.result) | $($_.id) | $($_.tier) | $($_.name.Replace('|', '\|')) | $($_.detail.Replace('|', '\|')) |" }
  Add-Content -LiteralPath $Markdown -Value $md -Encoding UTF8
}
exit 0
