# Support

GlidieBirdie is a small static browser game, so most problems are usually easy to isolate.

## Run The Game

Open `index.html` directly, or serve the folder locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Quick Checks Before Reporting A Problem

- Reload the page once.
- Try a current version of Chrome, Edge, Firefox, or Safari.
- If audio is silent, click or press a key once to unlock browser audio.
- If the installed PWA looks stale, reload once while online so the service worker can refresh the app shell.
- If input feels wrong, confirm the page is focused before testing keyboard controls.
- Run `npm run check` if you have Node.js available.

## Common Problems

### The Game Opens But Nothing Moves

- Press `Space`, click the canvas, or tap the screen.
- If the tutorial overlay is open, dismiss it first.
- Check whether the page is paused.

### Audio Does Not Play

- Browser audio often stays locked until the first user gesture.
- Try one click, tap, or key press.
- Make sure the mute toggle and audio sliders are not set to zero.

### The Installed PWA Shows Old Content

- Open the online version once.
- Reload the page.
- Close and reopen the installed app.

The service worker only caches the app shell, so a normal online refresh is usually enough.

### Mobile Controls Feel Missing

The on-screen Brake / Flap / Dive bar appears on coarse-pointer devices. If you are testing on desktop with device emulation, reload after changing the device mode.

## Where To Ask For Help

- Use **Bug Report** for broken behavior.
- Use **Feature Request** for new ideas.
- Use **Accessibility Feedback** for keyboard, screen-reader, contrast, or reduced-motion issues.

Please include:

- browser and version
- operating system
- device type if relevant
- what you expected
- what actually happened
- whether the issue also appears after a reload
