# Runnable Examples (`examples/`)

This directory contains zero-dependency runnable examples exercising GlidieBirdie's native ES2022 engine directly from Node.js.

## Quick Run

```bash
node examples/determinism_demo.mjs
```

Expected output: bit-identical 180-step trajectories at 60 Hz and 144 Hz for a shared UTC daily seed (`20261125`), plus exact 32-bit `mulberry32` verification matching the Lean 4.35.0 formal core.
