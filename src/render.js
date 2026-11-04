/** Canvas drawing. Interpolation reads `view.alpha`; it never changes simulation state. */
import { CONFIG, THEMES } from './config.js';
import { ctx, dprState } from './dom.js';
import {
  THEME_TABLE,
  activeParticles,
  activeWeather,
  bird,
  getPipeScoreHue,
  getTheme,
  ground,
  pipes,
  state,
  view,
} from './state.js';

const pose = { birdY: 0, birdRot: 0, groundOffset: 0 };
const birdKeys = Object.create(null);
const EMOTIONS = ['calm', 'happy', 'scared', 'determined', 'dizzy'];
for (const theme of THEMES) {
  birdKeys[theme] = Object.create(null);
  for (const emotion of EMOTIONS) birdKeys[theme][emotion] = theme + '|' + emotion;
}
function birdCacheKey(theme, emotion) {
  const row = birdKeys[theme];
  if (row && row[emotion]) return row[emotion];
  return theme + '|' + emotion;
}
function cloudWrap(offset, speed, co) {
  const span = CONFIG.CANVAS_W + 200;
  return ((((offset - co * speed) % span) + span) % span) - 60;
}
function pipeDrawX(pipe) {
  const prev = pipe.prevX === undefined ? pipe.x : pipe.prevX;
  return prev + (pipe.x - prev) * view.alpha;
}
function updatePose() {
  const alpha = view.alpha;
  const prevY = bird.prevY === undefined ? bird.y : bird.prevY;
  const prevR = bird.prevRotation === undefined ? bird.rotation : bird.prevRotation;
  pose.birdY = prevY + (bird.y - prevY) * alpha;
  pose.birdRot = prevR + (bird.rotation - prevR) * alpha;
  let prevG = ground.prevOffset === undefined ? ground.offset : ground.prevOffset;
  let curG = ground.offset;
  if (curG < prevG - 16) curG += 32;
  pose.groundOffset = (prevG + (curG - prevG) * alpha) % 32;
}
let grassTheme = '';
let grassGrad = null;
function grassGradient(g) {
  if (grassTheme !== state.theme || !grassGrad) {
    grassTheme = state.theme;
    grassGrad = ctx.createLinearGradient(0, ground.y, 0, ground.y + 14);
    grassGrad.addColorStop(0, g.grass1);
    grassGrad.addColorStop(1, g.grass2);
  }
  return grassGrad;
}
let vignetteGrad = null;
function vignetteGradient() {
  if (!vignetteGrad) {
    vignetteGrad = ctx.createRadialGradient(
      CONFIG.CANVAS_W / 2,
      CONFIG.CANVAS_H / 2,
      CONFIG.CANVAS_W * 0.35,
      CONFIG.CANVAS_W / 2,
      CONFIG.CANVAS_H / 2,
      CONFIG.CANVAS_W * 0.75,
    );
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.28)');
  }
  return vignetteGrad;
}
const auroraGrads = [null, null, null];
function auroraGradient(i) {
  if (!auroraGrads[i]) {
    const grad = ctx.createLinearGradient(0, 0, CONFIG.CANVAS_W, 0);
    grad.addColorStop(0, 'rgba(74, 222, 128, 0)');
    grad.addColorStop(0.3 + i * 0.15, 'rgba(' + (74 + i * 20) + ', ' + (222 - i * 30) + ', ' + (128 + i * 40) + ', 0.06)');
    grad.addColorStop(0.6 + i * 0.15, 'rgba(0, 0, 0, 0)');
    auroraGrads[i] = grad;
  }
  return auroraGrads[i];
}
const meadowGrads = [null, null, null];
function meadowGradient(i) {
  if (!meadowGrads[i]) {
    const a = CONFIG.MEADOW_LIGHT_ALPHA * (0.65 + i * 0.18);
    const grad = ctx.createLinearGradient(
      CONFIG.CANVAS_W * (0.62 + i * 0.07),
      0,
      CONFIG.CANVAS_W * 0.18,
      CONFIG.CANVAS_H * CONFIG.MEADOW_LIGHT_VERTICAL,
    );
    grad.addColorStop(0, 'rgba(255, 232, 155, ' + a + ')');
    grad.addColorStop(0.45, 'rgba(255, 218, 125, ' + a * 0.55 + ')');
    grad.addColorStop(1, 'rgba(255, 205, 90, 0)');
    meadowGrads[i] = grad;
  }
  return meadowGrads[i];
}
let scoreText = '0';
let scoreValue = -1;
function scoreLabel() {
  if (scoreValue !== state.score) {
    scoreValue = state.score;
    scoreText = String(state.score);
  }
  return scoreText;
}
let fpsText = '0 fps';
let fpsValue = -1;
function fpsLabel() {
  if (fpsValue !== fpsDisplay) {
    fpsValue = fpsDisplay;
    fpsText = fpsDisplay + ' fps';
  }
  return fpsText;
}

export const SPRITE_CACHE = {
  sky: /** @type {HTMLCanvasElement | null} */ (null),
  skyKey: '',
  clouds: /** @type {HTMLCanvasElement | null} */ (null),
  bird: /** @type {Record<string, HTMLCanvasElement>} */ ({}),
};

export function makeOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * dprState.value);
  c.height = Math.round(h * dprState.value);
  const cx = c.getContext('2d');
  if (cx) cx.setTransform(dprState.value, 0, 0, dprState.value, 0, 0);
  return c;
}

export function rebuildSkyCache() {
  const key = state.theme + '|' + Math.floor(state.score / 5);
  if (SPRITE_CACHE.sky && SPRITE_CACHE.skyKey === key) return;
  const c = makeOffscreen(CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  const cx = c.getContext('2d');
  if (!cx) return;
  const skyCfg = getTheme().sky;
  const hue = skyCfg.h1;
  const grad = cx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
  grad.addColorStop(0, `hsl(${hue}, 80%, 72%)`);
  grad.addColorStop(0.6, `hsl(${hue + 10}, 70%, 82%)`);
  grad.addColorStop(1, `hsl(${hue + 20}, 60%, 90%)`);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  SPRITE_CACHE.sky = c;
  SPRITE_CACHE.skyKey = key;
}

export function rebuildCloudCache() {
  const c = makeOffscreen(140, 90);
  const cx = c.getContext('2d');
  if (!cx) return;
  cx.fillStyle = '#ffffff';
  cx.beginPath();
  cx.arc(35, 55, 28, Math.PI * 0.5, Math.PI * 1.5);
  cx.arc(63, 31, 24, Math.PI, 0);
  cx.arc(91, 55, 27, Math.PI * 1.5, Math.PI * 0.5);
  cx.closePath();
  cx.fill();
  SPRITE_CACHE.clouds = c;
}

export function rebuildBirdCache() {
  SPRITE_CACHE.bird = {};
  const emotions = ['calm', 'happy', 'scared', 'determined', 'dizzy'];
  for (const theme of THEMES) {
    for (const emotion of emotions) {
      const key = `${theme}|${emotion}`;
      const c = makeOffscreen(60, 60);
      const cx = c.getContext('2d');
      if (!cx) continue;
      cx.translate(30, 30);
      const palette = THEME_TABLE[theme].bird;
      const bodyColor = palette[emotion] || palette.calm;
      // Soft radial shadow underneath
      const shadowGrad = cx.createRadialGradient(2, 5, 1, 2, 5, CONFIG.BIRD_RADIUS + 4);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.28)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = shadowGrad;
      cx.beginPath();
      cx.ellipse(2, 5, CONFIG.BIRD_RADIUS + 4, (CONFIG.BIRD_RADIUS + 4) * 0.55, 0, 0, Math.PI * 2);
      cx.fill();
      // body
      cx.fillStyle = bodyColor;
      cx.beginPath();
      cx.arc(0, 0, CONFIG.BIRD_RADIUS, 0, Math.PI * 2);
      cx.fill();
      // body radial highlight
      const hlGrad = cx.createRadialGradient(-4, -6, 1, -4, -6, CONFIG.BIRD_RADIUS);
      hlGrad.addColorStop(0, palette.hl);
      hlGrad.addColorStop(0.7, palette.hl + '33'); // semi-fade
      hlGrad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = hlGrad;
      cx.beginPath();
      cx.arc(-4, -6, CONFIG.BIRD_RADIUS * 0.6, 0, Math.PI * 2);
      cx.fill();
      // body rim shading (bottom shadow)
      cx.fillStyle = palette.shadow + '55';
      cx.beginPath();
      cx.arc(2, 5, CONFIG.BIRD_RADIUS * 0.85, 0, Math.PI * 2);
      cx.fill();

      // cute head crest / tuft — extra personality & calm character (cheap, cached)
      cx.fillStyle = palette.hl;
      cx.globalAlpha = 0.65;
      cx.beginPath();
      cx.moveTo(-3, -17);
      cx.quadraticCurveTo(0, -24, 6, -16);
      cx.quadraticCurveTo(1, -19, -3, -17);
      cx.closePath();
      cx.fill();
      cx.globalAlpha = 1;

      // beak (curved)
      cx.fillStyle = palette.beak;
      cx.beginPath();
      cx.moveTo(14, 0);
      cx.quadraticCurveTo(22, 1, 26, 4);
      cx.quadraticCurveTo(22, 7, 14, 9);
      cx.closePath();
      cx.fill();
      // beak highlight
      cx.fillStyle = 'rgba(255,255,255,0.25)';
      cx.beginPath();
      cx.moveTo(15, 1);
      cx.quadraticCurveTo(20, 1.5, 24, 3.5);
      cx.lineTo(15, 3);
      cx.closePath();
      cx.fill();
      SPRITE_CACHE.bird[key] = c;
    }
  }
}

export function rebuildSpriteCaches() {
  SPRITE_CACHE.sky = null;
  SPRITE_CACHE.skyKey = '';
  rebuildSkyCache();
  rebuildCloudCache();
  rebuildBirdCache();
}

// ─── 9. WORLD ──────────────────────────────────────────────────────
export function drawParticles() {
  for (const p of activeParticles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawWeatherParticles() {
  for (const p of activeWeather) {
    if (p.type === 'rain') {
      ctx.strokeStyle = 'rgba(156, 206, 235, 0.40)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 1.4, p.y + p.vy * 1.4);
      ctx.stroke();
    } else if (p.type === 'dust') {
      ctx.fillStyle = 'rgba(167, 139, 250, 0.65)';
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'cyber') {
      ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    } else if (p.type === 'pollen') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(state.time * 0.025 + p.phase) * 0.5);
      ctx.fillStyle = p.color || '#fde68a';
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, Math.max(0.8, p.size * 0.68), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Soft meadow pollen / petals — warm, organic, calm visual delight (flutter phase)
      ctx.globalAlpha = p.alpha * 0.9;
      const r = p.size * 0.52;
      const phase = (p.x * 0.8 + p.y * 0.6 + state.time * 1.8) * 0.018; // gentle living flutter
      // Core glow
      ctx.fillStyle = 'rgba(249, 199, 79, 0.65)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Four gentle petal lobes with phase rotation for organic meadow life (still cheap)
      ctx.fillStyle = 'rgba(255, 225, 150, 0.38)';
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + phase;
        const px = p.x + Math.cos(a) * r * 0.72;
        const py = p.y + Math.sin(a) * r * 0.72;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.58, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tiny bright center spark for premium golden feel
      ctx.fillStyle = 'rgba(255, 250, 220, 0.75)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'mote') {
      // Warm sunset dust motes — soft, glowing, slow drifting
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'rgba(255, 210, 130, 0.6)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Subtle highlight for golden light quality
      ctx.fillStyle = 'rgba(255, 245, 200, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x - 0.6, p.y - 0.6, p.size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;
}

export function drawAuroraBands() {
  if (state.theme !== 'aurora' || state.reducedMotion) return;
  ctx.save();
  const t = state.time * 0.005;
  for (let i = 0; i < 3; i++) {
    const shiftX = Math.sin(t + i * 1.7) * (50 + i * 18);
    ctx.fillStyle = auroraGradient(i);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CONFIG.CANVAS_W, 0);
    ctx.lineTo(CONFIG.CANVAS_W + shiftX, CONFIG.CANVAS_H - 180);
    ctx.lineTo(shiftX, CONFIG.CANVAS_H - 180);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Meadow signature "Golden Light" godrays — warm, drifting sunbeams for the calmest theme.
// Cheap canvas gradients, time-based drift, fully respects reduced-motion and CONFIG.
export function drawMeadowLight() {
  if (state.theme !== 'meadow' || state.reducedMotion) return;
  ctx.save();
  const t = state.time * CONFIG.MEADOW_LIGHT_WAVE_SPEED;
  for (let i = 0; i < CONFIG.MEADOW_LIGHT_COUNT; i++) {
    const shift = Math.sin(t + i * 1.3) * (28 + i * 11);
    ctx.fillStyle = meadowGradient(i);
    ctx.beginPath();
    ctx.moveTo(CONFIG.CANVAS_W * (0.58 + i * 0.06), 0);
    ctx.lineTo(CONFIG.CANVAS_W + 8, 0);
    ctx.lineTo(CONFIG.CANVAS_W * (1.02 + shift * 0.009), CONFIG.CANVAS_H * 0.52);
    ctx.lineTo(CONFIG.CANVAS_W * (0.32 + shift * 0.007), CONFIG.CANVAS_H * 0.46);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ─── 10. PHYSICS ──────────────────────────────────────────────────
export function drawBackground() {
  // Cached sky
  if (SPRITE_CACHE.sky) {
    ctx.drawImage(SPRITE_CACHE.sky, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  } else {
    ctx.fillStyle = '#7bd8ff';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }

  drawAuroraBands();
  drawMeadowLight();

  // Parallax clouds — multiple depths
  const skyCfg = getTheme().sky;
  const co = state.time * (state.reducedMotion ? 0.08 : 0.22);

  // Far layer (smallest, slowest, faintest)
  ctx.globalAlpha = skyCfg.cAlpha * 0.45;
  drawCachedCloud(cloudWrap(40, 0.05, co), 60, 0.45);
  drawCachedCloud(cloudWrap(220, 0.06, co), 110, 0.4);
  drawCachedCloud(cloudWrap(360, 0.04, co), 80, 0.5);
  // Mid layer
  ctx.globalAlpha = skyCfg.cAlpha * 0.75;
  drawCachedCloud(cloudWrap(285, 0.15, co), 150, 0.78);
  drawCachedCloud(cloudWrap(180, 0.1, co), 190, 0.55);
  // Near layer (largest, fastest, most opaque)
  ctx.globalAlpha = skyCfg.cAlpha;
  drawCachedCloud(cloudWrap(70, 0.2, co), 100, 1.0);
  drawCachedCloud(cloudWrap(460, 0.25, co), 70, 0.72);
  ctx.globalAlpha = 1.0;

  // Stars
  if (state.score >= 10 || state.theme === 'midnight') {
    for (let i = 0; i < 14; i++) {
      const sx = (i * 97 + state.time * 0.5) % CONFIG.CANVAS_W;
      const sy = 30 + ((i * 53 + state.time * 0.3) % 120);
      const tw = 0.3 + 0.4 * Math.sin(state.time * 0.1 + i);
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawCachedCloud(x, y, scale = 1) {
  if (!SPRITE_CACHE.clouds) return;
  const w = 140 * scale,
    h = 90 * scale;
  ctx.drawImage(SPRITE_CACHE.clouds, x, y - h * 0.4, w, h);
}

export function drawPipes() {
  for (const pipe of pipes) {
    const gapBottom = pipe.topHeight + state.gap;
    drawPipe(pipeDrawX(pipe), 0, pipe.topHeight, true, pipe);
    drawPipe(pipeDrawX(pipe), gapBottom, ground.y - gapBottom, false, pipe);
  }
}

export function drawPipe(x, y, height, isTop, pipe) {
  if (height <= 0) return;
  const hueValue = getPipeScoreHue(state.score);
  if (pipe._hue !== hueValue || !pipe._grad) {
    pipe._hue = hueValue;
    const grad = ctx.createLinearGradient(0, 0, state.pipeWidth, 0);
    grad.addColorStop(0, pipe.color);
    grad.addColorStop(0.4, 'hsl(' + hueValue + ', 60%, 48%)');
    grad.addColorStop(1, pipe.capColor);
    pipe._grad = grad;
  }
  ctx.save();
  ctx.translate(x, 0);
  ctx.fillStyle = pipe._grad;
  ctx.fillRect(0, y, state.pipeWidth, height);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 10, y + 4, 8, Math.max(0, height - 8));

  const capH = 20;
  const capY = isTop ? y + height - capH : y;
  ctx.fillStyle = pipe.capColor;
  ctx.fillRect(x - 4, capY, state.pipeWidth + 8, capH);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x - 2, capY + 2, state.pipeWidth + 4, 4);

  if (pipe.isMoving) {
    ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
    ctx.beginPath();
    ctx.arc(x + state.pipeWidth / 2, capY + capH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // a small icon to differentiate by shape (color-blind redundancy)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + state.pipeWidth / 2 - 5, capY + capH / 2);
    ctx.lineTo(x + state.pipeWidth / 2 + 5, capY + capH / 2);
    ctx.stroke();
  }
}

export function drawGround() {
  const g = getTheme().ground;
  ctx.fillStyle = g.sand;
  ctx.fillRect(0, ground.y, CONFIG.CANVAS_W, ground.height);
  ctx.fillStyle = grassGradient(g);
  ctx.fillRect(0, ground.y, CONFIG.CANVAS_W, 14);

  // Meadow ground delight — sparse living grass tufts + tiny warm flecks (calm, low cost)
  if (state.theme === 'meadow') {
    const reduced = state.reducedMotion;
    ctx.globalAlpha = reduced ? 0.18 : 0.26;
    ctx.fillStyle = '#f4d35e';
    const tuftCount = reduced ? 5 : 9;
    for (let i = 0; i < tuftCount; i++) {
      const x =
        22 +
        i * (CONFIG.CANVAS_W / (tuftCount + 1)) +
        (reduced ? 0 : Math.sin(state.time * 0.018 + i) * 1.8);
      const h = 3.5 + (i % 3);
      ctx.fillRect(x, ground.y + 3, 1.8, h);
      if (!reduced && i % 3 === 0) {
        ctx.fillStyle = '#81b29a';
        ctx.fillRect(x + 2.2, ground.y + 5, 1.2, 2.5);
        ctx.fillStyle = '#f4d35e';
      }
    }
    ctx.globalAlpha = 1.0;
  }

  ctx.fillStyle = g.dirt;
  for (let i = -32; i < CONFIG.CANVAS_W + 64; i += 32) {
    const ox = i - pose.groundOffset;
    ctx.fillRect(ox, ground.y + 22, 16, 8);
    ctx.fillRect(ox + 14, ground.y + 42, 12, 8);
  }
}

export function drawBirdTrail() {
  if (state.reducedMotion) return;
  let trailColor = getTheme().trail;
  if (bird.emotion === 'happy') trailColor = '#ffd700';
  if (bird.emotion === 'scared') trailColor = '#ff9999';
  for (const t of bird.trail) {
    if (t.life <= 0) continue;
    const alpha = t.life / CONFIG.BIRD_TRAIL_LIFE;
    ctx.globalAlpha = alpha * 0.25;
    ctx.fillStyle = trailColor;
    ctx.beginPath();
    ctx.arc(t.x, t.y, bird.radius * 0.5 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawBird() {
  ctx.save();
  ctx.translate(bird.x, pose.birdY);
  ctx.rotate(pose.birdRot);
  // Living bird breathing (subtle, only when calm gliding — feels alive)
  const breathX = bird.scaleX + (bird.breath || 0) * 0.7;
  const breathY = bird.scaleY - (bird.breath || 0);
  ctx.scale(breathX, breathY);

  if (state.isInvincible) {
    ctx.globalAlpha = 0.45 + Math.sin(state.time * 0.35) * 0.35;
  }

  const palette = getTheme().bird;

  // Cached body+highlight+beak
  const cached = SPRITE_CACHE.bird[birdCacheKey(state.theme, bird.emotion)];
  if (cached) {
    ctx.drawImage(cached, -30, -30, 60, 60);
  }

  // Dynamic wing
  ctx.save();
  ctx.translate(-4, 4);
  ctx.rotate(bird.wingAngle);
  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eye white
  const eyeX = 6,
    eyeY = -6;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();

  let pupilR = 3.5;
  if (bird.emotion === 'scared') pupilR = 4.5;
  if (bird.emotion === 'dizzy') pupilR = 2.5;
  if (bird.emotion === 'determined') pupilR = 3;
  pupilR += bird.pupilDilate * 1.2; // micro-interaction

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(eyeX + bird.pupilOffsetX, eyeY + bird.pupilOffsetY, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(eyeX + bird.pupilOffsetX + 1, eyeY + bird.pupilOffsetY - 1, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrow
  ctx.strokeStyle = '#664400';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (bird.emotion === 'scared') {
    ctx.moveTo(eyeX - 6, eyeY - 10);
    ctx.lineTo(eyeX + 4, eyeY - 12);
  } else if (bird.emotion === 'determined') {
    ctx.moveTo(eyeX - 6, eyeY - 12);
    ctx.lineTo(eyeX + 4, eyeY - 8);
  } else if (bird.emotion === 'dizzy') {
    ctx.moveTo(eyeX - 5, eyeY - 10);
    ctx.quadraticCurveTo(eyeX, eyeY - 13, eyeX + 5, eyeY - 10);
  } else {
    ctx.moveTo(eyeX - 5, eyeY - 10);
    ctx.lineTo(eyeX + 5, eyeY - 10);
  }
  ctx.stroke();

  // Blush
  if (bird.blush > 0) {
    ctx.fillStyle = `rgba(255, 120, 120, ${bird.blush * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(-6, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile
  if (bird.emotion === 'happy') {
    ctx.strokeStyle = '#ff6b1d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(14, 6, 5, 0, Math.PI * 0.8);
    ctx.stroke();
  }

  // Dizzy
  if (bird.emotion === 'dizzy') {
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.5;
    for (let s = 0; s < 3; s++) {
      const angle = state.time * 0.15 + s * ((Math.PI * 2) / 3);
      const sx = Math.cos(angle) * 22;
      const sy = Math.sin(angle) * 22 - 8;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1.0;
}

export function drawShieldBubbles() {
  for (const pipe of pipes) {
    if (!pipe.shieldBubble) continue;
    const b = pipe.shieldBubble;
    const bx = pipeDrawX(pipe) + state.pipeWidth / 2;
    const by = pipe.topHeight + state.gap / 2;
    const pulseR = b.radius + Math.sin(b.pulse) * 3;
    ctx.save();
    // Outer glow ring (replaces shadowBlur — cheaper on mobile)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
    ctx.beginPath();
    ctx.arc(bx, by, pulseR + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(bx, by, pulseR, 0, Math.PI * 2);
    ctx.fill();
    // ring (color-blind redundancy: icon-glyph + ring shape)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', bx, by);
    ctx.restore();
  }
}

export function drawBirdShield() {
  if (!state.shieldActive) return;
  ctx.save();
  ctx.translate(bird.x, pose.birdY);
  ctx.rotate(state.time * 0.04);
  // Layered fills instead of shadowBlur (mobile-friendly)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  // 4 rotating energy nodes
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * (bird.radius + 12),
      Math.sin(a) * (bird.radius + 12),
      3.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

export function drawScore() {
  let glowColor =
    bird.emotion === 'happy' ? '#ffd700' : bird.emotion === 'determined' ? '#ff8800' : '#ffffff';
  if (state.newBestFlash > 0) glowColor = '#ffd700';

  ctx.fillStyle = glowColor;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  ctx.font = 'bold 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText(scoreLabel(), CONFIG.CANVAS_W / 2, 65);
  ctx.fillText(scoreLabel(), CONFIG.CANVAS_W / 2, 65);

  if (state.phase === 'play') {
    ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const emo = { calm: '😌', happy: '😄', scared: '😰', determined: '😎', dizzy: '😵' };
    ctx.fillText(emo[bird.emotion] || '', CONFIG.CANVAS_W / 2, 85);
  }
}

export let fpsFrames = 0;
export let fpsAccum = 0;
export let fpsDisplay = 0;
export function updateFpsCounter(dtSec) {
  fpsAccum += dtSec;
  fpsFrames++;
  if (fpsAccum >= 0.5) {
    fpsDisplay = Math.round(fpsFrames / fpsAccum);
    fpsAccum = 0;
    fpsFrames = 0;
  }
}
export function drawFpsCounter() {
  if (!state.showFps) return;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(CONFIG.CANVAS_W - 56, 6, 50, 18);
  ctx.fillStyle = fpsDisplay >= 50 ? '#4ade80' : fpsDisplay >= 30 ? '#facc15' : '#f87171';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(fpsLabel(), CONFIG.CANVAS_W - 31, 19);
}

export function drawVignette() {
  if (state.reducedTransparency) return;
  ctx.fillStyle = vignetteGradient();
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
}

export function drawNearMissFlash() {
  if (state.nearMissFlash <= 0) return;
  ctx.globalAlpha = Math.min(0.35, state.nearMissFlash * 0.6);
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  ctx.globalAlpha = 1;
}

export function drawCalmMeter() {
  if (state.phase !== 'play') return;
  const x = 14,
    y = 14,
    w = 8,
    h = 100;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  const filled = Math.max(0, Math.min(1, state.calmMeter));
  ctx.fillStyle = `hsl(${160 + filled * 60}, 70%, 60%)`;
  ctx.fillRect(x, y + h - h * filled, w, h * filled);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function drawPanel(title, subtitle, extra, options = /** @type {{newBest?:boolean}} */ ({})) {
  const pw = 320,
    ph = 210;
  const px = (CONFIG.CANVAS_W - pw) / 2;
  const py = 160;

  ctx.fillStyle = 'rgba(12, 20, 35, 0.88)';
  ctx.strokeStyle = options.newBest ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = options.newBest ? 3 : 2;
  roundRect(px, py, pw, ph, 22);
  ctx.fill();
  ctx.stroke();

  if (options.newBest) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🌟 NEW BEST 🌟', CONFIG.CANVAS_W / 2, py + 22);
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(title, CONFIG.CANVAS_W / 2, py + (options.newBest ? 60 : 50));

  ctx.font = '17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  wrapText(subtitle, CONFIG.CANVAS_W / 2, py + (options.newBest ? 92 : 86), 280, 22);

  if (state.best > 0) {
    ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffd24d';
    ctx.fillText(`Best: ${state.best}`, CONFIG.CANVAS_W / 2, py + 155);
  }

  if (extra) {
    ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    wrapText(extra, CONFIG.CANVAS_W / 2, py + 180, 285, 15);
  }
}

/** Serene Postcard — beautiful, shareable calm moment (extends existing render primitives). */
export function drawPostcard() {
  const w = CONFIG.CANVAS_W;
  const h = CONFIG.CANVAS_H;
  const theme = getTheme();
  const themeName = state.theme.charAt(0).toUpperCase() + state.theme.slice(1);

  // Soft serene overlay (calm, not opaque)
  ctx.fillStyle = 'rgba(8, 17, 32, 0.55)';
  ctx.fillRect(0, 0, w, h);

  // Gentle theme-tinted vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2.2, 80, w / 2, h / 2, Math.max(w, h) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(4, 10, 22, 0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Draw a larger, centered, calm bird (reuse palette, no trail/shield for serenity)
  const bx = w / 2;
  const by = h * 0.42;
  const prevX = bird.x;
  const prevY = bird.y;
  const prevRot = bird.rotation;
  bird.x = bx;
  bird.y = by;
  bird.rotation = 0; // serene, level flight

  // Draw bird larger by temporarily scaling context around center
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.35, 1.35);
  ctx.translate(-bx, -by);
  drawBird();
  ctx.restore();

  // Restore bird state
  bird.x = prevX;
  bird.y = prevY;
  bird.rotation = prevRot;

  // Gentle theme-colored floating particles (slow, peaceful)
  if (!state.reducedMotion) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 7; i++) {
      const px = w * (0.28 + ((i * 0.07) % 0.44));
      const py = h * 0.58 + Math.sin(Date.now() / 1400 + i) * 18;
      ctx.fillStyle = theme.scoreParticle || theme.flapParticle || '#a5d8ff';
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Elegant centered typography
  ctx.textAlign = 'center';

  ctx.fillStyle = '#f1f7ff';
  ctx.font = 'bold 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Serene Postcard', w / 2, h * 0.68);

  ctx.fillStyle = 'rgba(238, 247, 255, 0.85)';
  ctx.font = '18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${themeName} • Score ${state.score}`, w / 2, h * 0.68 + 32);

  ctx.fillStyle = 'rgba(238, 247, 255, 0.55)';
  ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('P or Esc to close  •  Screenshot to share', w / 2, h * 0.68 + 58);

  // Subtle bottom accent line
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.68 + 72);
  ctx.lineTo(w * 0.68, h * 0.68 + 72);
  ctx.stroke();
}

export function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cy);
      line = `${word} `;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, cy);
}

export function roundRect(x, y, w, h, r) {
  // Use native ctx.roundRect when available (Chrome 99+, Safari 16+, Firefox 113+).
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function draw() {
  updatePose();
  ctx.save();
  if (!state.reducedMotion && state.shakeAmount > 0.5) {
    ctx.translate(
      (Math.random() - 0.5) * state.shakeAmount,
      (Math.random() - 0.5) * state.shakeAmount,
    );
  }
  drawBackground();
  drawPipes();
  drawShieldBubbles();
  drawGround();
  drawBirdTrail();
  drawBird();
  drawBirdShield();
  drawWeatherParticles();
  drawParticles();
  drawScore();
  drawCalmMeter();
  drawNearMissFlash();
  drawVignette();
  drawFpsCounter();
  ctx.restore();

  // Pick subtitle by score bracket for game-over
  if (state.phase === 'start') {
    drawPanel(
      'The air is waiting.',
      'Tap or press Space. Brake (Shift) softens the fall. Dive (↓) for control. On phones the buttons are always there.',
      'Esc Pause • M Mute • R Restart',
    );
  } else if (state.paused && state.postcardMode) {
    drawPostcard();
  } else if (state.paused) {
    drawPanel(
      'Paused',
      `Score: ${state.score}. Take a breath. The wind will still be here when you return.`,
      'Esc or Pause to resume • M for sound',
    );
  } else if (state.afterglowActive && state.phase === 'gameOver') {
    // The beautiful Afterglow reflection moment — world is frozen, bird calm, gentle particles linger
    drawPanel(
      'You flew well.',
      state.afterglowReflection || 'The wind remembers this one.',
      'Any tap or key to continue',
      { newBest: state.isNewBest },
    );
  } else if (state.phase === 'gameOver') {
    const title = state.isNewBest ? 'A quiet record.' : pickGameOverTitle(state.score);
    const sub = state.isNewBest
      ? `New best: ${state.score}. The wind noticed. Take this calm into the next one.`
      : state.best > 0
        ? `Score: ${state.score}. ${state.best - state.score} from your best. The air is kind. Tap or press Space.`
        : `Score: ${state.score}. The air is kind. Tap or press Space to glide again.`;
    drawPanel(title, sub, 'Esc Pause • M Mute • R Restart', { newBest: state.isNewBest });
  }
}

export function pickGameOverTitle(score) {
  if (score >= 35) return 'The wind carried you.';
  if (score >= 25) return 'Beautiful run.';
  if (score >= 18) return 'You found the rhythm.';
  if (score >= 12) return 'Steady glide.';
  if (score >= 6) return 'Soft landing.';
  return 'The air welcomed you.';
}

// ─── 12. UI: drawer, mobile bar, focus trap, fullscreen, haptics ──
