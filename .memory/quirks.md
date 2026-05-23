# Quirks

Project-specific weirdness — the non-obvious stuff.

## The `.gitignore` incident

This repo once had 50+ lines of live credentials inside `.gitignore`. The developer treated it as a hidden notes file. It has been cleaned, but the habit may resurface. Watch for secrets in unexpected places.

## C++ configs in a JS project

`.vscode/` previously contained `c_cpp_properties.json` and `launch.json` from an unrelated C++ project. The workspace folder is reused across projects. Always check `.vscode/` contents before assuming they match the current project.

## Monolithic `game.js`

The entire game engine lives in one ~900-line file. This is intentional for zero-dependency deployment, but it makes navigation harder. Use `grep_search` with function names to find code quickly.

## AudioContext unlocking

Browsers block AudioContext until a user gesture. The `ensureAudio()` call is scattered across input handlers. If audio stops working, check that `ensureAudio()` is being called on the relevant interaction.

## `localStorage` best score

The best score is stored as a raw number with no schema version. If the key format ever changes, old data will silently become `NaN`. The `try/catch` handles private mode but not corruption.

## Canvas hardcoded size

The canvas is `420×640` pixels. CSS scales it via `width: 100%` and `aspect-ratio: 420/640`. All physics and rendering coordinates assume this size. Changing it requires updating both HTML and all coordinate math.

## Emotion timer

`bird.emotionTimer` is set to 60 frames when emotion changes. This prevents rapid flicker between states. The timer counts down by `state.dt` each frame. If you add new emotion triggers, respect this cooldown.

## Customizer drawer focus management

The drawer uses `inert` when closed and traps focus when open. Opening the drawer auto-pauses the game. Closing it restores focus to the toggle button. The `shouldIgnoreGlobalShortcut()` function prevents game keys from firing while interacting with drawer controls.

## `heldKeys` Set for modifier survival

Shift and ArrowDown are tracked in a `Set` called `heldKeys`. This ensures that if the user holds Shift during a restart, the brake state is re-applied after reset. Without this, the browser never re-fires `keydown` for an already-held key.

## Music scheduler (drift-free)

The music uses a Web Audio clock scheduler (`scheduleMusicAhead()`) instead of `setInterval` directly driving notes. This prevents timing drift. The scheduler runs every 25ms and schedules 0.1 seconds ahead. If the tab is throttled, it skips the backlog rather than dumping notes.
