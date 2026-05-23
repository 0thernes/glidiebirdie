# 🐦 Flappy Bird — Calm Edition

A softer, more accessible, less stressful take on Flappy Bird. Built with vanilla HTML, CSS, and JavaScript — zero dependencies, zero external assets.

## ✨ What Makes It "Calm"

Default settings use the "Calm" (gravity) and "Chill" (speed) presets. The customizer lets you adjust from Ultra-Light to Heavy.

| Feature             | Default (Calm/Chill) | Original Flappy Bird |
| ------------------- | -------------------- | -------------------- |
| Gravity             | 0.052                | ~0.25                |
| Flap impulse        | -2.35                | ~-4.0                |
| Terminal fall speed | 2.35                 | ~6.0                 |
| Pipe gap            | 184px                | ~100px               |
| Pipe speed          | 1.15                 | ~2.0                 |
| Spawn interval      | 170 frames           | ~100 frames          |

The result: gentle pacing, forgiving timing, and a bird that feels like it's gliding rather than fighting gravity. Use the Zen Customizer to tune these values to your preference.

## 🎮 Controls

| Key / Input           | Action                     |
| --------------------- | -------------------------- |
| `Space` or `Arrow Up` | Feather flap               |
| `Click` or `Tap`      | Tap-friendly flap          |
| `Shift` (hold)        | Soften descent (air brake) |
| `Arrow Down` (hold)   | Controlled dive            |
| `Escape`              | Pause / resume             |
| `M`                   | Mute / unmute              |
| `R`                   | Fresh restart              |

## 🎨 Features

- **Procedural audio** — All sounds synthesized in real time via the Web Audio API. No MP3s, no OGGs, no network requests.
- **Emotion system** — The bird reacts to danger, success, and failure with 5 emotional states (calm, happy, scared, determined, dizzy) that drive pupil size, eyebrow shape, body color, blush, and more.
- **Eye tracking** — The bird's pupil tracks the nearest pipe gap, giving it a lifelike awareness.
- **Dynamic difficulty** — Speed increases by 3% every 6 pipes, capped at 1.18×. Moving pipes appear after score 14.
- **Particle effects** — Sparkles on score, burst on death. Respects `prefers-reduced-motion`.
- **Screen shake** — Subtle impact feedback on death. Disabled for users who prefer reduced motion.
- **Music** — Gentle C-major arpeggio loop, synthesized in real time.
- **Accessibility** — Full ARIA support, screen reader announcements, keyboard navigation, high-contrast support, and reduced-motion awareness.
- **Frame-rate independent physics** — Runs correctly at 60Hz, 144Hz, or 240Hz.
- **Zen Customizer** — Adjust gravity, speed, music/SFX volume, and choose from 4 visual themes (Sunset, Midnight, Rain, Aurora). Preferences persist in `localStorage`.
- **Feather Shield** — Collectible power-up that absorbs one collision, pops the bird upward, and grants brief invincibility.
- **Persistent stats** — Track zen minutes, shields saved, runs completed, and near misses across sessions.
- **Achievements** — Unlock milestones like First Flight, Zen Master, Shield Savior, and Theme Explorer.

## 🚀 How to Run

### Option 1: Open directly

Open `index.html` in any modern browser.

### Option 2: Live server (recommended)

If you have VS Code with the Live Server extension, right-click `index.html` and select **Open with Live Server**.

Or from the terminal:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000`.

## 📁 Files

| File                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `index.html`                      | Semantic page shell, accessibility layer, canvas container       |
| `style.css`                       | Modern CSS with `@layer`, container queries, fluid design system |
| `game.js`                         | Game engine: physics, rendering, audio, input, state management  |
| `README.md`                       | This file                                                        |
| `LICENSE.txt`                     | AGPL-3.0-or-later license text                                  |
| `.gitignore`                      | Standard ignore patterns                                         |
| `.vscode/`                        | VS Code settings for JavaScript development                      |
| `.memory/`                        | AI context memory for long-term project knowledge                |
| `.github/copilot-instructions.md` | AI behavior contract                                             |

## 🛠️ Tech Stack

- **HTML5** — Semantic markup, ARIA, Open Graph
- **CSS4** — `@layer`, `@property`, container queries, `clamp()`, `dvh`
- **Vanilla JS** — No frameworks, no bundlers, no dependencies
- **Web Audio API** — Procedural sound synthesis
- **Canvas 2D** — High-performance rendering

## 📝 License

AGPL-3.0-or-later — this is free software. If you run a modified version on a public server, you must offer users the source code.

---

_Built with care for players who prefer flow over frustration._
