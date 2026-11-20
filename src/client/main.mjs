// 3D Third-Person Renderer & Interactive Client for "Đảo Đèn Lồng"
// Uses the exact same deterministic Core Engine (src/core/sim.mjs) as Headless mode.
// Creative additions (Pentatonic Wind-Chime Web Audio & Guiding Spirit Wisp) live strictly in client view.

import { GameSimulation, DEFAULT_TUNING, ISLAND_RADIUS, distXZ } from '../core/sim.mjs';

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
    // Vietnamese pentatonic scale (Hò - Xự - Xang - Xê - Cống)
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
    } catch {
      // Ignore audio policy block if user hasn't interacted yet
    }
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
let camPitch = 0.42; // Third-person elevation angle
let camDist = 14.5;
let playerFacingYaw = 0;

// Visual effect rings (Pulse waves & Floating spirit particles)
let pulseRings = [];
let spiritParticles = [];

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
    camYawDeg = (camYawDeg + dx * 0.45) % 360;
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

// Expose test hooks for automated browser inspection
window.__GAME_DEBUG__ = {
  getSim: () => sim,
  triggerPulse: () => {
    pendingPulse = true;
  },
  triggerInteract: () => {
    pendingInteract = true;
  }
};

// --- 3D Perspective Camera Projection Engine (Zero External CDN Required!) ---
function getCameraPose() {
  const yawRad = (camYawDeg * Math.PI) / 180;
  const targetX = sim.player.pos[0];
  const targetY = sim.player.pos[1] + 1.4;
  const targetZ = sim.player.pos[2];

  // Camera sits behind the movement direction (when camYawDeg=180, forward is +Z, camera is at -Z)
  const forwardX = Math.sin(yawRad);
  const forwardZ = Math.cos(yawRad);

  const camX = targetX - forwardX * camDist * Math.cos(camPitch);
  const camY = targetY + camDist * Math.sin(camPitch);
  const camZ = targetZ - forwardZ * camDist * Math.cos(camPitch);

  return { camX, camY, camZ, targetX, targetY, targetZ, forwardX, forwardZ };
}

function project3D(wx, wy, wz, cam) {
  // Vector from camera to target
  let fx = cam.targetX - cam.camX;
  let fy = cam.targetY - cam.camY;
  let fz = cam.targetZ - cam.camZ;
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  // Right vector in world space = (-fz, 0, fx) so that at yaw=0 (forward = +Z, fz=1, fx=0),
  // Wait: at yaw=0, if right is (-fz, 0, fx) = (-1, 0, 0), then +X projects to cx < 0 (left).
  // To make +X project to the RIGHT of the screen (cx > 0) at yaw=0, right must be (cos(yaw), 0, sin(yaw)) = (fz, 0, -fx)!
  // And Up vector must be cross(forward, right) = (fy*rz - fz*ry, fz*rx - fx*rz, fx*ry - fy*rx) so that +Y is UP (cy > 0)!
  let rx = fz;
  let ry = 0;
  let rz = -fx;
  const rLen = Math.hypot(rx, rz) || 1;
  rx /= rLen;
  rz /= rLen;

  // Up vector = cross(forward, right) so uy = fz*rx - fx*rz = fz^2 + fx^2 > 0!
  const ux = fy * rz - fz * ry;
  const uy = fz * rx - fx * rz;
  const uz = fx * ry - fy * rx;

  const dx = wx - cam.camX;
  const dy = wy - cam.camY;
  const dz = wz - cam.camZ;

  const cx = dx * rx + dy * ry + dz * rz;
  const cy = dx * ux + dy * uy + dz * uz;
  const cz = dx * fx + dy * fy + dz * fz;

  if (cz <= 0.2) return null;

  const fovScale = Math.min(canvas.width, canvas.height) * 0.95;
  const sx = canvas.width * 0.5 + (cx / cz) * fovScale;
  const sy = canvas.height * 0.5 - (cy / cz) * fovScale;
  const scale = fovScale / cz;

  return { sx, sy, cz, scale };
}

function stepClientSimulation() {
  if (sim.state !== 'playing') return;

  if (keys.has('KeyQ')) camYawDeg = (camYawDeg - 1.8 + 360) % 360;
  if (keys.has('KeyR')) camYawDeg = (camYawDeg + 1.8) % 360;

  let mx = 0;
  let mz = 0;
  // With right = (fz, 0, -fx):
  // - Pressing W (mz = +1) moves along camera forward (+fx, +fz) -> away from camera (UP on screen)
  // - Pressing S (mz = -1) moves toward camera (-fx, -fz) -> (DOWN on screen)
  // - Pressing D (mx = +1) moves along (+cos(yaw), -sin(yaw)) = (fz, -fx) = right vector -> (RIGHT on screen)
  // - Pressing A (mx = -1) moves along (-cos(yaw), +sin(yaw)) = (-fz, fx) = -right vector -> (LEFT on screen)
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

  if (mx !== 0 || mz !== 0) {
    const theta = (camYawDeg * Math.PI) / 180;
    const wx = mx * Math.cos(theta) + mz * Math.sin(theta);
    const wz = -mx * Math.sin(theta) + mz * Math.cos(theta);
    playerFacingYaw = Math.atan2(wx, wz);
  }

  const events = sim.step({
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: pendingJump,
    interact: pendingInteract,
    pulse: pendingPulse
  });

  // Reset rising-edge triggers after sending frame, then re-prime on next keydown
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

  // Trigger audio & visual FX from simulation events
  for (const ev of events) {
    if (ev.name === 'mote_picked') {
      audio.playMoteChime();
      for (let i = 0; i < 8; i++) {
        spiritParticles.push({
          x: sim.player.pos[0] + (Math.random() - 0.5) * 1.2,
          y: sim.player.pos[1] + 0.8,
          z: sim.player.pos[2] + (Math.random() - 0.5) * 1.2,
          vy: 1.5 + Math.random() * 1.5,
          life: 30
        });
      }
    } else if (ev.name === 'lantern_lit') {
      audio.playLanternLit();
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

  // Update visual FX
  for (let i = pulseRings.length - 1; i >= 0; i--) {
    const r = pulseRings[i];
    r.radius += (r.maxRadius - r.radius) * 0.18;
    r.alpha -= 0.04;
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
      'Mây đã thắp sáng toàn bộ 5 Đèn Lồng Lớn, xua tan Bóng Mực và đem lại hơi ấm cho Đảo Bến!';
  } else {
    modalTitle.textContent = '🌑 Sương Đen Bao Phủ...';
    modalTitle.style.color = '#c084fc';
    modalDesc.textContent =
      reason === 'no_flames'
        ? 'Ngọn lửa của Mây đã tắt trước Bóng Mực. Hãy dùng [F] Tỏa sáng để xua chúng đi!'
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

  // Show contextual interaction prompt when near an unlit lantern with motes
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
        : `Đèn ${nearUnlit.id} cần thêm ${need} ✨ — Hãy gom đom đóm quanh đảo!`;
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

function renderScene(timeMs) {
  const litCount = sim.lanterns.filter((l) => l.lit).length;
  const warmth = litCount / Math.max(1, sim.lanterns.length);

  // Night fairytale sky gradient that warms up as more lanterns are lit
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, warmth > 0.6 ? '#1e1b4b' : '#090614');
  skyGrad.addColorStop(0.6, warmth > 0.4 ? '#311042' : '#130d26');
  skyGrad.addColorStop(1, warmth > 0.2 ? '#451a03' : '#1a1128');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cam = getCameraPose();

  // Draw circular island disc & concentric grid rings
  drawCircleXZ(
    0,
    0,
    0,
    ISLAND_RADIUS,
    48,
    cam,
    `rgba(${24 + Math.round(warmth * 35)}, ${22 + Math.round(warmth * 28)}, ${38}, 0.95)`,
    'rgba(251, 191, 36, 0.35)',
    2
  );
  drawCircleXZ(0, 0.01, 0, 25.0, 40, cam, null, 'rgba(251, 191, 36, 0.18)', 1.5);
  drawCircleXZ(0, 0.01, 0, 12.0, 32, cam, null, 'rgba(251, 191, 36, 0.12)', 1);

  // Draw safe radius golden rings around lit lanterns & interact rings
  for (const lantern of sim.lanterns) {
    if (lantern.lit) {
      drawCircleXZ(
        lantern.pos[0],
        0.02,
        lantern.pos[2],
        sim.tuning.safe_radius,
        28,
        cam,
        'rgba(251, 191, 36, 0.12)',
        'rgba(251, 191, 36, 0.65)',
        2
      );
    } else {
      drawCircleXZ(
        lantern.pos[0],
        0.02,
        lantern.pos[2],
        sim.tuning.interact_radius,
        20,
        cam,
        'rgba(148, 163, 184, 0.06)',
        'rgba(253, 224, 71, 0.28)',
        1
      );
    }
  }

  // Draw active Pulse shockwave rings
  for (const ring of pulseRings) {
    drawCircleXZ(
      ring.x,
      0.15,
      ring.z,
      ring.radius,
      32,
      cam,
      `rgba(253, 224, 71, ${ring.alpha * 0.2})`,
      `rgba(254, 240, 138, ${ring.alpha})`,
      3
    );
  }

  // --- CREATIVE FEATURE 2: Guiding Spirit Wisp ("Tinh linh Hoa Đăng") ---
  // Draws a soft golden fairy ribbon from Mây toward the nearest unlit lantern when carrying motes
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
      const wispT = 0.25 + 0.15 * Math.sin(timeMs * 0.004);
      const wx = sim.player.pos[0] + (nearest.pos[0] - sim.player.pos[0]) * Math.min(1, 3.0 / Math.max(1, bestD));
      const wz = sim.player.pos[2] + (nearest.pos[2] - sim.player.pos[2]) * Math.min(1, 3.0 / Math.max(1, bestD));
      const wy = 1.1 + 0.25 * Math.sin(timeMs * 0.006);
      const pWisp = project3D(wx, wy, wz, cam);
      if (pWisp) {
        const r = Math.max(4, pWisp.scale * 0.22);
        const g = ctx.createRadialGradient(pWisp.sx, pWisp.sy, 1, pWisp.sx, pWisp.sy, r * 2.4);
        g.addColorStop(0, `rgba(254, 240, 138, ${0.85 + wispT * 0.15})`);
        g.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pWisp.sx, pWisp.sy, r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Collect all 3D entities for painter's algorithm depth sorting (back-to-front)
  const renderList = [];

  // 1. Fireflies (Motes)
  for (const m of sim.motes) {
    const bob = 0.55 + 0.22 * Math.sin(timeMs * 0.005 + Number(m.id.slice(1)));
    const proj = project3D(m.pos[0], bob, m.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(3, proj.scale * 0.22);
          const grad = ctx.createRadialGradient(proj.sx, proj.sy, 1, proj.sx, proj.sy, r * 2.8);
          grad.addColorStop(0, '#fef9c3');
          grad.addColorStop(0.4, '#facc15');
          grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  // 2. Grand Lanterns (L1..L5)
  for (const l of sim.lanterns) {
    const baseProj = project3D(l.pos[0], 0, l.pos[2], cam);
    const topProj = project3D(l.pos[0], 3.6, l.pos[2], cam);
    if (baseProj && topProj) {
      renderList.push({
        depth: baseProj.cz,
        draw: () => {
          const w = Math.max(6, baseProj.scale * 0.7);
          // Stone pillar
          ctx.strokeStyle = l.lit ? '#fbbf24' : '#64748b';
          ctx.lineWidth = Math.max(3, baseProj.scale * 0.28);
          ctx.beginPath();
          ctx.moveTo(baseProj.sx, baseProj.sy);
          ctx.lineTo(topProj.sx, topProj.sy);
          ctx.stroke();

          // Lantern Housing
          const r = Math.max(8, topProj.scale * 0.9);
          if (l.lit) {
            const glow = ctx.createRadialGradient(topProj.sx, topProj.sy, 2, topProj.sx, topProj.sy, r * 3.5);
            glow.addColorStop(0, '#fffbeb');
            glow.addColorStop(0.35, 'rgba(251, 191, 36, 0.85)');
            glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(topProj.sx, topProj.sy, r * 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = l.lit ? '#fde047' : '#334155';
          ctx.strokeStyle = l.lit ? '#f59e0b' : '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(topProj.sx, topProj.sy, r * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Conical roof on top of Grand Lantern
          ctx.fillStyle = l.lit ? '#b45309' : '#1e293b';
          ctx.beginPath();
          ctx.moveTo(topProj.sx - r, topProj.sy - r * 0.5);
          ctx.lineTo(topProj.sx + r, topProj.sy - r * 0.5);
          ctx.lineTo(topProj.sx, topProj.sy - r * 1.4);
          ctx.closePath();
          ctx.fill();

          // Label & Progress
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 12px Segoe UI';
          ctx.textAlign = 'center';
          const statusText = l.lit
            ? `${l.id} (ĐÃ SÁNG)`
            : `${l.id} (${l.deposited}/${sim.tuning.lantern_cost} ✨)`;
          ctx.fillText(statusText, topProj.sx, topProj.sy - r * 1.6);
        }
      });
    }
  }

  // 3. Ink Shades (Bóng Mực)
  for (const s of sim.shades) {
    const hoverY = 0.9 + 0.15 * Math.sin(timeMs * 0.006 + Number(s.id.slice(1) || 1));
    const proj = project3D(s.pos[0], hoverY, s.pos[2], cam);
    if (proj) {
      renderList.push({
        depth: proj.cz,
        draw: () => {
          const r = Math.max(7, proj.scale * 0.85);
          const isStunned = s.state === 'stunned';
          const aura = ctx.createRadialGradient(proj.sx, proj.sy, 2, proj.sx, proj.sy, r * 2.2);
          aura.addColorStop(0, isStunned ? '#a855f7' : '#1e1b4b');
          aura.addColorStop(0.5, isStunned ? 'rgba(192, 132, 252, 0.7)' : 'rgba(88, 28, 135, 0.85)');
          aura.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Core ink body
          ctx.fillStyle = isStunned ? '#d8b4fe' : '#0f0720';
          ctx.strokeStyle = isStunned ? '#fde047' : '#7e22ce';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Glowing eyes
          ctx.fillStyle = isStunned ? '#fef08a' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(proj.sx - r * 0.25, proj.sy - r * 0.1, Math.max(2, r * 0.14), 0, Math.PI * 2);
          ctx.arc(proj.sx + r * 0.25, proj.sy - r * 0.1, Math.max(2, r * 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  // 4. Player Character: Mây (wearing conical Nón Lá with a hanging mini-lantern!)
  const pFoot = project3D(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2], cam);
  const pHead = project3D(sim.player.pos[0], sim.player.pos[1] + 1.65, sim.player.pos[2], cam);
  if (pFoot && pHead) {
    renderList.push({
      depth: pFoot.cz,
      draw: () => {
        const scale = pHead.scale;
        const blink = sim.player.invuln_ticks > 0 && Math.floor(sim.tick / 4) % 2 === 0;
        if (blink) ctx.globalAlpha = 0.45;

        // Warm aura around Mây
        const auraR = Math.max(18, scale * 2.2);
        const aura = ctx.createRadialGradient(pHead.sx, pHead.sy, 2, pHead.sx, pHead.sy, auraR);
        aura.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
        aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(pHead.sx, pHead.sy, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Cloak / Body
        const bodyW = Math.max(8, scale * 0.75);
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pHead.sx, pHead.sy);
        ctx.lineTo(pFoot.sx - bodyW, pFoot.sy);
        ctx.lineTo(pFoot.sx + bodyW, pFoot.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Conical Hat (Nón Lá)
        const hatW = Math.max(13, scale * 1.25);
        const hatH = Math.max(8, scale * 0.7);
        ctx.fillStyle = '#fde68a';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pHead.sx - hatW, pHead.sy + hatH * 0.2);
        ctx.lineTo(pHead.sx + hatW, pHead.sy + hatH * 0.2);
        ctx.lineTo(pHead.sx, pHead.sy - hatH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Small lantern hanging from Mây's Nón Lá brim
        const miniX = pHead.sx + Math.sin(playerFacingYaw) * hatW * 0.85;
        const miniY = pHead.sy + hatH * 0.45;
        const miniR = Math.max(4, scale * 0.28);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(miniX, miniY, miniR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1.0;
      }
    });
  }

  // Sort back-to-front by camera depth
  renderList.sort((a, b) => b.depth - a.depth);
  for (const item of renderList) {
    item.draw();
  }
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
