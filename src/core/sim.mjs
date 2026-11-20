// Pure, deterministic Core Simulation Engine for "Đảo Đèn Lồng" (Test Contract v1.1)
// ZERO DOM / WebGL / non-deterministic APIs.

export const DEFAULT_TUNING = {
  player_speed: 6.0,
  dash_speed: 14.0,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 2,
    per_flame_left: 50
  }
};

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/**
 * Mulberry32 deterministic PRNG
 */
export function createPRNG(seed) {
  let a = (Number(seed) || 0) >>> 0;
  return function nextFloat() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function round3(val) {
  const r = Math.round((Number(val) + Number.EPSILON) * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

export function roundPos(pos) {
  return [round3(pos[0]), round3(pos[1]), round3(pos[2])];
}

export function distXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
}

export function dist3D(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
}

/**
 * Maps definition for 3 Nights according to Ticket-02
 */
export function getMapConfig(night) {
  if (night === 2) {
    return {
      name: 'Đảo Cau',
      duration_s: 330,
      lanterns: [
        { id: 'L1', pos: [0, 0, 20] },
        { id: 'L2', pos: [17, 0, -10] },
        { id: 'L3', pos: [-17, 0, -10] },
        { id: 'L4', pos: [70, 0, 20] },
        { id: 'L5', pos: [87, 0, -10] },
        { id: 'L6', pos: [53, 0, -10] }
      ],
      mote_spawn_points: (() => {
        const pts = [];
        [0, 90, 180, 270].forEach((deg) => {
          const rad = (deg * Math.PI) / 180;
          pts.push([round3(10 * Math.cos(rad)), 0, round3(10 * Math.sin(rad))]);
        });
        for (let i = 0; i < 8; i++) {
          const rad = (i * 45 * Math.PI) / 180;
          pts.push([round3(22 * Math.cos(rad)), 0, round3(22 * Math.sin(rad))]);
        }
        [0, 90, 180, 270].forEach((deg) => {
          const rad = (deg * Math.PI) / 180;
          pts.push([round3(70 + 10 * Math.cos(rad)), 0, round3(10 * Math.sin(rad))]);
        });
        for (let i = 0; i < 8; i++) {
          const rad = (i * 45 * Math.PI) / 180;
          pts.push([round3(70 + 22 * Math.cos(rad)), 0, round3(22 * Math.sin(rad))]);
        }
        return pts;
      })(),
      shade_spawn_points: (() => {
        const pts = [];
        for (let i = 0; i < 8; i++) {
          const rad = ((22.5 + i * 45) * Math.PI) / 180;
          pts.push([round3(26 * Math.cos(rad)), 0, round3(26 * Math.sin(rad))]);
          pts.push([round3(70 + 26 * Math.cos(rad)), 0, round3(26 * Math.sin(rad))]);
        }
        return pts;
      })(),
      charms: [{ id: 'C1', pos: [35, 0, 0] }],
      jump_pads: [
        { id: 'JP1', pos: [20, 0, 18], target: [70, 0, 0], vy: 14.0, vh: 24.0 },
        { id: 'JP2', pos: [50, 0, -18], target: [0, 0, 0], vy: 14.0, vh: 24.0 }
      ],
      shade_interval_s: 7,
      max_shades: 8,
      shade_speed: 4.0
    };
  } else if (night === 3) {
    return {
      name: 'Đảo Chuông',
      duration_s: 360,
      lanterns: [
        { id: 'L1', pos: [0, 6, 6] },
        { id: 'L2', pos: [18, 3, 10] },
        { id: 'L3', pos: [-18, 3, 10] },
        { id: 'L4', pos: [35, 0, -10] },
        { id: 'L5', pos: [-35, 0, -10] },
        { id: 'L6', pos: [20, 0, -35] },
        { id: 'L7', pos: [-20, 0, -35] }
      ],
      mote_spawn_points: (() => {
        const pts = [];
        for (let i = 0; i < 18; i++) {
          const rad = (i * 20 * Math.PI) / 180;
          pts.push([round3(34 * Math.cos(rad)), 0, round3(34 * Math.sin(rad))]);
        }
        for (let i = 1; i <= 8; i++) {
          const rad = (i * 20 * Math.PI) / 180;
          pts.push([round3(18 * Math.cos(rad)), 3, round3(18 * Math.sin(rad))]);
        }
        [45, 135, 225, 315].forEach((deg) => {
          const rad = (deg * Math.PI) / 180;
          pts.push([round3(5 * Math.cos(rad)), 6, round3(5 * Math.sin(rad))]);
        });
        return pts;
      })(),
      shade_spawn_points: (() => {
        const pts = [];
        for (let i = 0; i < 16; i++) {
          const rad = (i * 22.5 * Math.PI) / 180;
          pts.push([round3(43 * Math.cos(rad)), 0, round3(43 * Math.sin(rad))]);
        }
        return pts;
      })(),
      charms: [
        { id: 'C1', pos: [30, 0, 25] },
        { id: 'C2', pos: [-30, 0, 25] }
      ],
      jump_pads: [
        { id: 'JP1', pos: [0, 3, 13], dir: [0, -1], vy: 12.0, vh: 8.0 }
      ],
      shade_interval_s: 6,
      max_shades: 10,
      shade_speed: 4.5
    };
  }

  // Default: Night 1 (Đảo Bến)
  return {
    name: 'Đảo Bến',
    duration_s: 300,
    lanterns: [
      { id: 'L1', pos: [0, 0, 25] },
      { id: 'L2', pos: [23.8, 0, 7.7] },
      { id: 'L3', pos: [14.7, 0, -20.2] },
      { id: 'L4', pos: [-14.7, 0, -20.2] },
      { id: 'L5', pos: [-23.8, 0, 7.7] }
    ],
    mote_spawn_points: (() => {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const rad = (i * 45 * Math.PI) / 180;
        pts.push([round3(12 * Math.cos(rad)), 0, round3(12 * Math.sin(rad))]);
      }
      for (let i = 0; i < 16; i++) {
        const rad = (i * 22.5 * Math.PI) / 180;
        pts.push([round3(33 * Math.cos(rad)), 0, round3(33 * Math.sin(rad))]);
      }
      return pts;
    })(),
    shade_spawn_points: (() => {
      const pts = [];
      for (let i = 0; i < 12; i++) {
        const rad = ((15 + i * 30) * Math.PI) / 180;
        pts.push([round3(37 * Math.cos(rad)), 0, round3(37 * Math.sin(rad))]);
      }
      return pts;
    })(),
    charms: [],
    jump_pads: [],
    shade_interval_s: 8,
    max_shades: 6,
    shade_speed: 4.0
  };
}

/**
 * Returns ground height Y at position (x, z) given the current entity Y, or null if falling into mist.
 */
export function getGroundHeight(x, z, currentY = 0, night = 1) {
  if (night === 1) {
    const r = Math.hypot(x, z);
    return r <= 40.0 ? 0 : null;
  }

  if (night === 2) {
    const rA = Math.hypot(x, z);
    if (rA <= 28.0) return 0;
    const rB = Math.hypot(x - 70, z);
    if (rB <= 28.0) return 0;
    if (x >= 26.0 && x <= 44.0 && z >= -2.0 && z <= 2.0) {
      return 0;
    }
    return null;
  }

  if (night === 3) {
    const r = Math.hypot(x, z);
    if (r > 45.0) return null;

    if (r <= 8.0) {
      if (currentY >= 5.5) return 6;
    }

    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rx = Math.cos(rad);
      const rz = Math.sin(rad);
      const proj = x * rx + z * rz;
      const perp = Math.abs(-x * rz + z * rx);
      if (perp <= 1.5 && proj >= 24.0 && proj <= 30.0) {
        return ((30.0 - proj) / 6.0) * 3.0;
      }
    }

    if (r >= 12.0 && r <= 24.0 && z > 0) {
      if (currentY >= 2.5) return 3;
    }

    return 0;
  }

  return 0;
}

export class GameSimulation {
  constructor({ seed = 1, night = 1, scenario = null, tuning = DEFAULT_TUNING } = {}) {
    this.seed = Number(seed) || 1;
    this.night = Number(night) || 1;
    this.tuning = JSON.parse(JSON.stringify(tuning));
    this.rng = createPRNG(this.seed);
    this.mapConfig = getMapConfig(this.night);

    this.tick = 0;
    this.sim_tick = 0;
    this.state = 'playing';
    this.score = 0;
    this.is_paused = false;

    this.initial_duration_s =
      this.night === 1
        ? this.tuning.night1_duration_s
        : this.night === 2
        ? this.tuning.night2_duration_s
        : this.tuning.night3_duration_s;
    this.time_left_s = this.initial_duration_s;

    this.player = {
      pos: [0, 0, 0],
      vel: [0, 0, 0],
      facing_deg: 0,
      grounded: true,
      flames: this.tuning.flames,
      carried: 0,
      invuln_ticks: 0,
      dash_cd_ticks: 0,
      dash_ticks: 0,
      dash_dir: [0, 1],
      pulse_cooldown_ticks: 0,
      charm_ticks: 0,
      respawn_wait_ticks: 0,
      jump_pad_active: false
    };

    this.inputState = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false
    };

    this.wind = {
      active: false,
      dir_deg: 0,
      wind_timer: 0,
      duration_ticks: 0
    };
    this.wind_enabled = this.night === 3;

    this.lanterns = this.mapConfig.lanterns.map((l) => ({
      id: l.id,
      pos: [...l.pos],
      lit: false,
      deposited: 0,
      push_ticks_left: 0
    }));

    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = this.mapConfig.charms.map((c) => ({
      id: c.id,
      pos: [...c.pos],
      available: true,
      respawn_ticks: 0
    }));

    this.nextMoteId = 1;
    this.nextShadeId = 1;
    this.nextDrifterId = 1;

    this.random_motes = true;
    this.random_shades = true;
    this.random_drifters = this.night >= 2;

    this._initEntities();
    if (scenario) {
      this._applyScenario(scenario);
    }
  }

  _initEntities() {
    const spawnPts = [...this.mapConfig.mote_spawn_points];
    for (let i = spawnPts.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [spawnPts[i], spawnPts[j]] = [spawnPts[j], spawnPts[i]];
    }

    const count = Math.min(20, spawnPts.length);
    for (let i = 0; i < count; i++) {
      this.motes.push({
        id: 'M' + this.nextMoteId++,
        pos: [...spawnPts[i]],
        kind: 'random',
        ttl_ticks: null
      });
    }
  }

  _applyScenario(sc) {
    if (typeof sc !== 'object' || sc === null || Array.isArray(sc)) {
      throw new Error('Invalid scenario format: must be a JSON object');
    }

    if (typeof sc.random_motes === 'boolean') this.random_motes = sc.random_motes;
    if (typeof sc.random_shades === 'boolean') this.random_shades = sc.random_shades;
    if (typeof sc.random_drifters === 'boolean') this.random_drifters = sc.random_drifters;
    if (typeof sc.wind_enabled === 'boolean') this.wind_enabled = sc.wind_enabled;

    if (sc.time_left_s !== undefined) {
      const t = Number(sc.time_left_s);
      if (!Number.isFinite(t) || t < 0) throw new Error('Invalid scenario.time_left_s');
      this.initial_duration_s = t;
      this.time_left_s = t;
    }

    if (sc.player !== undefined) {
      if (typeof sc.player !== 'object' || sc.player === null) throw new Error('Invalid scenario.player');
      if (sc.player.pos !== undefined) {
        if (!Array.isArray(sc.player.pos) || sc.player.pos.length !== 3 || !sc.player.pos.every(Number.isFinite)) {
          throw new Error('Invalid scenario.player.pos');
        }
        this.player.pos = [Number(sc.player.pos[0]), Number(sc.player.pos[1]), Number(sc.player.pos[2])];
      }
      if (sc.player.carried !== undefined) {
        this.player.carried = Math.floor(Math.max(0, Number(sc.player.carried)));
      }
      if (sc.player.flames !== undefined) {
        this.player.flames = Math.floor(Math.max(0, Number(sc.player.flames)));
      }
      if (sc.player.invuln_ticks !== undefined) {
        this.player.invuln_ticks = Math.max(0, Number(sc.player.invuln_ticks));
      }
      if (sc.player.dash_cd_ticks !== undefined) {
        this.player.dash_cd_ticks = Math.max(0, Number(sc.player.dash_cd_ticks));
      }
      if (sc.player.pulse_cd_ticks !== undefined) {
        this.player.pulse_cooldown_ticks = Math.max(0, Number(sc.player.pulse_cd_ticks));
      }
      if (sc.player.charm_ticks !== undefined) {
        this.player.charm_ticks = Math.max(0, Number(sc.player.charm_ticks));
      }
    }

    if (sc.motes !== undefined) {
      if (!Array.isArray(sc.motes)) throw new Error('Invalid scenario.motes');
      this.motes = [];
      this.nextMoteId = 1;
      for (const m of sc.motes) {
        if (Array.isArray(m) && m.length === 3 && m.every(Number.isFinite)) {
          this.motes.push({
            id: 'M' + this.nextMoteId++,
            pos: [Number(m[0]), Number(m[1]), Number(m[2])],
            kind: 'random',
            ttl_ticks: null
          });
        } else if (typeof m === 'object' && m !== null && Array.isArray(m.pos) && m.pos.length === 3) {
          const id = m.id ? String(m.id) : 'M' + this.nextMoteId++;
          this.motes.push({
            id,
            pos: [Number(m.pos[0]), Number(m.pos[1]), Number(m.pos[2])],
            kind: m.kind || 'random',
            ttl_ticks: m.ttl_s !== undefined ? Math.round(Number(m.ttl_s) * TICK_RATE) : null
          });
        }
      }
    } else if (this.random_motes === false) {
      this.motes = [];
    }

    if (sc.shades !== undefined) {
      if (!Array.isArray(sc.shades)) throw new Error('Invalid scenario.shades');
      this.shades = [];
      this.nextShadeId = 1;
      for (const s of sc.shades) {
        const id = s.id ? String(s.id) : 'S' + this.nextShadeId++;
        const numMatch = /^S(\d+)$/.exec(id);
        if (numMatch) this.nextShadeId = Math.max(this.nextShadeId, Number(numMatch[1]) + 1);
        this.shades.push({
          id,
          pos: [Number(s.pos[0]), Number(s.pos[1]), Number(s.pos[2])],
          state: s.state ? String(s.state) : 'wander',
          state_ticks_left: s.state_ticks_left !== undefined ? Number(s.state_ticks_left) : 0,
          recoil_ticks_left: 0,
          being_pushed_ticks: 0,
          push_vec: [0, 0]
        });
      }
    } else if (this.random_shades === false) {
      this.shades = [];
    }

    if (sc.drifters !== undefined) {
      if (!Array.isArray(sc.drifters)) throw new Error('Invalid scenario.drifters');
      this.drifters = [];
      this.nextDrifterId = 1;
      for (const d of sc.drifters) {
        const id = d.id ? String(d.id) : 'D' + this.nextDrifterId++;
        const numMatch = /^D(\d+)$/.exec(id);
        if (numMatch) this.nextDrifterId = Math.max(this.nextDrifterId, Number(numMatch[1]) + 1);
        this.drifters.push({
          id,
          pos: [Number(d.pos[0]), Number(d.pos[1]), Number(d.pos[2])],
          state: d.state ? String(d.state) : 'idle',
          stolen: Math.floor(Math.max(0, Number(d.stolen || 0))),
          flee_ticks_left: d.flee_ticks_left !== undefined ? Number(d.flee_ticks_left) : 0,
          has_stolen: Boolean(d.has_stolen)
        });
      }
    }

    if (sc.charms !== undefined) {
      if (!Array.isArray(sc.charms)) throw new Error('Invalid scenario.charms');
      this.charms = [];
      for (const c of sc.charms) {
        this.charms.push({
          id: String(c.id),
          pos: [Number(c.pos[0]), Number(c.pos[1]), Number(c.pos[2])],
          available: c.available !== undefined ? Boolean(c.available) : true,
          respawn_ticks: c.respawn_s !== undefined ? Math.round(Number(c.respawn_s) * TICK_RATE) : 0
        });
      }
    }

    if (sc.lanterns !== undefined) {
      if (!Array.isArray(sc.lanterns)) throw new Error('Invalid scenario.lanterns');
      for (const lPatch of sc.lanterns) {
        const target = this.lanterns.find((l) => l.id === lPatch.id);
        if (!target) continue;
        if (lPatch.pos !== undefined) {
          target.pos = [Number(lPatch.pos[0]), Number(lPatch.pos[1]), Number(lPatch.pos[2])];
        }
        if (lPatch.deposited !== undefined) {
          target.deposited = Math.floor(lPatch.deposited);
        }
        if (typeof lPatch.lit === 'boolean') {
          target.lit = lPatch.lit;
          if (target.lit && lPatch.deposited === undefined) {
            target.deposited = this.tuning.lantern_cost;
          }
        } else if (target.deposited >= this.tuning.lantern_cost) {
          target.lit = true;
        }
      }
    }
  }

  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.sim_tick,
      state: this.is_paused ? 'paused' : this.state,
      night: this.night,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: roundPos(this.player.pos),
        vel: [round3(this.player.vel[0]), round3(this.player.vel[1]), round3(this.player.vel[2])],
        grounded: Boolean(this.player.grounded),
        flames: this.player.flames,
        carried: this.player.carried,
        invuln: this.player.invuln_ticks > 0,
        dash_cd_s: round3(this.player.dash_cd_ticks / TICK_RATE),
        pulse_cd_s: round3(this.player.pulse_cooldown_ticks / TICK_RATE),
        charm_s: round3(this.player.charm_ticks / TICK_RATE)
      },
      wind: {
        active: Boolean(this.wind.active),
        dir_deg: round3(this.wind.dir_deg)
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: roundPos(l.pos),
        lit: Boolean(l.lit),
        deposited: l.deposited
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: roundPos(s.pos),
        state: s.state
      })),
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: roundPos(d.pos),
        state: d.state,
        stolen: d.stolen
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: Boolean(c.available),
        respawn_s: round3(c.respawn_ticks / TICK_RATE)
      })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: roundPos(m.pos),
        kind: m.kind,
        ttl_s: m.ttl_ticks !== null ? round3(m.ttl_ticks / TICK_RATE) : null
      }))
    };
  }

  step(frameUpdate = null) {
    const nextTick = this.tick + 1;
    const events = [];

    // 1. Đọc input
    let pauseTriggered = false;
    let jumpTriggered = false;
    let interactTriggered = false;
    let pulseTriggered = false;
    let dashTriggered = false;

    if (frameUpdate) {
      if (frameUpdate.move !== undefined) {
        this.inputState.move = [Number(frameUpdate.move[0]), Number(frameUpdate.move[1])];
      }
      if (frameUpdate.cam_yaw_deg !== undefined) {
        this.inputState.cam_yaw_deg = Number(frameUpdate.cam_yaw_deg);
      }
      if (frameUpdate.jump !== undefined) {
        const nextJump = Boolean(frameUpdate.jump);
        if (!this.inputState.jump && nextJump) jumpTriggered = true;
        this.inputState.jump = nextJump;
      }
      if (frameUpdate.interact !== undefined) {
        const nextInteract = Boolean(frameUpdate.interact);
        if (!this.inputState.interact && nextInteract) interactTriggered = true;
        this.inputState.interact = nextInteract;
      }
      if (frameUpdate.pulse !== undefined) {
        const nextPulse = Boolean(frameUpdate.pulse);
        if (!this.inputState.pulse && nextPulse) pulseTriggered = true;
        this.inputState.pulse = nextPulse;
      }
      if (frameUpdate.dash !== undefined) {
        const nextDash = Boolean(frameUpdate.dash);
        if (!this.inputState.dash && nextDash) dashTriggered = true;
        this.inputState.dash = nextDash;
      }
      if (frameUpdate.pause !== undefined) {
        const nextPause = Boolean(frameUpdate.pause);
        if (!this.inputState.pause && nextPause) pauseTriggered = true;
        this.inputState.pause = nextPause;
      }
    }

    if (pauseTriggered) {
      this.is_paused = !this.is_paused;
      if (this.is_paused) {
        events.push({ type: 'event', tick: nextTick, name: 'paused', data: {} });
      } else {
        events.push({ type: 'event', tick: nextTick, name: 'resumed', data: {} });
      }
    }

    if (this.is_paused) {
      this.tick = nextTick;
      return events;
    }

    if (this.state !== 'playing') {
      this.tick = nextTick;
      return events;
    }

    const nextSimTick = this.sim_tick + 1;

    // 2. Giảm các bộ đếm
    this.time_left_s = Math.max(0, this.initial_duration_s - nextSimTick / TICK_RATE);

    if (this.player.invuln_ticks > 0) this.player.invuln_ticks--;
    if (this.player.dash_cd_ticks > 0) this.player.dash_cd_ticks--;
    if (this.player.pulse_cooldown_ticks > 0) this.player.pulse_cooldown_ticks--;
    if (this.player.charm_ticks > 0) this.player.charm_ticks--;

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (m.ttl_ticks !== null) {
        m.ttl_ticks--;
        if (m.ttl_ticks <= 0) {
          this.motes.splice(i, 1);
        }
      }
    }

    for (const c of this.charms) {
      if (!c.available) {
        c.respawn_ticks--;
        if (c.respawn_ticks <= 0) {
          c.available = true;
        }
      }
    }

    for (const s of this.shades) {
      if (s.state_ticks_left > 0) {
        s.state_ticks_left--;
        if (s.state_ticks_left <= 0 && s.state === 'stunned') {
          s.state = 'wander';
        }
      }
      if (s.recoil_ticks_left > 0) {
        s.recoil_ticks_left--;
        if (s.recoil_ticks_left <= 0 && s.state === 'recoil') {
          s.state = 'wander';
        }
      }
    }

    if (this.wind_enabled) {
      const cycleTick = nextSimTick % 1800;
      if (cycleTick >= 1500) {
        if (!this.wind.active) {
          this.wind.active = true;
          this.wind.dir_deg = this.rng() * 360;
        }
      } else {
        this.wind.active = false;
      }
    }

    // 3. Di chuyển Mây
    if (this.player.respawn_wait_ticks > 0) {
      this.player.respawn_wait_ticks--;
      if (this.player.respawn_wait_ticks === 0) {
        this.player.pos = [0, 0, 0];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invuln_ticks = 90;
      }
    } else {
      let mx = Math.max(-1, Math.min(1, this.inputState.move[0] || 0));
      let mz = Math.max(-1, Math.min(1, this.inputState.move[1] || 0));
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }

      const theta = (this.inputState.cam_yaw_deg * Math.PI) / 180;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      let wx = mx * cosT + mz * sinT;
      let wz = -mx * sinT + mz * cosT;

      if (Math.hypot(wx, wz) > 0.01) {
        this.player.facing_deg = (Math.atan2(wx, wz) * 180) / Math.PI;
      }

      if (dashTriggered && this.player.dash_ticks === 0) {
        if (this.player.charm_ticks > 0 || this.player.dash_cd_ticks === 0) {
          this.player.dash_ticks = 12;
          this.player.dash_cd_ticks = Math.round(this.tuning.dash_cooldown_s * TICK_RATE);
          let dDirX = wx;
          let dDirZ = wz;
          if (Math.hypot(dDirX, dDirZ) < 0.01) {
            const fRad = (this.player.facing_deg * Math.PI) / 180;
            dDirX = Math.sin(fRad);
            dDirZ = Math.cos(fRad);
          }
          const dLen = Math.hypot(dDirX, dDirZ) || 1;
          this.player.dash_dir = [dDirX / dLen, dDirZ / dLen];
          events.push({ type: 'event', tick: nextTick, name: 'dash', data: {} });
        }
      }

      let speed = this.player.charm_ticks > 0 ? 7.2 : this.tuning.player_speed;

      if (this.player.dash_ticks > 0) {
        this.player.dash_ticks--;
        this.player.vel[0] = this.player.dash_dir[0] * this.tuning.dash_speed;
        this.player.vel[2] = this.player.dash_dir[1] * this.tuning.dash_speed;
        this.player.vel[1] = 0;
      } else if (this.player.jump_pad_active) {
        // Keep horizontal launch velocity
      } else {
        this.player.vel[0] = wx * speed;
        this.player.vel[2] = wz * speed;
        if (this.wind.active) {
          const wRad = (this.wind.dir_deg * Math.PI) / 180;
          this.player.vel[0] += 2.0 * Math.sin(wRad);
          this.player.vel[2] += 2.0 * Math.cos(wRad);
        }
      }

      if (jumpTriggered && this.player.grounded && this.player.dash_ticks === 0) {
        this.player.vel[1] = 7.0;
        this.player.grounded = false;
      }

      if (!this.player.grounded && this.player.dash_ticks === 0) {
        this.player.vel[1] -= 20.0 * DT;
      }

      let nextX = this.player.pos[0] + this.player.vel[0] * DT;
      let nextY = this.player.pos[1] + this.player.vel[1] * DT;
      let nextZ = this.player.pos[2] + this.player.vel[2] * DT;

      const groundY = getGroundHeight(nextX, nextZ, this.player.pos[1], this.night);

      if (groundY !== null) {
        if (nextY <= groundY) {
          nextY = groundY;
          this.player.vel[1] = 0;
          this.player.grounded = true;
          this.player.jump_pad_active = false;
        } else {
          this.player.grounded = false;
        }
      } else {
        this.player.grounded = false;
      }

      if (this.player.grounded) {
        for (const pad of this.mapConfig.jump_pads) {
          if (distXZ([nextX, nextY, nextZ], pad.pos) <= 1.0 && Math.abs(nextY - pad.pos[1]) <= 0.5) {
            this.player.jump_pad_active = true;
            this.player.grounded = false;
            this.player.vel[1] = pad.vy;
            let dirX = 0;
            let dirZ = 0;
            if (pad.target) {
              dirX = pad.target[0] - pad.pos[0];
              dirZ = pad.target[2] - pad.pos[2];
            } else if (pad.dir) {
              dirX = pad.dir[0];
              dirZ = pad.dir[1];
            }
            const dLen = Math.hypot(dirX, dirZ) || 1;
            this.player.vel[0] = (dirX / dLen) * pad.vh;
            this.player.vel[2] = (dirZ / dLen) * pad.vh;
            break;
          }
        }
      }

      this.player.pos = [nextX, nextY, nextZ];

      if (nextY < -10.0 && this.tuning.fall_enabled) {
        this.player.flames = Math.max(0, this.player.flames - 1);
        const lost = this.player.carried;
        this.player.carried = 0;
        this.player.respawn_wait_ticks = 60;
        events.push({
          type: 'event',
          tick: nextTick,
          name: 'player_hit',
          data: {
            by: 'fall',
            flames: this.player.flames,
            dropped: 0,
            lost
          }
        });
      }
    }

    // 4. Nhặt đom đóm và bùa
    if (this.player.respawn_wait_ticks === 0 && this.player.pos[1] >= -9.0) {
      for (let i = this.motes.length - 1; i >= 0; i--) {
        if (this.player.carried >= this.tuning.carry_capacity) break;
        const mote = this.motes[i];
        if (distXZ(this.player.pos, mote.pos) <= this.tuning.pickup_radius && Math.abs(this.player.pos[1] - mote.pos[1]) <= 1.5) {
          this.motes.splice(i, 1);
          this.player.carried++;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'mote_picked',
            data: { carried: this.player.carried }
          });
        }
      }

      for (const c of this.charms) {
        if (c.available && distXZ(this.player.pos, c.pos) <= this.tuning.pickup_radius && Math.abs(this.player.pos[1] - c.pos[1]) <= 1.5) {
          c.available = false;
          c.respawn_ticks = 2700;
          this.player.charm_ticks = 600;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'charm_picked',
            data: { charm_id: c.id, charm_ticks: 600 }
          });
        }
      }
    }

    // 5. Tương tác với đèn
    if (interactTriggered && this.player.carried > 0 && this.player.respawn_wait_ticks === 0) {
      let candidate = null;
      let minD = Infinity;
      for (const l of this.lanterns) {
        if (l.lit) continue;
        const d = distXZ(this.player.pos, l.pos);
        if (d <= this.tuning.interact_radius) {
          if (d < minD) {
            minD = d;
            candidate = l;
          } else if (Math.abs(d - minD) < 1e-4) {
            if (candidate && l.id < candidate.id) candidate = l;
          }
        }
      }

      if (candidate) {
        const needed = this.tuning.lantern_cost - candidate.deposited;
        const amount = Math.min(this.player.carried, needed);
        if (amount > 0) {
          this.player.carried -= amount;
          candidate.deposited += amount;
          this.score += amount * this.tuning.score.per_mote;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'deposit',
            data: {
              lantern_id: candidate.id,
              amount,
              deposited: candidate.deposited
            }
          });

          if (candidate.deposited >= this.tuning.lantern_cost && !candidate.lit) {
            candidate.lit = true;
            this.score += this.tuning.score.per_lantern;
            events.push({
              type: 'event',
              tick: nextTick,
              name: 'lantern_lit',
              data: { lantern_id: candidate.id }
            });

            for (const s of this.shades) {
              const dToL = distXZ(s.pos, candidate.pos);
              if (dToL < this.tuning.safe_radius) {
                s.being_pushed_ticks = 30;
                let dx = s.pos[0] - candidate.pos[0];
                let dz = s.pos[2] - candidate.pos[2];
                const lenP = Math.hypot(dx, dz);
                s.push_vec = lenP > 1e-4 ? [dx / lenP, dz / lenP] : [1, 0];
              }
            }
          }
        }
      }
    }

    // 6. Cập nhật vùng an toàn
    for (const s of this.shades) {
      if (s.being_pushed_ticks > 0) {
        s.being_pushed_ticks--;
        s.pos[0] += s.push_vec[0] * 0.2;
        s.pos[2] += s.push_vec[1] * 0.2;
      }
    }

    // 7. Tỏa Sáng (pulse)
    if (pulseTriggered && this.player.carried >= this.tuning.pulse_cost && this.player.pulse_cooldown_ticks === 0) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulse_cooldown_ticks = Math.round(this.tuning.pulse_cooldown_s * TICK_RATE);

      const center3D = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
      const stunnedIds = [];

      for (const s of this.shades) {
        const d3 = dist3D(center3D, [s.pos[0], s.pos[1] + 0.8, s.pos[2]]);
        if (d3 <= this.tuning.pulse_radius) {
          s.state = 'stunned';
          s.state_ticks_left = 120;
          stunnedIds.push(s.id);
          this.score += this.tuning.score.per_stun;

          let dx = s.pos[0] - this.player.pos[0];
          let dz = s.pos[2] - this.player.pos[2];
          const distH = Math.hypot(dx, dz);
          const pushDir = distH > 1e-4 ? [dx / distH, dz / distH] : [1, 0];
          s.pos[0] += pushDir[0] * this.tuning.pulse_push_m;
          s.pos[2] += pushDir[1] * this.tuning.pulse_push_m;
        }
      }

      for (const d of this.drifters) {
        const d3 = dist3D(center3D, d.pos);
        if (d3 <= this.tuning.pulse_radius) {
          if (d.state === 'chase') {
            d.state = 'flee';
            d.flee_ticks_left = 240;
          } else if (d.state === 'flee' && d.stolen > 0) {
            for (let k = 0; k < d.stolen; k++) {
              this.motes.push({
                id: 'M' + this.nextMoteId++,
                pos: [...d.pos],
                kind: 'dropped',
                ttl_ticks: 480
              });
            }
            events.push({
              type: 'event',
              tick: nextTick,
              name: 'drifter_drop',
              data: { drifter_id: d.id, amount: d.stolen }
            });
            d.stolen = 0;
            d.flee_ticks_left = 120;
          }
        }
      }

      events.push({
        type: 'event',
        tick: nextTick,
        name: 'pulse',
        data: { stunned_ids: stunnedIds }
      });
    }

    // 8. Di chuyển Bóng Mực và Gió Lạc
    const sSpeed = this.mapConfig.shade_speed * DT;
    for (const s of this.shades) {
      if (s.state === 'stunned') continue;

      const dMay = distXZ(s.pos, this.player.pos);
      if (s.state === 'wander' && dMay <= 12.0) {
        s.state = 'chase';
      } else if (s.state === 'chase' && dMay > 18.0) {
        s.state = 'wander';
      }

      if (s.state === 'chase') {
        const dx = this.player.pos[0] - s.pos[0];
        const dz = this.player.pos[2] - s.pos[2];
        const d = Math.hypot(dx, dz);
        if (d > 1e-4) {
          let nextSX = s.pos[0] + (dx / d) * Math.min(d, sSpeed);
          let nextSZ = s.pos[2] + (dz / d) * Math.min(d, sSpeed);

          for (const l of this.lanterns) {
            if (l.lit) {
              const dL = Math.hypot(nextSX - l.pos[0], nextSZ - l.pos[2]);
              if (dL < this.tuning.safe_radius) {
                const ratio = this.tuning.safe_radius / dL;
                nextSX = l.pos[0] + (nextSX - l.pos[0]) * ratio;
                nextSZ = l.pos[2] + (nextSZ - l.pos[2]) * ratio;
              }
            }
          }

          s.pos[0] = nextSX;
          s.pos[2] = nextSZ;
        }
      } else if (s.state === 'recoil') {
        let dx = s.pos[0] - this.player.pos[0];
        let dz = s.pos[2] - this.player.pos[2];
        const d = Math.hypot(dx, dz) || 1;
        s.pos[0] += (dx / d) * (2.0 / 60);
        s.pos[2] += (dz / d) * (2.0 / 60);
      }
    }

    for (let i = this.drifters.length - 1; i >= 0; i--) {
      const d = this.drifters[i];
      if (d.state === 'removed') continue;

      const dMay = distXZ(d.pos, this.player.pos);
      if (d.state === 'idle') {
        if (this.player.carried >= 5 && dMay <= 15.0) {
          d.state = 'chase';
        }
      } else if (d.state === 'chase') {
        if (this.player.carried < 5 || dMay > 15.0) {
          d.state = 'idle';
        } else {
          const dx = this.player.pos[0] - d.pos[0];
          const dz = this.player.pos[2] - d.pos[2];
          const dist = Math.hypot(dx, dz) || 1;
          d.pos[0] += (dx / dist) * 7.0 * DT;
          d.pos[2] += (dz / dist) * 7.0 * DT;
        }
      } else if (d.state === 'flee') {
        d.flee_ticks_left--;
        let dx = d.pos[0] - this.player.pos[0];
        let dz = d.pos[2] - this.player.pos[2];
        const dist = Math.hypot(dx, dz) || 1;
        d.pos[0] += (dx / dist) * 7.0 * DT;
        d.pos[2] += (dz / dist) * 7.0 * DT;

        if (d.flee_ticks_left <= 0) {
          d.state = 'removed';
          this.drifters.splice(i, 1);
        }
      }
    }

    // 9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit
    if (this.player.respawn_wait_ticks === 0) {
      for (const d of this.drifters) {
        if (d.state === 'chase' && !d.has_stolen && distXZ(this.player.pos, d.pos) <= 1.2) {
          const stealAmt = Math.min(3, this.player.carried);
          this.player.carried -= stealAmt;
          d.stolen = stealAmt;
          d.has_stolen = true;
          d.state = 'flee';
          d.flee_ticks_left = 240;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'drifter_steal',
            data: { drifter_id: d.id, amount: stealAmt, carried: this.player.carried }
          });
        }
      }

      if (this.player.invuln_ticks === 0) {
        const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        for (const s of sortedShades) {
          if (s.state === 'stunned' || s.being_pushed_ticks > 0) continue;
          if (distXZ(this.player.pos, s.pos) <= this.tuning.shade_hit_radius && Math.abs(this.player.pos[1] - s.pos[1]) <= 1.5) {
            this.player.flames = Math.max(0, this.player.flames - 1);
            const dropped = Math.floor(this.player.carried * (this.tuning.hit_drop_ratio || 0.5));
            this.player.carried -= dropped;
            this.player.invuln_ticks = 90;
            s.state = 'recoil';
            s.recoil_ticks_left = 60;

            for (let k = 0; k < dropped; k++) {
              const ang = this.rng() * 2 * Math.PI;
              const rDrop = 1.5 + this.rng() * 1.0;
              this.motes.push({
                id: 'M' + this.nextMoteId++,
                pos: [round3(this.player.pos[0] + rDrop * Math.cos(ang)), this.player.pos[1], round3(this.player.pos[2] + rDrop * Math.sin(ang))],
                kind: 'dropped',
                ttl_ticks: 480
              });
            }

            events.push({
              type: 'event',
              tick: nextTick,
              name: 'player_hit',
              data: {
                by: 'shade',
                flames: this.player.flames,
                dropped
              }
            });
            break;
          }
        }
      }
    }

    // 10. Sinh thực thể
    if (this.random_motes && nextSimTick % 240 === 0 && this.motes.length < 30) {
      const emptyPts = this.mapConfig.mote_spawn_points.filter((pt) => {
        return !this.motes.some((m) => distXZ(m.pos, pt) < 1.0);
      });
      if (emptyPts.length > 0) {
        const chosen = emptyPts[Math.floor(this.rng() * emptyPts.length)];
        this.motes.push({
          id: 'M' + this.nextMoteId++,
          pos: [...chosen],
          kind: 'random',
          ttl_ticks: null
        });
      }
    }

    if (this.random_shades) {
      const intervalTicks = this.mapConfig.shade_interval_s * TICK_RATE;
      const shouldSpawn = nextSimTick === 300 ? 2 : nextSimTick > 300 && (nextSimTick - 300) % intervalTicks === 0 ? 1 : 0;
      for (let sCount = 0; sCount < shouldSpawn; sCount++) {
        if (this.shades.length < this.mapConfig.max_shades) {
          const validPts = this.mapConfig.shade_spawn_points.filter((pt) => distXZ(pt, this.player.pos) >= 15.0);
          if (validPts.length > 0) {
            const pt = validPts[Math.floor(this.rng() * validPts.length)];
            const newId = 'S' + this.nextShadeId++;
            this.shades.push({
              id: newId,
              pos: [...pt],
              state: 'spawning',
              state_ticks_left: 30,
              recoil_ticks_left: 0,
              being_pushed_ticks: 0,
              push_vec: [0, 0]
            });
            events.push({ type: 'event', tick: nextTick, name: 'shade_spawned', data: { id: newId } });
          }
        }
      }
    }

    if (this.random_drifters && nextSimTick % 1200 === 0 && this.drifters.length < 2) {
      const mistPts = this.mapConfig.shade_spawn_points;
      const pt = mistPts[Math.floor(this.rng() * mistPts.length)];
      const newDId = 'D' + this.nextDrifterId++;
      this.drifters.push({
        id: newDId,
        pos: [...pt],
        state: 'idle',
        stolen: 0,
        flee_ticks_left: 0,
        has_stolen: false
      });
    }

    // 11. Thắng/thua
    const allLit = this.lanterns.length > 0 && this.lanterns.every((l) => l.lit);
    if (this.player.flames <= 0) {
      this.state = 'lost';
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'game_over',
        data: { result: 'lost', reason: 'no_flames' }
      });
    } else if (allLit) {
      this.state = 'won';
      const timeBonus = Math.floor(this.time_left_s) * (this.tuning.score.per_second_left || 2);
      const flameBonus = this.player.flames * (this.tuning.score.per_flame_left || 50);
      this.score += timeBonus + flameBonus;
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'game_over',
        data: { result: 'won', reason: 'all_lit' }
      });
    } else if (this.time_left_s <= 0) {
      this.state = 'lost';
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'game_over',
        data: { result: 'lost', reason: 'dawn' }
      });
    }

    this.tick = nextTick;
    this.sim_tick = nextSimTick;

    return events;
  }
}

export function parseAndValidateInputs(inputsObj) {
  if (typeof inputsObj !== 'object' || inputsObj === null || !Array.isArray(inputsObj.frames)) {
    throw new Error('Invalid inputs format: must contain a "frames" array');
  }

  const frameMap = new Map();
  let lastTick = -1;

  for (const frame of inputsObj.frames) {
    if (typeof frame !== 'object' || frame === null || !Number.isInteger(frame.tick) || frame.tick < 0) {
      throw new Error('Invalid frame in inputs: "tick" must be a non-negative integer');
    }
    if (frame.tick <= lastTick) {
      throw new Error('Invalid frame order in inputs: tick ' + frame.tick + ' is not strictly greater than ' + lastTick);
    }
    lastTick = frame.tick;

    if (frame.move !== undefined) {
      if (!Array.isArray(frame.move) || frame.move.length !== 2 || !Number.isFinite(frame.move[0]) || !Number.isFinite(frame.move[1])) {
        throw new Error('Invalid move vector at tick ' + frame.tick);
      }
    }
    if (frame.cam_yaw_deg !== undefined && !Number.isFinite(frame.cam_yaw_deg)) {
      throw new Error('Invalid cam_yaw_deg at tick ' + frame.tick);
    }

    frameMap.set(frame.tick, frame);
  }

  return frameMap;
}
