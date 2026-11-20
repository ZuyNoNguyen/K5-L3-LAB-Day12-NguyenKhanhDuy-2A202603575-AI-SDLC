// 3D Third-Person Fairytale Renderer & Interactive Client for "Đảo Đèn Lồng"
// Fully updated for Phase 2 / Contract v1.1: 3 Nights, Story Intro, Pause, Settings, HUD & Sound

import { GameSimulation, DEFAULT_TUNING, distXZ, createPRNG } from '../core/sim.mjs';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// HUD elements
const hudFlames = document.getElementById('hud-flames');
const hudTimer = document.getElementById('hud-timer');
const hudNightName = document.getElementById('hud-night-name');
const hudLanterns = document.getElementById('hud-lanterns');
const hudScore = document.getElementById('hud-score');
const moteCountText = document.getElementById('mote-count-text');
const moteSlots = document.querySelectorAll('.mote-slot');
const cdDashOverlay = document.getElementById('cd-dash-overlay');
const cdPulseOverlay = document.getElementById('cd-pulse-overlay');
const actionPrompt = document.getElementById('action-prompt');

// Modals
const introModal = document.getElementById('intro-modal');
const introNightTitle = document.getElementById('intro-night-title');
const introNightStory = document.getElementById('intro-night-story');
const btnStartNight = document.getElementById('btn-start-night');

const pauseModal = document.getElementById('pause-modal');
const btnResume = document.getElementById('btn-resume');
const btnRestartNight = document.getElementById('btn-restart-night');
const btnOpenSettings = document.getElementById('btn-open-settings');

const settingsModal = document.getElementById('settings-modal');
const volSlider = document.getElementById('vol-slider');
const sensSlider = document.getElementById('sens-slider');
const btnCloseSettings = document.getElementById('btn-close-settings');

const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultDesc = document.getElementById('result-desc');
const resultScore = document.getElementById('result-score');
const btnNextNight = document.getElementById('btn-next-night');
const btnRetryNight = document.getElementById('btn-retry-night');

// Saved settings
let masterVolume = Number(localStorage.getItem('dao_den_long_vol') || 80) / 100;
let mouseSens = Number(localStorage.getItem('dao_den_long_sens') || 5) / 5;

volSlider.value = Math.round(masterVolume * 100);
sensSlider.value = Math.round(mouseSens * 5);

volSlider.addEventListener('input', (e) => {
  masterVolume = Number(e.target.value) / 100;
  localStorage.setItem('dao_den_long_vol', e.target.value);
});

sensSlider.addEventListener('input', (e) => {
  mouseSens = Number(e.target.value) / 5;
  localStorage.setItem('dao_den_long_sens', e.target.value);
});

// Sound Synthesizer
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
      if (!this.ctx || masterVolume <= 0) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = this.notes[this.noteIdx % this.notes.length];
      this.noteIdx++;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.25);
      gain.gain.setValueAtTime(0.15 * masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  playLanternLit() {
    try {
      this._ensure();
      if (!this.ctx || masterVolume <= 0) return;
      const now = this.ctx.currentTime;
      [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.2 * masterVolume, now + i * 0.07);
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
      if (!this.ctx || masterVolume <= 0) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.4);
      gain.gain.setValueAtTime(0.22 * masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  playDash() {
    try {
      this._ensure();
      if (!this.ctx || masterVolume <= 0) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
      gain.gain.setValueAtTime(0.18 * masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  playHit() {
    try {
      this._ensure();
      if (!this.ctx || masterVolume <= 0) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
      gain.gain.setValueAtTime(0.2 * masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }
}

const audio = new PentatonicAudio();

// Game State
let currentNight = 1;
let cumulativeScore = 0;
let isGameActive = false;

const NIGHT_INTROS = {
  1: {
    title: 'Đêm 1 — Đảo Bến',
    story: '"Mây ơi, sương đen đã nuốt hết ánh sáng Đảo Bến. Hãy gom đom đóm thắp sáng 5 Đèn Lồng Lớn và coi chừng Bóng Mực!" — Lời Ông Đăng'
  },
  2: {
    title: 'Đêm 2 — Đảo Cau',
    story: '"Hai bờ Đảo Cau nối qua chiếc cầu tre mỏng manh. Hãy dùng Bục Nhảy vượt biển mây và cảnh giác Gió Lạc chực cướp đom đóm!" — Lời Ông Đăng'
  },
  3: {
    title: 'Đêm 3 — Đảo Chuông',
    story: '"Đảo Chuông ba tầng hiểm trở, đỉnh tháp vươn vào sương gió. Hãy theo đường dốc và gió mạnh để thắp ngọn đèn trên cùng!" — Lời Ông Đăng'
  }
};

let sim = new GameSimulation({ seed: 2026, night: currentNight, tuning: DEFAULT_TUNING });
let camYawDeg = 0;
let camPitch = 0.40;
let camDist = 13.5;
let playerFacingYaw = 0;
let walkCycle = 0;

let pulseRings = [];
let spiritParticles = [];

// Visual Props
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

  for (let i = 0; i < 90; i++) {
    stars.push({
      xRatio: sceneryRng(),
      yRatio: sceneryRng() * 0.48,
      size: 0.8 + sceneryRng() * 1.8,
      phase: sceneryRng() * Math.PI * 2
    });
  }

  for (let i = 0; i < 42; i++) {
    const angle = (i / 42) * Math.PI * 2;
    const dist = 42 + sceneryRng() * 18;
    cloudPuffs.push({
      x: Math.cos(angle) * dist,
      y: -2.0 + (sceneryRng() - 0.5) * 2.5,
      z: Math.sin(angle) * dist,
      radius: 5.5 + sceneryRng() * 5.0,
      speed: 0.2 + sceneryRng() * 0.4,
      phase: sceneryRng() * Math.PI * 2
    });
  }

  for (let i = 0; i < 55; i++) {
    const angle = sceneryRng() * Math.PI * 2;
    const r = 5.5 + sceneryRng() * 32;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    let tooClose = false;
    for (const l of sim.lanterns) {
      if (Math.hypot(x - l.pos[0], z - l.pos[2]) < 3.6) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const kind = sceneryRng() < 0.35 ? 'ancient' : 'pine';
    const height = kind === 'ancient' ? 4.2 + sceneryRng() * 1.8 : 3.5 + sceneryRng() * 2.2;
    const canopyRadius = kind === 'ancient' ? 1.8 + sceneryRng() * 0.7 : 1.3 + sceneryRng() * 0.5;
    forestTrees.push({
      x,
      z,
      kind,
      height,
      canopyRadius,
      swayPhase: sceneryRng() * Math.PI * 2
    });
  }

  for (let i = 0; i < 65; i++) {
    const angle = sceneryRng() * Math.PI * 2;
    const r = 2.5 + sceneryRng() * 36;
    glowingFlora.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      type: sceneryRng() < 0.55 ? 'mushroom' : sceneryRng() < 0.8 ? 'bush' : 'rock',
      scale: 0.6 + sceneryRng() * 0.7
    });
  }
}

initVisualScenery();

// Controls
const keys = new Set();
let pendingJump = false;
let pendingInteract = false;
let pendingPulse = false;
let pendingDash = false;
let pendingPause = false;

window.addEventListener('keydown', (e) => {
  const code = e.code;
  keys.add(code);
  if (code === 'Space') pendingJump = true;
  if (code === 'KeyE') pendingInteract = true;
  if (code === 'KeyF') pendingPulse = true;
  if (code === 'ShiftLeft' || code === 'ShiftRight') pendingDash = true;
  if (code === 'Escape' || code === 'KeyP') {
    togglePause();
  }
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
    camYawDeg = (camYawDeg + dx * 0.45 * mouseSens + 360) % 360;
  }
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Button Event Handlers
btnStartNight.addEventListener('click', () => {
  audio._ensure();
  introModal.style.display = 'none';
  isGameActive = true;
});

function togglePause() {
  if (!isGameActive) return;
  pendingPause = true;
  if (pauseModal.style.display === 'flex') {
    pauseModal.style.display = 'none';
  } else {
    pauseModal.style.display = 'flex';
  }
}

btnResume.addEventListener('click', () => {
  togglePause();
});

function startNight(night) {
  currentNight = night;
  sim = new GameSimulation({
    seed: Math.floor(performance.now()) % 1000000,
    night: currentNight,
    tuning: DEFAULT_TUNING
  });
  pulseRings = [];
  spiritParticles = [];

  const info = NIGHT_INTROS[currentNight] || NIGHT_INTROS[1];
  introNightTitle.textContent = info.title;
  introNightStory.textContent = info.story;
  hudNightName.textContent = info.title.toUpperCase();

  introModal.style.display = 'flex';
  pauseModal.style.display = 'none';
  settingsModal.style.display = 'none';
  resultModal.style.display = 'none';
  isGameActive = false;
}

btnRestartNight.addEventListener('click', () => {
  startNight(currentNight);
});

btnOpenSettings.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

btnNextNight.addEventListener('click', () => {
  if (currentNight < 3) {
    startNight(currentNight + 1);
  } else {
    // Game won completely
    startNight(1);
    cumulativeScore = 0;
  }
});

btnRetryNight.addEventListener('click', () => {
  startNight(currentNight);
});

// 3D Perspective Projection
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

  let rx = fz;
  let ry = 0;
  let rz = -fx;
  const rLen = Math.hypot(rx, rz) || 1;
  rx /= rLen;
  rz /= rLen;

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

function stepClientSimulation() {
  if (!isGameActive) return;

  if (keys.has('KeyQ')) camYawDeg = (camYawDeg - 1.8 + 360) % 360;
  if (keys.has('KeyR')) camYawDeg = (camYawDeg + 1.8) % 360;

  let mx = 0;
  let mz = 0;
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
    pulse: pendingPulse,
    dash: pendingDash,
    pause: pendingPause
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
  if (pendingDash) {
    sim.inputState.dash = false;
    pendingDash = false;
  }
  if (pendingPause) {
    sim.inputState.pause = false;
    pendingPause = false;
  }

  for (const ev of events) {
    if (ev.name === 'mote_picked') {
      audio.playMoteChime();
      for (let i = 0; i < 8; i++) {
        spiritParticles.push({
          x: sim.player.pos[0] + (Math.random() - 0.5) * 1.4,
          y: sim.player.pos[1] + 0.6,
          z: sim.player.pos[2] + (Math.random() - 0.5) * 1.4,
          vy: 1.5 + Math.random() * 1.8,
          life: 30
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
    } else if (ev.name === 'dash') {
      audio.playDash();
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
  isGameActive = false;
  resultModal.style.display = 'flex';
  if (result === 'won') {
    cumulativeScore += sim.score;
    if (currentNight < 3) {
      resultTitle.textContent = `🌕 Hoàn Thành ${NIGHT_INTROS[currentNight].title}!`;
      resultDesc.textContent = 'Mây đã thắp sáng toàn bộ Đèn Lồng Lớn và xua tan sương đen!';
      btnNextNight.style.display = 'inline-block';
      btnNextNight.textContent = 'Tiến Vào Đêm Kế Tiếp';
      btnRetryNight.style.display = 'none';
    } else {
      resultTitle.textContent = '☀️ BÌNH MINH ĐÃ VỀ TRÊN ĐẢO ĐÈN LỒNG!';
      resultDesc.textContent = 'Chúc mừng Mây! Bạn đã thắp sáng cả 3 Đêm và xua tan vĩnh viễn sương đen!';
      btnNextNight.style.display = 'inline-block';
      btnNextNight.textContent = 'Chơi Lại Từ Đầu';
      btnRetryNight.style.display = 'none';
    }
  } else {
    resultTitle.textContent = '🌑 Sương Đen Bao Phủ...';
    resultDesc.textContent =
      reason === 'no_flames'
        ? 'Ngọn lửa của Mây đã lụi tàn trước Bóng Mực.'
        : 'Đêm đã tàn trước khi các Đèn Lồng được thắp sáng hoàn toàn.';
    btnNextNight.style.display = 'none';
    btnRetryNight.style.display = 'inline-block';
  }
  resultScore.textContent = `Điểm Đêm: ${sim.score} · Tổng Điểm: ${cumulativeScore + (result === 'won' ? 0 : sim.score)}`;
}

function updateHUD() {
  const litCount = sim.lanterns.filter((l) => l.lit).length;
  hudFlames.textContent = `${sim.player.flames}`;
  hudLanterns.textContent = `${litCount} / ${sim.lanterns.length}`;
  hudScore.textContent = `${sim.score + cumulativeScore}`;

  // Timer mm:ss
  const totalSec = Math.max(0, Math.floor(sim.time_left_s));
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  hudTimer.textContent = `${m}:${s}`;
  if (totalSec <= 30) {
    hudTimer.classList.add('timer-warning');
  } else {
    hudTimer.classList.remove('timer-warning');
  }

  // 10-slot Mote Bar
  moteCountText.textContent = `${sim.player.carried} / 10`;
  moteSlots.forEach((slot, idx) => {
    if (idx < sim.player.carried) {
      slot.classList.add('filled');
    } else {
      slot.classList.remove('filled');
    }
  });

  // Cooldown overlays
  if (sim.player.dash_cd_ticks > 0 && sim.player.charm_ticks <= 0) {
    cdDashOverlay.style.display = 'flex';
    cdDashOverlay.textContent = (sim.player.dash_cd_ticks / 60).toFixed(1) + 's';
  } else {
    cdDashOverlay.style.display = 'none';
  }

  if (sim.player.pulse_cooldown_ticks > 0) {
    cdPulseOverlay.style.display = 'flex';
    cdPulseOverlay.textContent = (sim.player.pulse_cooldown_ticks / 60).toFixed(1) + 's';
  } else {
    cdPulseOverlay.style.display = 'none';
  }

  // Action prompt
  let nearUnlit = null;
  for (const l of sim.lanterns) {
    if (!l.lit && distXZ(sim.player.pos, l.pos) <= sim.tuning.interact_radius) {
      nearUnlit = l;
      break;
    }
  }
  if (nearUnlit && sim.state === 'playing') {
    actionPrompt.style.display = 'block';
    actionPrompt.textContent = `E — Nạp ánh sáng (${nearUnlit.deposited}/${sim.tuning.lantern_cost})`;
  } else {
    actionPrompt.style.display = 'none';
  }
}

function drawCircleXZ(cx, y, cz, radius, segments, cam, fillStyle, strokeStyle, lineWidth = 1.5) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    pts.push([cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius]);
  }
  const projected = [];
  for (const pt of pts) {
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

function renderScene(timeMs) {
  const litCount = sim.lanterns.filter((l) => l.lit).length;
  const globalWarmth = litCount / Math.max(1, sim.lanterns.length);

  // Background Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#0E1430');
  skyGrad.addColorStop(0.6, '#1B2350');
  skyGrad.addColorStop(1, '#2F5D50');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  for (const st of stars) {
    const twinkle = 0.35 + 0.65 * Math.sin(timeMs * 0.003 + st.phase);
    ctx.fillStyle = `rgba(254, 243, 199, ${twinkle * (0.5 + globalWarmth * 0.5)})`;
    ctx.beginPath();
    ctx.arc(st.xRatio * canvas.width, st.yRatio * canvas.height, st.size, 0, Math.PI * 2);
    ctx.fill();
  }

  const cam = getCameraPose();

  // Terrain & Map Elements
  if (currentNight === 1) {
    drawCircleXZ(0, -1.2, 0, 40.5, 48, cam, '#120A1A', '#1B2350', 2);
    drawCircleXZ(0, 0, 0, 40.0, 56, cam, '#2F5D50', 'rgba(242, 193, 78, 0.4)', 3);
  } else if (currentNight === 2) {
    // Island A & B & Bridge
    drawCircleXZ(0, 0, 0, 28.0, 44, cam, '#2F5D50', '#C9B48A', 2);
    drawCircleXZ(70, 0, 0, 28.0, 44, cam, '#2F5D50', '#C9B48A', 2);
    // Jump pads
    drawCircleXZ(20, 0.05, 18, 1.0, 20, cam, '#C8102E', '#F2C14E', 2);
    drawCircleXZ(50, 0.05, -18, 1.0, 20, cam, '#C8102E', '#F2C14E', 2);
  } else if (currentNight === 3) {
    // 3 Tiers
    drawCircleXZ(0, 0, 0, 45.0, 56, cam, '#2F5D50', '#C9B48A', 2);
    drawCircleXZ(0, 6, 0, 8.0, 32, cam, '#6B4A2F', '#F2C14E', 2);
    // Bell Tower at center
    drawCircleXZ(0, 6.1, 0, 2.0, 24, cam, '#120A1A', '#F2C14E', 3);
  }

  // Safe radius rings around lit lanterns
  for (const lantern of sim.lanterns) {
    if (lantern.lit) {
      drawCircleXZ(lantern.pos[0], 0.03, lantern.pos[2], sim.tuning.safe_radius, 32, cam, 'rgba(255, 179, 71, 0.18)', '#FFB347', 2.5);
    }
  }

  // Pulse Shockwave Rings
  for (const ring of pulseRings) {
    drawCircleXZ(ring.x, 0.15, ring.z, ring.radius, 36, cam, `rgba(255, 233, 176, ${ring.alpha * 0.25})`, `rgba(255, 246, 194, ${ring.alpha})`, 3);
  }

  // 3D Objects
  const renderList = [];

  // Grand Lanterns
  for (const l of sim.lanterns) {
    const baseP = project3D(l.pos[0], l.pos[1], l.pos[2], cam);
    const topP = project3D(l.pos[0], l.pos[1] + 3.8, l.pos[2], cam);
    if (baseP && topP) {
      renderList.push({
        depth: baseP.cz,
        draw: () => {
          const s = baseP.scale;
          ctx.strokeStyle = l.lit ? '#FFB347' : '#5B5F6E';
          ctx.lineWidth = Math.max(3, s * 0.32);
          ctx.beginPath();
          ctx.moveTo(baseP.sx, baseP.sy);
          ctx.lineTo(topP.sx, topP.sy);
          ctx.stroke();

          const r = Math.max(8, topP.scale * 1.0);
          if (l.lit) {
            const glow = ctx.createRadialGradient(topP.sx, topP.sy, 2, topP.sx, topP.sy, r * 4.0);
            glow.addColorStop(0, '#FFE9B0');
            glow.addColorStop(0.35, 'rgba(255, 179, 71, 0.85)');
            glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(topP.sx, topP.sy, r * 4.0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = l.lit ? '#FFE9B0' : '#5B5F6E';
          ctx.beginPath();
          ctx.arc(topP.sx, topP.sy, r * 0.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#F5F1E6';
          ctx.font = 'bold 12px Segoe UI';
          ctx.textAlign = 'center';
          ctx.fillText(`🏮 ${l.id} (${l.deposited}/${sim.tuning.lantern_cost})`, topP.sx, topP.sy - r * 1.4);
        }
      });
    }
  }

  // Fireflies (Motes)
  for (const m of sim.motes) {
    const bob = 0.65 + 0.2 * Math.sin(timeMs * 0.005 + Number(m.id.slice(1)));
    const proj = project3D(m.pos[0], m.pos[1] + bob, m.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(3.5, proj.scale * 0.25);
          const grad = ctx.createRadialGradient(proj.sx, proj.sy, 1, proj.sx, proj.sy, r * 2.8);
          grad.addColorStop(0, '#FFF6C2');
          grad.addColorStop(0.5, '#FFE58A');
          grad.addColorStop(1, 'rgba(255, 179, 71, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  // Charms (Bùa Gió)
  for (const c of sim.charms) {
    if (!c.available) continue;
    const bob = 0.7 + 0.2 * Math.sin(timeMs * 0.004);
    const proj = project3D(c.pos[0], c.pos[1] + bob, c.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const s = proj.scale;
          ctx.fillStyle = '#C8102E';
          ctx.strokeStyle = '#F2C14E';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(proj.sx - s * 0.4, proj.sy - s * 0.6, s * 0.8, s * 1.2);
          ctx.fill();
          ctx.stroke();
        }
      });
    }
  }

  // Ink Shades (Bóng Mực)
  for (const s of sim.shades) {
    const hoverY = 0.85 + 0.15 * Math.sin(timeMs * 0.006 + Number(s.id.slice(1) || 1));
    const proj = project3D(s.pos[0], s.pos[1] + hoverY, s.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(7, proj.scale * 0.85);
          const isStun = s.state === 'stunned';
          ctx.fillStyle = isStun ? '#3A3450' : '#120A1A';
          ctx.strokeStyle = '#7A3CFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    }
  }

  // Gió Lạc (Drifters)
  for (const d of sim.drifters) {
    const proj = project3D(d.pos[0], d.pos[1] + 1.2, d.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(6, proj.scale * 0.7);
          ctx.fillStyle = '#8FA3B8';
          ctx.strokeStyle = '#F2C14E';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(proj.sx, proj.sy, r * 1.5, r * 0.6, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    }
  }

  // Player Character: Mây
  const pFoot = project3D(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2], cam);
  const pHead = project3D(sim.player.pos[0], sim.player.pos[1] + 1.55, sim.player.pos[2], cam);
  if (pFoot && pHead) {
    renderList.push({
      depth: pFoot.cz,
      draw: () => {
        const s = pHead.scale;
        const blink = sim.player.invuln_ticks > 0 && Math.floor(sim.tick / 4) % 2 === 0;
        if (blink) ctx.globalAlpha = 0.45;

        // Cloak
        const bodyW = Math.max(8, s * 0.75);
        ctx.fillStyle = '#E8E2D0';
        ctx.strokeStyle = '#C8102E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pHead.sx, pHead.sy);
        ctx.lineTo(pFoot.sx - bodyW, pFoot.sy);
        ctx.lineTo(pFoot.sx + bodyW, pFoot.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Nón Lá
        const hatW = Math.max(14, s * 1.3);
        const hatH = Math.max(9, s * 0.75);
        ctx.fillStyle = '#F2C14E';
        ctx.strokeStyle = '#6B4A2F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pHead.sx - hatW, pHead.sy + hatH * 0.2);
        ctx.lineTo(pHead.sx + hatW, pHead.sy + hatH * 0.2);
        ctx.lineTo(pHead.sx, pHead.sy - hatH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1.0;
      }
    });
  }

  renderList.sort((a, b) => b.depth - a.depth);
  for (const item of renderList) {
    item.draw();
  }
}

// Loop
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
