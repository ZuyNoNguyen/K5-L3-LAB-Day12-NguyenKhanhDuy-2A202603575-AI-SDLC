// 3D Third-Person Fairytale Renderer & Interactive Client for "Đảo Đèn Lồng"
// Uses the exact same deterministic Core Engine (src/core/sim.mjs) as Headless mode.
// Features a richly stylized 3D forest island, cloud sea, glowing pagodas, animated Mây with Nón Lá & mini-lantern,
// shadowy Ink Shades, Pentatonic Wind-Chime Web Audio, and Guiding Spirit Wisp.

import { GameSimulation, DEFAULT_TUNING, ISLAND_RADIUS, distXZ, createPRNG } from '../core/sim.mjs';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hudFlames = document.getElementById('hud-flames');
const hudMotes = document.getElementById('hud-motes');
const hudLanterns = document.getElementById('hud-lanterns');
const hudTime = document.getElementById('hud-time');
const hudScore = document.getElementById('hud-score');
const actionPrompt = document.getElementById('action-prompt');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalScore = document.getElementById('modal-score');
const btnRestart = document.getElementById('btn-restart');

// --- CREATIVE FEATURE 1: Procedural Pentatonic Wind-Chime Web Audio Synthesizer ---
class PentatonicAudio {
  constructor() {
    this.ctx = null;
    this.notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    this.noteIdx = 0;
  }

  _ensure() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMoteChime() {
    try {
      this._ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = this.notes[this.noteIdx % this.notes.length];
      this.noteIdx++;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  playLanternLit() {
    try {
      this._ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.18, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.8);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.8);
      });
    } catch {}
  }

  playPulseWave() {
    try {
      this._ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.4);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  playHit() {
    try {
      this._ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }
}

const audio = new PentatonicAudio();

// --- Game & Input State ---
let sim = new GameSimulation({ seed: 202603575, night: 1, tuning: DEFAULT_TUNING });
let camYawDeg = 0; // Look toward +Z from behind player (camera sits at -Z)
let camPitch = 0.40;
let camDist = 13.5;
let playerFacingYaw = 0;
let walkCycle = 0;

let pulseRings = [];
let spiritParticles = [];

// --- Build Rich Visual Scenery (Trees, Mushrooms, Rocks, Cloud Sea, Stars) ---
// Purely visual scenery props; never alters sim.mjs state!
const sceneryRng = createPRNG(999111);
const forestTrees = [];
const glowingFlora = [];
const cloudPuffs = [];
const stars = [];

function initVisualScenery() {
  forestTrees.length = 0;
  glowingFlora.length = 0;
  cloudPuffs.length = 0;
  stars.length = 0;

  // 1. Stars in night sky
  for (let i = 0; i < 90; i++) {
    stars.push({
      xRatio: sceneryRng(),
      yRatio: sceneryRng() * 0.48,
      size: 0.8 + sceneryRng() * 1.8,
      phase: sceneryRng() * Math.PI * 2
    });
  }

  // 2. Cloud Sea puffs floating around the island rim
  for (let i = 0; i < 42; i++) {
    const angle = (i / 42) * Math.PI * 2 + sceneryRng() * 0.1;
    const dist = ISLAND_RADIUS + 5 + sceneryRng() * 18;
    cloudPuffs.push({
      x: Math.cos(angle) * dist,
      y: -2.0 + (sceneryRng() - 0.5) * 2.5,
      z: Math.sin(angle) * dist,
      radius: 5.5 + sceneryRng() * 5.0,
      speed: 0.2 + sceneryRng() * 0.4,
      phase: sceneryRng() * Math.PI * 2
    });
  }

  // 3. Fairytale Forest Trees (Pine / Banyan / Bamboo-inspired layered trees)
  // Avoid spawning right on top of player start (0,0,0) or lantern pillars
  for (let i = 0; i < 55; i++) {
    const angle = sceneryRng() * Math.PI * 2;
    const r = 5.5 + sceneryRng() * (ISLAND_RADIUS - 7.5);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Keep clear of the 5 Grand Lantern positions
    let tooCloseToLantern = false;
    for (const l of sim.lanterns) {
      if (Math.hypot(x - l.pos[0], z - l.pos[2]) < 3.6) {
        tooCloseToLantern = true;
        break;
      }
    }
    if (tooCloseToLantern) continue;

    const kind = sceneryRng() < 0.35 ? 'ancient' : 'pine';
    const height = kind === 'ancient' ? 4.2 + sceneryRng() * 1.8 : 3.5 + sceneryRng() * 2.2;
    const canopyRadius = kind === 'ancient' ? 1.8 + sceneryRng() * 0.7 : 1.3 + sceneryRng() * 0.5;
    forestTrees.push({
      x,
      z,
      kind,
      height,
      canopyRadius,
      swayPhase: sceneryRng() * Math.PI * 2,
      hueShift: sceneryRng()
    });
  }

  // 4. Glowing Fairytale Mushrooms, Ferns & Moss Stones
  for (let i = 0; i < 65; i++) {
    const angle = sceneryRng() * Math.PI * 2;
    const r = 2.5 + sceneryRng() * (ISLAND_RADIUS - 4.0);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const type = sceneryRng() < 0.55 ? 'mushroom' : sceneryRng() < 0.8 ? 'bush' : 'rock';
    glowingFlora.push({
      x,
      z,
      type,
      scale: 0.6 + sceneryRng() * 0.7,
      phase: sceneryRng() * Math.PI * 2
    });
  }
}

initVisualScenery();

// --- Controls ---
const keys = new Set();
let pendingJump = false;
let pendingInteract = false;
let pendingPulse = false;

window.addEventListener('keydown', (e) => {
  const code = e.code;
  keys.add(code);
  if (code === 'Space') pendingJump = true;
  if (code === 'KeyE') pendingInteract = true;
  if (code === 'KeyF') pendingPulse = true;
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

let isDragging = false;
let lastMouseX = 0;
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
});
window.addEventListener('mouseup', () => {
  isDragging = false;
});
window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - lastMouseX;
    lastMouseX = e.clientX;
    camYawDeg = (camYawDeg + dx * 0.45 + 360) % 360;
  }
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function restartGame() {
  sim = new GameSimulation({
    seed: Math.floor(performance.now()) % 1000000,
    night: 1,
    tuning: DEFAULT_TUNING
  });
  pulseRings = [];
  spiritParticles = [];
  modalOverlay.style.display = 'none';
}

btnRestart.addEventListener('click', restartGame);

window.__GAME_DEBUG__ = {
  getSim: () => sim,
  triggerPulse: () => {
    pendingPulse = true;
  },
  triggerInteract: () => {
    pendingInteract = true;
  }
};

// --- 3D Perspective Camera Projection Engine ---
function getCameraPose() {
  const yawRad = (camYawDeg * Math.PI) / 180;
  const targetX = sim.player.pos[0];
  const targetY = sim.player.pos[1] + 1.45;
  const targetZ = sim.player.pos[2];

  const forwardX = Math.sin(yawRad);
  const forwardZ = Math.cos(yawRad);

  const camX = targetX - forwardX * camDist * Math.cos(camPitch);
  const camY = targetY + camDist * Math.sin(camPitch);
  const camZ = targetZ - forwardZ * camDist * Math.cos(camPitch);

  return { camX, camY, camZ, targetX, targetY, targetZ, forwardX, forwardZ };
}

function project3D(wx, wy, wz, cam) {
  let fx = cam.targetX - cam.camX;
  let fy = cam.targetY - cam.camY;
  let fz = cam.targetZ - cam.camZ;
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  // Right vector in world space = (fz, 0, -fx) so +X projects right on screen at yaw=0
  let rx = fz;
  let ry = 0;
  let rz = -fx;
  const rLen = Math.hypot(rx, rz) || 1;
  rx /= rLen;
  rz /= rLen;

  // Up vector = cross(forward, right)
  const ux = fy * rz - fz * ry;
  const uy = fz * rx - fx * rz;
  const uz = fx * ry - fy * rx;

  const dx = wx - cam.camX;
  const dy = wy - cam.camY;
  const dz = wz - cam.camZ;

  const cx = dx * rx + dy * ry + dz * rz;
  const cy = dx * ux + dy * uy + dz * uz;
  const cz = dx * fx + dy * fy + dz * fz;

  if (cz <= 0.25) return null;

  const fovScale = Math.min(canvas.width, canvas.height) * 0.92;
  const sx = canvas.width * 0.5 + (cx / cz) * fovScale;
  const sy = canvas.height * 0.5 - (cy / cz) * fovScale;
  const scale = fovScale / cz;

  return { sx, sy, cz, scale };
}

// Compute how illuminated any (x, z) point on the island is (from 0.0 dark mist to 1.0 warm golden light)
function getLocalWarmth(wx, wz) {
  let w = 0;
  // Mây's own personal lantern glow
  const dPlayer = Math.hypot(wx - sim.player.pos[0], wz - sim.player.pos[2]);
  if (dPlayer < 12) {
    w = Math.max(w, (1 - dPlayer / 12) * 0.75);
  }
  // Lit Grand Lanterns cast a broad 18m golden warmth aura
  for (const l of sim.lanterns) {
    if (l.lit) {
      const dl = Math.hypot(wx - l.pos[0], wz - l.pos[2]);
      if (dl < 20) {
        w = Math.max(w, 1 - dl / 20);
      }
    }
  }
  return Math.min(1, w);
}

function stepClientSimulation() {
  if (sim.state !== 'playing') return;

  if (keys.has('KeyQ')) camYawDeg = (camYawDeg - 1.8 + 360) % 360;
  if (keys.has('KeyR')) camYawDeg = (camYawDeg + 1.8) % 360;

  let mx = 0;
  let mz = 0;
  // W (+Z at yaw=0) = forward, S (-Z) = backward, A (-X) = left, D (+X) = right
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

  if (mx !== 0 || mz !== 0) {
    const theta = (camYawDeg * Math.PI) / 180;
    const wx = mx * Math.cos(theta) + mz * Math.sin(theta);
    const wz = -mx * Math.sin(theta) + mz * Math.cos(theta);
    playerFacingYaw = Math.atan2(wx, wz);
    walkCycle += 0.24;
  } else {
    walkCycle *= 0.85;
  }

  const events = sim.step({
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: pendingJump,
    interact: pendingInteract,
    pulse: pendingPulse
  });

  if (pendingJump) {
    sim.inputState.jump = false;
    pendingJump = false;
  }
  if (pendingInteract) {
    sim.inputState.interact = false;
    pendingInteract = false;
  }
  if (pendingPulse) {
    sim.inputState.pulse = false;
    pendingPulse = false;
  }

  for (const ev of events) {
    if (ev.name === 'mote_picked') {
      audio.playMoteChime();
      for (let i = 0; i < 10; i++) {
        spiritParticles.push({
          x: sim.player.pos[0] + (Math.random() - 0.5) * 1.4,
          y: sim.player.pos[1] + 0.6,
          z: sim.player.pos[2] + (Math.random() - 0.5) * 1.4,
          vy: 1.5 + Math.random() * 1.8,
          life: 35
        });
      }
    } else if (ev.name === 'lantern_lit') {
      audio.playLanternLit();
      const litL = sim.lanterns.find((l) => l.id === ev.data.lantern_id);
      if (litL) {
        pulseRings.push({
          x: litL.pos[0],
          z: litL.pos[2],
          radius: 0.8,
          maxRadius: 16.0,
          alpha: 1.0
        });
      }
    } else if (ev.name === 'pulse') {
      audio.playPulseWave();
      pulseRings.push({
        x: sim.player.pos[0],
        z: sim.player.pos[2],
        radius: 0.5,
        maxRadius: sim.tuning.pulse_radius,
        alpha: 1.0
      });
    } else if (ev.name === 'player_hit') {
      audio.playHit();
    } else if (ev.name === 'game_over') {
      showGameOverModal(ev.data);
    }
  }

  for (let i = pulseRings.length - 1; i >= 0; i--) {
    const r = pulseRings[i];
    r.radius += (r.maxRadius - r.radius) * 0.14;
    r.alpha -= 0.035;
    if (r.alpha <= 0) pulseRings.splice(i, 1);
  }
  for (let i = spiritParticles.length - 1; i >= 0; i--) {
    const p = spiritParticles[i];
    p.y += p.vy * (1 / 60);
    p.life--;
    if (p.life <= 0) spiritParticles.splice(i, 1);
  }
}

function showGameOverModal({ result, reason }) {
  modalOverlay.style.display = 'flex';
  if (result === 'won') {
    modalTitle.textContent = '🌕 Đảo Bến Rực Sáng!';
    modalTitle.style.color = '#fbbf24';
    modalDesc.textContent =
      'Mây đã thắp sáng toàn bộ 5 Đèn Lồng Lớn, xua tan Bóng Mực và đem lại hơi ấm cổ tích cho khu rừng Đảo Bến!';
  } else {
    modalTitle.textContent = '🌑 Sương Đen Bao Phủ...';
    modalTitle.style.color = '#c084fc';
    modalDesc.textContent =
      reason === 'no_flames'
        ? 'Ngọn lửa của Mây đã tắt trước Bóng Mực. Hãy dùng [F] Tỏa sáng hoặc đứng trong vòng sáng Đèn Lồng!'
        : 'Đêm đã tàn trước khi cả 5 Đèn Lồng Lớn được thắp sáng.';
  }
  modalScore.textContent = `Tổng điểm: ${sim.score}`;
}

function updateHUD() {
  const litCount = sim.lanterns.filter((l) => l.lit).length;
  hudFlames.textContent = `${sim.player.flames}`;
  hudMotes.textContent = `${sim.player.carried} / ${sim.tuning.carry_capacity}`;
  hudLanterns.textContent = `${litCount} / ${sim.lanterns.length}`;
  hudTime.textContent = `${sim.time_left_s.toFixed(1)}s`;
  hudScore.textContent = `${sim.score}`;

  let nearUnlit = null;
  for (const l of sim.lanterns) {
    if (!l.lit && distXZ(sim.player.pos, l.pos) <= sim.tuning.interact_radius) {
      nearUnlit = l;
      break;
    }
  }
  if (nearUnlit && sim.state === 'playing') {
    const need = sim.tuning.lantern_cost - nearUnlit.deposited;
    actionPrompt.style.display = 'block';
    actionPrompt.textContent =
      sim.player.carried > 0
        ? `Nhấn [E] nạp đom đóm vào Đèn ${nearUnlit.id} (Cần thêm ${need} ✨)`
        : `Đèn ${nearUnlit.id} cần thêm ${need} ✨ — Hãy gom đom đóm trong rừng!`;
  } else {
    actionPrompt.style.display = 'none';
  }
}

function drawGroundPolygon(points3D, cam, fillStyle, strokeStyle = null, lineWidth = 1.5) {
  const projected = [];
  for (const pt of points3D) {
    const p = project3D(pt[0], pt[1], pt[2], cam);
    if (!p) return;
    projected.push(p);
  }
  ctx.beginPath();
  ctx.moveTo(projected[0].sx, projected[0].sy);
  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].sx, projected[i].sy);
  }
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawCircleXZ(cx, y, cz, radius, segments, cam, fillStyle, strokeStyle, lineWidth = 1.5) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    pts.push([cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius]);
  }
  drawGroundPolygon(pts, cam, fillStyle, strokeStyle, lineWidth);
}

// Draw stone pathways radiating from center plaza (0,0,0) to each of the 5 Grand Lanterns
function drawStonePaths(cam, globalWarmth) {
  const pathAlpha = 0.22 + globalWarmth * 0.25;
  for (const l of sim.lanterns) {
    const steps = 9;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = l.pos[0] * t;
      const pz = l.pos[2] * t;
      const stoneColor = l.lit
        ? `rgba(251, 191, 36, ${pathAlpha + 0.15})`
        : `rgba(148, 163, 184, ${pathAlpha})`;
      drawCircleXZ(px, 0.015, pz, 0.95, 8, cam, stoneColor, null);
    }
  }
}

function renderScene(timeMs) {
  const litCount = sim.lanterns.filter((l) => l.lit).length;
  const globalWarmth = litCount / Math.max(1, sim.lanterns.length);

  // 1. Fairytale Night Sky & Moon / Stars
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (globalWarmth >= 0.8) {
    skyGrad.addColorStop(0, '#17153b');
    skyGrad.addColorStop(0.55, '#3b1c54');
    skyGrad.addColorStop(1, '#7c2d12');
  } else if (globalWarmth >= 0.4) {
    skyGrad.addColorStop(0, '#0f0c29');
    skyGrad.addColorStop(0.6, '#24143d');
    skyGrad.addColorStop(1, '#431407');
  } else {
    skyGrad.addColorStop(0, '#05030d');
    skyGrad.addColorStop(0.6, '#120924');
    skyGrad.addColorStop(1, '#1e102e');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Twinkling stars
  for (const st of stars) {
    const twinkle = 0.35 + 0.65 * Math.sin(timeMs * 0.003 + st.phase);
    ctx.fillStyle = `rgba(254, 243, 199, ${twinkle * (0.5 + globalWarmth * 0.5)})`;
    ctx.beginPath();
    ctx.arc(st.xRatio * canvas.width, st.yRatio * canvas.height, st.size, 0, Math.PI * 2);
    ctx.fill();
  }

  const cam = getCameraPose();

  // 2. Floating Sea of Clouds around the Island
  for (const cl of cloudPuffs) {
    const driftX = cl.x + Math.sin(timeMs * 0.0005 * cl.speed + cl.phase) * 2.0;
    const driftZ = cl.z + Math.cos(timeMs * 0.0005 * cl.speed + cl.phase) * 2.0;
    const p = project3D(driftX, cl.y, driftZ, cam);
    if (p) {
      const r = Math.max(12, p.scale * cl.radius);
      const grad = ctx.createRadialGradient(p.sx, p.sy, r * 0.1, p.sx, p.sy, r);
      const cAlpha = 0.14 + globalWarmth * 0.16;
      grad.addColorStop(0, globalWarmth > 0.5 ? `rgba(251, 191, 36, ${cAlpha})` : `rgba(139, 92, 246, ${cAlpha})`);
      grad.addColorStop(1, 'rgba(15, 11, 29, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Island Terrain (Cliff Rim + Lush Forest Turf + Warm Light Pools)
  // Cliff underside rim
  drawCircleXZ(0, -1.2, 0, ISLAND_RADIUS * 1.02, 48, cam, '#0f0a1c', '#2e1065', 2);

  // Main forest turf (transitions from deep mystical teal-indigo to warm emerald-gold as lanterns light up)
  const grassR = Math.round(18 + globalWarmth * 34);
  const grassG = Math.round(32 + globalWarmth * 58);
  const grassB = Math.round(38 + globalWarmth * 12);
  drawCircleXZ(
    0,
    0,
    0,
    ISLAND_RADIUS,
    56,
    cam,
    `rgb(${grassR}, ${grassG}, ${grassB})`,
    `rgba(251, 191, 36, ${0.3 + globalWarmth * 0.45})`,
    3
  );

  // Inner forest clearing & central stone sanctuary
  drawCircleXZ(
    0,
    0.01,
    0,
    25.0,
    44,
    cam,
    `rgba(${28 + Math.round(globalWarmth * 45)}, ${46 + Math.round(globalWarmth * 55)}, 42, 0.55)`,
    'rgba(251, 191, 36, 0.22)',
    1.5
  );
  drawCircleXZ(
    0,
    0.02,
    0,
    4.2,
    24,
    cam,
    'rgba(251, 191, 36, 0.12)',
    'rgba(251, 191, 36, 0.4)',
    1.5
  );

  // Stone paths connecting center to the 5 Grand Lanterns
  drawStonePaths(cam, globalWarmth);

  // Warm Ground Illumination Pools under Mây and under each Lit Grand Lantern
  drawCircleXZ(
    sim.player.pos[0],
    0.025,
    sim.player.pos[2],
    5.5,
    24,
    cam,
    'rgba(251, 191, 36, 0.11)',
    null
  );

  for (const lantern of sim.lanterns) {
    if (lantern.lit) {
      // Broad warm golden forest glow
      drawCircleXZ(
        lantern.pos[0],
        0.02,
        lantern.pos[2],
        14.0,
        32,
        cam,
        'rgba(245, 158, 11, 0.12)',
        null
      );
      // Safe-radius protective sanctuary ring (Shades cannot cross!)
      drawCircleXZ(
        lantern.pos[0],
        0.03,
        lantern.pos[2],
        sim.tuning.safe_radius,
        32,
        cam,
        'rgba(251, 191, 36, 0.18)',
        'rgba(253, 224, 71, 0.85)',
        2.5
      );
    } else {
      // Dark unlit lantern interact ring
      drawCircleXZ(
        lantern.pos[0],
        0.025,
        lantern.pos[2],
        sim.tuning.interact_radius,
        24,
        cam,
        'rgba(30, 27, 75, 0.25)',
        'rgba(253, 224, 71, 0.3)',
        1.2
      );
    }
  }

  // Active Pulse shockwaves
  for (const ring of pulseRings) {
    drawCircleXZ(
      ring.x,
      0.15,
      ring.z,
      ring.radius,
      36,
      cam,
      `rgba(253, 224, 71, ${ring.alpha * 0.25})`,
      `rgba(254, 240, 138, ${ring.alpha})`,
      3.5
    );
  }

  // --- Collect all 3D Objects for Depth-Sorted Painter's Algorithm ---
  const renderList = [];

  // A. Forest Trees (3D Trunks + Multi-Tiered Conical / Lush Canopies)
  for (const tree of forestTrees) {
    const sway = Math.sin(timeMs * 0.0018 + tree.swayPhase) * 0.18;
    const baseP = project3D(tree.x, 0, tree.z, cam);
    const trunkTopP = project3D(tree.x + sway * 0.3, tree.height * 0.42, tree.z, cam);
    const midP = project3D(tree.x + sway * 0.6, tree.height * 0.72, tree.z, cam);
    const tipP = project3D(tree.x + sway, tree.height, tree.z, cam);

    if (!baseP || !trunkTopP || !midP || !tipP) continue;
    // Skip if offscreen
    if (baseP.sx < -200 || baseP.sx > canvas.width + 200) continue;

    const localW = Math.max(globalWarmth * 0.75, getLocalWarmth(tree.x, tree.z));

    renderList.push({
      depth: baseP.cz,
      draw: () => {
        const s = baseP.scale;
        // Soft ground shadow
        ctx.fillStyle = 'rgba(5, 3, 14, 0.45)';
        ctx.beginPath();
        ctx.ellipse(baseP.sx, baseP.sy, Math.max(4, s * 0.9), Math.max(2, s * 0.4), 0, 0, Math.PI * 2);
        ctx.fill();

        // Wooden trunk
        ctx.strokeStyle = localW > 0.4 ? '#78350f' : '#3b2314';
        ctx.lineWidth = Math.max(3, s * 0.34);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(baseP.sx, baseP.sy);
        ctx.lineTo(trunkTopP.sx, trunkTopP.sy);
        ctx.stroke();

        // Canopy colors: shifts from dark twilight forest green/indigo to warm golden-tipped emerald
        const cDark = localW > 0.45 ? '#14532d' : '#0f292f';
        const cMid = localW > 0.45 ? '#15803d' : '#134e4a';
        const cRim = localW > 0.35 ? `rgba(251, 191, 36, ${localW * 0.7})` : 'rgba(56, 189, 248, 0.15)';

        if (tree.kind === 'pine') {
          // 3 layered conical foliage tiers
          const tiers = [
            { bot: trunkTopP, top: midP, w: s * tree.canopyRadius * 1.15, color: cDark },
            {
              bot: midP,
              top: tipP,
              w: s * tree.canopyRadius * 0.88,
              color: cMid
            }
          ];
          for (const t of tiers) {
            ctx.fillStyle = t.color;
            ctx.strokeStyle = cRim;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(t.bot.sx - t.w, t.bot.sy);
            ctx.lineTo(t.bot.sx + t.w, t.bot.sy);
            ctx.lineTo(t.top.sx, t.top.sy - t.w * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else {
          // Ancient Banyan / Round layered fairytale crown with hanging lantern blossom
          const r1 = Math.max(8, s * tree.canopyRadius * 0.95);
          const r2 = Math.max(6, s * tree.canopyRadius * 0.72);

          ctx.fillStyle = cDark;
          ctx.beginPath();
          ctx.arc(trunkTopP.sx - r1 * 0.35, trunkTopP.sy, r2, 0, Math.PI * 2);
          ctx.arc(trunkTopP.sx + r1 * 0.35, trunkTopP.sy, r2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = cMid;
          ctx.strokeStyle = cRim;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(midP.sx, midP.sy, r1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  }

  // B. Glowing Fairytale Mushrooms, Forest Bushes & Mossy Rocks
  for (const fl of glowingFlora) {
    const p = project3D(fl.x, 0, fl.z, cam);
    if (!p || p.sx < -80 || p.sx > canvas.width + 80) continue;
    const localW = Math.max(globalWarmth * 0.6, getLocalWarmth(fl.x, fl.z));

    renderList.push({
      depth: p.cz,
      draw: () => {
        const s = p.scale * fl.scale;
        if (fl.type === 'mushroom') {
          const stemH = Math.max(3, s * 0.45);
          const capR = Math.max(3, s * 0.42);
          // Stem
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = Math.max(1.5, s * 0.14);
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(p.sx, p.sy - stemH);
          ctx.stroke();
          // Glowing mushroom cap
          ctx.fillStyle = localW > 0.35 ? '#fb923c' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(p.sx, p.sy - stemH, capR, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
        } else if (fl.type === 'bush') {
          const r = Math.max(4, s * 0.65);
          ctx.fillStyle = localW > 0.4 ? '#166534' : '#113e3b';
          ctx.beginPath();
          ctx.arc(p.sx - r * 0.4, p.sy - r * 0.3, r * 0.7, 0, Math.PI * 2);
          ctx.arc(p.sx + r * 0.4, p.sy - r * 0.3, r * 0.7, 0, Math.PI * 2);
          ctx.arc(p.sx, p.sy - r * 0.55, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Mossy rock
          const r = Math.max(4, s * 0.6);
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = localW > 0.4 ? '#ca8a04' : '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(p.sx, p.sy - r * 0.3, r, r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  }

  // C. Fireflies (Đom đóm - Warm Golden-Orange Light with Wings & Trail)
  for (const m of sim.motes) {
    const phase = timeMs * 0.006 + Number(m.id.slice(1));
    const bobY = 0.65 + 0.25 * Math.sin(phase);
    const proj = project3D(m.pos[0], bobY, m.pos[2], cam);
    const shadowP = project3D(m.pos[0], 0.02, m.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(3.5, proj.scale * 0.26);
          if (shadowP) {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
            ctx.beginPath();
            ctx.ellipse(shadowP.sx, shadowP.sy, r * 1.4, r * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Warm golden-amber halo
          const grad = ctx.createRadialGradient(proj.sx, proj.sy, 1, proj.sx, proj.sy, r * 3.2);
          grad.addColorStop(0, '#fffbeb');
          grad.addColorStop(0.35, '#fbbf24');
          grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.45)');
          grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 3.2, 0, Math.PI * 2);
          ctx.fill();

          // Flapping translucent fairy wings
          const wingSpread = r * (1.1 + 0.4 * Math.sin(timeMs * 0.03 + phase));
          ctx.fillStyle = 'rgba(254, 249, 195, 0.85)';
          ctx.beginPath();
          ctx.ellipse(proj.sx - wingSpread * 0.6, proj.sy - r * 0.3, wingSpread * 0.6, r * 0.35, -0.4, 0, Math.PI * 2);
          ctx.ellipse(proj.sx + wingSpread * 0.6, proj.sy - r * 0.3, wingSpread * 0.6, r * 0.35, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  // D. 5 Grand Lantern Shrines (Đèn Lồng Lớn L1..L5 - Wooden Pagoda Frame & Glowing Silk Core)
  for (const l of sim.lanterns) {
    const baseP = project3D(l.pos[0], 0, l.pos[2], cam);
    const midP = project3D(l.pos[0], 2.2, l.pos[2], cam);
    const topP = project3D(l.pos[0], 3.9, l.pos[2], cam);
    const roofTipP = project3D(l.pos[0], 4.9, l.pos[2], cam);
    if (baseP && midP && topP && roofTipP) {
      renderList.push({
        depth: baseP.cz,
        draw: () => {
          const s = baseP.scale;
          // Stone pedestal at base
          const pedW = Math.max(8, s * 1.1);
          const pedH = Math.max(4, s * 0.38);
          ctx.fillStyle = l.lit ? '#78350f' : '#334155';
          ctx.strokeStyle = l.lit ? '#f59e0b' : '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(baseP.sx, baseP.sy, pedW, pedH, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Carved wooden pillar
          ctx.strokeStyle = l.lit ? '#b45309' : '#475569';
          ctx.lineWidth = Math.max(4, s * 0.36);
          ctx.beginPath();
          ctx.moveTo(baseP.sx, baseP.sy);
          ctx.lineTo(topP.sx, topP.sy);
          ctx.stroke();

          const r = Math.max(10, topP.scale * 1.05);

          // Warm golden-amber volumetric glow when lit (or partial amber ember when partially deposited)
          if (l.lit || l.deposited > 0) {
            const glowRadius = l.lit ? r * 4.5 : r * (1.6 + l.deposited * 0.5);
            const glow = ctx.createRadialGradient(topP.sx, topP.sy, 2, topP.sx, topP.sy, glowRadius);
            glow.addColorStop(0, '#fffbeb');
            glow.addColorStop(0.3, l.lit ? 'rgba(251, 191, 36, 0.9)' : 'rgba(251, 191, 36, 0.5)');
            glow.addColorStop(0.65, l.lit ? 'rgba(234, 88, 12, 0.4)' : 'rgba(234, 88, 12, 0.15)');
            glow.addColorStop(1, 'rgba(234, 88, 12, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(topP.sx, topP.sy, glowRadius, 0, Math.PI * 2);
            ctx.fill();
          }

          // Hexagonal / Traditional Silk Lantern Body
          ctx.fillStyle = l.lit ? '#fde047' : l.deposited > 0 ? '#78350f' : '#1e293b';
          ctx.strokeStyle = l.lit ? '#d97706' : '#94a3b8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(topP.sx - r * 0.65, topP.sy - r * 0.75);
          ctx.lineTo(topP.sx + r * 0.65, topP.sy - r * 0.75);
          ctx.lineTo(topP.sx + r * 0.85, topP.sy);
          ctx.lineTo(topP.sx + r * 0.55, topP.sy + r * 0.75);
          ctx.lineTo(topP.sx - r * 0.55, topP.sy + r * 0.75);
          ctx.lineTo(topP.sx - r * 0.85, topP.sy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Red/Gold tassel hanging below lantern
          ctx.strokeStyle = l.lit ? '#ef4444' : '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(topP.sx, topP.sy + r * 0.75);
          ctx.lineTo(topP.sx, topP.sy + r * 1.35);
          ctx.stroke();

          // Curved Oriental Pagoda Roof
          ctx.fillStyle = l.lit ? '#9a3412' : '#0f172a';
          ctx.strokeStyle = l.lit ? '#fbbf24' : '#475569';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(topP.sx - r * 1.25, topP.sy - r * 0.65);
          ctx.quadraticCurveTo(topP.sx, topP.sy - r * 1.0, roofTipP.sx, roofTipP.sy);
          ctx.quadraticCurveTo(topP.sx, topP.sy - r * 1.0, topP.sx + r * 1.25, topP.sy - r * 0.65);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Status badge above roof
          ctx.fillStyle = l.lit ? '#fde047' : '#e2e8f0';
          ctx.font = 'bold 12px Segoe UI';
          ctx.textAlign = 'center';
          const statusText = l.lit
            ? `🏮 ${l.id} · ĐÃ THẮP SÁNG`
            : `🏮 ${l.id} (${l.deposited}/${sim.tuning.lantern_cost} ✨)`;
          ctx.fillText(statusText, roofTipP.sx, roofTipP.sy - 10);
        }
      });
    }
  }

  // E. Ink Shades (Bóng Mực - Dark Purple-Black Tendril Spirits in the Fog)
  for (const s of sim.shades) {
    const phase = timeMs * 0.007 + Number(s.id.slice(1) || 1);
    const hoverY = 0.85 + 0.18 * Math.sin(phase);
    const proj = project3D(s.pos[0], hoverY, s.pos[2], cam);
    const shadowP = project3D(s.pos[0], 0.03, s.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(8, proj.scale * 0.9);
          const isStunned = s.state === 'stunned';

          // Dark ink puddle on ground
          if (shadowP) {
            ctx.fillStyle = 'rgba(15, 5, 29, 0.7)';
            ctx.beginPath();
            ctx.ellipse(shadowP.sx, shadowP.sy, r * 1.2, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Dangerous purple-black miasma aura
          const aura = ctx.createRadialGradient(proj.sx, proj.sy, r * 0.2, proj.sx, proj.sy, r * 2.5);
          aura.addColorStop(0, isStunned ? '#a855f7' : '#090314');
          aura.addColorStop(0.55, isStunned ? 'rgba(192, 132, 252, 0.65)' : 'rgba(88, 28, 135, 0.88)');
          aura.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Waving ink tendrils at bottom of cloak
          ctx.fillStyle = isStunned ? '#6b21a8' : '#0b0416';
          ctx.strokeStyle = isStunned ? '#fde047' : '#7e22ce';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy - r * 0.1, r * 0.78, Math.PI, 0);
          for (let t = 3; t >= -3; t--) {
            const tx = proj.sx + (t / 3) * r * 0.78;
            const ty = proj.sy + r * 0.7 + Math.sin(phase + t) * r * 0.22;
            ctx.lineTo(tx, ty);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing ominous eyes (or dizzy stars when stunned)
          ctx.fillStyle = isStunned ? '#fef08a' : '#d946ef';
          ctx.shadowColor = isStunned ? '#facc15' : '#e879f9';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(proj.sx - r * 0.26, proj.sy - r * 0.15, Math.max(2.2, r * 0.15), 0, Math.PI * 2);
          ctx.arc(proj.sx + r * 0.26, proj.sy - r * 0.15, Math.max(2.2, r * 0.15), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          if (isStunned) {
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 11px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('💫 CHOÁNG', proj.sx, proj.sy - r * 1.1);
          }
        }
      });
    }
  }

  // F. Player Character: Mây (Young Lantern Keeper with Nón Lá & Hanging Mini-Lantern!)
  const pFoot = project3D(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2], cam);
  const pHip = project3D(sim.player.pos[0], sim.player.pos[1] + 0.65, sim.player.pos[2], cam);
  const pHead = project3D(sim.player.pos[0], sim.player.pos[1] + 1.55, sim.player.pos[2], cam);
  const pShadow = project3D(sim.player.pos[0], 0.02, sim.player.pos[2], cam);

  if (pFoot && pHip && pHead) {
    renderList.push({
      depth: pFoot.cz,
      draw: () => {
        const s = pHead.scale;
        const blink = sim.player.invuln_ticks > 0 && Math.floor(sim.tick / 4) % 2 === 0;
        if (blink) ctx.globalAlpha = 0.45;

        // Ground shadow
        if (pShadow) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(pShadow.sx, pShadow.sy, Math.max(6, s * 0.65), Math.max(3, s * 0.3), 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Warm protective lantern aura around Mây
        const auraR = Math.max(24, s * 2.8);
        const aura = ctx.createRadialGradient(pHead.sx, pHead.sy, 2, pHead.sx, pHead.sy, auraR);
        aura.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
        aura.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
        aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(pHead.sx, pHead.sy, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Animated walking legs / boots
        const legSwing = Math.sin(walkCycle) * Math.max(3, s * 0.28);
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = Math.max(2.5, s * 0.18);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pHip.sx - s * 0.18, pHip.sy);
        ctx.lineTo(pFoot.sx - s * 0.2 - legSwing, pFoot.sy);
        ctx.moveTo(pHip.sx + s * 0.18, pHip.sy);
        ctx.lineTo(pFoot.sx + s * 0.2 + legSwing, pFoot.sy);
        ctx.stroke();

        // Fairytale Keeper Cloak (Áo choàng giữ đèn màu vàng cam ấm áp)
        const cloakW = Math.max(10, s * 0.82);
        const cloakGrad = ctx.createLinearGradient(pHead.sx, pHead.sy, pFoot.sx, pHip.sy);
        cloakGrad.addColorStop(0, '#fbbf24');
        cloakGrad.addColorStop(0.6, '#ea580c');
        cloakGrad.addColorStop(1, '#9a3412');
        ctx.fillStyle = cloakGrad;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pHead.sx - cloakW * 0.35, pHead.sy + s * 0.1);
        ctx.lineTo(pHead.sx + cloakW * 0.35, pHead.sy + s * 0.1);
        ctx.lineTo(pHip.sx + cloakW, pHip.sy + s * 0.15);
        ctx.quadraticCurveTo(pHip.sx, pHip.sy + s * 0.35, pHip.sx - cloakW, pHip.sy + s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mây's Head & Scarf
        const headR = Math.max(5, s * 0.38);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(pHead.sx, pHead.sy, headR, 0, Math.PI * 2);
        ctx.fill();

        // Conical Vietnamese Bamboo Hat (Nón Lá) with woven ribs
        const hatW = Math.max(16, s * 1.45);
        const hatH = Math.max(10, s * 0.82);
        const hatGrad = ctx.createLinearGradient(pHead.sx, pHead.sy - hatH, pHead.sx, pHead.sy + hatH * 0.2);
        hatGrad.addColorStop(0, '#fef08a');
        hatGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = hatGrad;
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pHead.sx - hatW, pHead.sy + hatH * 0.15);
        ctx.quadraticCurveTo(pHead.sx, pHead.sy + hatH * 0.38, pHead.sx + hatW, pHead.sy + hatH * 0.15);
        ctx.lineTo(pHead.sx, pHead.sy - hatH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Woven concentric rings on Nón Lá
        ctx.strokeStyle = 'rgba(146, 64, 14, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pHead.sx - hatW * 0.55, pHead.sy - hatH * 0.32);
        ctx.quadraticCurveTo(pHead.sx, pHead.sy - hatH * 0.18, pHead.sx + hatW * 0.55, pHead.sy - hatH * 0.32);
        ctx.stroke();

        // Hanging Mini-Lantern dangling from Mây's Nón Lá brim!
        const brimSide = Math.cos(playerFacingYaw - (camYawDeg * Math.PI) / 180) >= 0 ? 1 : -1;
        const brimX = pHead.sx + brimSide * hatW * 0.88;
        const brimY = pHead.sy + hatH * 0.18;
        const swingX = Math.sin(timeMs * 0.008) * Math.max(2, s * 0.12);
        const lanternX = brimX + swingX;
        const lanternY = brimY + Math.max(6, s * 0.48);
        const miniR = Math.max(4.5, s * 0.32);

        // String from Nón Lá brim to Mini-Lantern
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(brimX, brimY);
        ctx.lineTo(lanternX, lanternY);
        ctx.stroke();

        // Mini-Lantern warm glow & body
        const miniGlow = ctx.createRadialGradient(lanternX, lanternY, 1, lanternX, lanternY, miniR * 3.5);
        miniGlow.addColorStop(0, '#ffffff');
        miniGlow.addColorStop(0.35, '#fde047');
        miniGlow.addColorStop(0.7, 'rgba(245, 158, 11, 0.5)');
        miniGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = miniGlow;
        ctx.beginPath();
        ctx.arc(lanternX, lanternY, miniR * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lanternX, lanternY, miniR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Orbiting carried fireflies around Mây
        for (let c = 0; c < sim.player.carried; c++) {
          const orbitAngle = timeMs * 0.004 + (c * Math.PI * 2) / Math.max(1, sim.player.carried);
          const ox = pHip.sx + Math.cos(orbitAngle) * Math.max(14, s * 1.15);
          const oy = pHip.sy - Math.sin(orbitAngle) * Math.max(5, s * 0.35);
          const or = Math.max(3, s * 0.18);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(ox, oy, or, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = 1.0;
      }
    });
  }

  // --- CREATIVE FEATURE 2: Guiding Spirit Wisp ("Tinh linh Hoa Đăng") ---
  if (sim.player.carried > 0) {
    let nearest = null;
    let bestD = Infinity;
    for (const l of sim.lanterns) {
      if (!l.lit) {
        const d = distXZ(sim.player.pos, l.pos);
        if (d < bestD) {
          bestD = d;
          nearest = l;
        }
      }
    }
    if (nearest) {
      // Draw a trail of 3 golden fairy wisps leading from Mây toward the nearest unlit Grand Lantern
      for (let step = 1; step <= 3; step++) {
        const distStep = Math.min(bestD * 0.8, step * 1.4);
        const wx = sim.player.pos[0] + ((nearest.pos[0] - sim.player.pos[0]) / Math.max(1, bestD)) * distStep;
        const wz = sim.player.pos[2] + ((nearest.pos[2] - sim.player.pos[2]) / Math.max(1, bestD)) * distStep;
        const wy = 1.0 + 0.2 * Math.sin(timeMs * 0.006 + step);
        const pWisp = project3D(wx, wy, wz, cam);
        if (pWisp) {
          renderList.push({
            depth: pWisp.cz,
            draw: () => {
              const r = Math.max(3.5, pWisp.scale * (0.28 - step * 0.05));
              const g = ctx.createRadialGradient(pWisp.sx, pWisp.sy, 1, pWisp.sx, pWisp.sy, r * 2.5);
              g.addColorStop(0, '#fef9c3');
              g.addColorStop(0.5, 'rgba(251, 191, 36, 0.7)');
              g.addColorStop(1, 'rgba(245, 158, 11, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(pWisp.sx, pWisp.sy, r * 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }
    }
  }

  // Sort back-to-front by camera depth and draw
  renderList.sort((a, b) => b.depth - a.depth);
  for (const item of renderList) {
    item.draw();
  }

  // Atmospheric Dark Purple-Black Fog Vignette around screen edges (recedes as more lanterns are lit!)
  const fogStrength = Math.max(0.15, 0.68 - globalWarmth * 0.5);
  const vig = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.min(canvas.width, canvas.height) * (0.35 + globalWarmth * 0.25),
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.max(canvas.width, canvas.height) * 0.75
  );
  vig.addColorStop(0, 'rgba(15, 7, 32, 0)');
  vig.addColorStop(1, `rgba(12, 5, 26, ${fogStrength})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Fixed 60 Hz simulation accumulator + requestAnimationFrame render loop
let lastFrameTime = performance.now();
let accumulator = 0;
const STEP_MS = 1000 / 60;

function mainLoop(now) {
  const delta = Math.min(100, now - lastFrameTime);
  lastFrameTime = now;
  accumulator += delta;

  while (accumulator >= STEP_MS) {
    stepClientSimulation();
    accumulator -= STEP_MS;
  }

  updateHUD();
  renderScene(now);
  requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
