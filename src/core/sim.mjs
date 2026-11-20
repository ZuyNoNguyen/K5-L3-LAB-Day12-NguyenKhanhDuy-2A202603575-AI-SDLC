// Pure, deterministic Core Simulation Engine for "Đảo Đèn Lồng" (Test Contract v1.0)
// ZERO DOM / WebGL / non-deterministic APIs.

export const DEFAULT_TUNING = {
  player_speed: 8.0,
  carry_capacity: 5,
  lantern_cost: 3,
  lantern_count_night1: 5,
  pickup_radius: 1.5,
  interact_radius: 2.5,
  pulse_cost: 1,
  pulse_radius: 6.0,
  night1_duration_s: 180,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 1.0,
  safe_radius: 5.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: false,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 25,
    per_second_left: 5,
    per_flame_left: 50
  }
};

export const ISLAND_RADIUS = 45.0;
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

/**
 * Default 5 Grand Lantern positions on a 25m circle around (0, 0, 0), starting with L1 at (0, 0, 25)
 */
export function getDefaultLanterns(count = 5) {
  const radius = 25.0;
  const lanterns = [];
  for (let i = 0; i < count; i++) {
    // i=0 -> angle = 0 -> (0, 0, 25)
    const angle = (i * 2 * Math.PI) / count;
    const x = round3(radius * Math.sin(angle));
    const z = round3(radius * Math.cos(angle));
    lanterns.push({
      id: `L${i + 1}`,
      pos: [x, 0, z],
      lit: false,
      deposited: 0
    });
  }
  return lanterns;
}

export class GameSimulation {
  constructor({ seed = 1, night = 1, scenario = null, tuning = DEFAULT_TUNING } = {}) {
    this.seed = Number(seed) || 1;
    this.night = Number(night) || 1;
    this.tuning = JSON.parse(JSON.stringify(tuning));
    this.rng = createPRNG(this.seed);

    this.tick = 0;
    this.sim_tick = 0;
    this.state = 'playing'; // 'playing' | 'won' | 'lost'
    this.score = 0;

    this.initial_duration_s = this.tuning.night1_duration_s;
    this.time_left_s = this.initial_duration_s;

    // Player state
    this.player = {
      pos: [0, 0, 0],
      vy: 0,
      flames: this.tuning.flames,
      carried: 0,
      invuln_ticks: 0,
      pulse_cooldown_ticks: 0
    };

    // Input state (persisted across frames, rising-edge tracked)
    this.inputState = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false
    };

    this.lanterns = getDefaultLanterns(this.tuning.lantern_count_night1 || 5);
    this.motes = [];
    this.shades = [];
    this.nextMoteId = 1;
    this.nextShadeId = 1;

    this.random_motes = true;
    this.random_shades = true;

    this._initEntities();
    if (scenario) {
      this._applyScenario(scenario);
    }
  }

  _spawnRandomMote() {
    // Spawn between 3m and 38m from center so it doesn't immediately spawn under player at (0,0,0)
    const angle = this.rng() * 2 * Math.PI;
    const r = 3.5 + this.rng() * 34.5;
    const x = round3(r * Math.cos(angle));
    const z = round3(r * Math.sin(angle));
    const id = `M${this.nextMoteId++}`;
    this.motes.push({ id, pos: [x, 0, z] });
    return id;
  }

  _spawnRandomShade() {
    // Spawn near the outer mist ring (28m..40m)
    const angle = this.rng() * 2 * Math.PI;
    const r = 28.0 + this.rng() * 12.0;
    const x = round3(r * Math.cos(angle));
    const z = round3(r * Math.sin(angle));
    const id = `S${this.nextShadeId++}`;
    this.shades.push({
      id,
      pos: [x, 0, z],
      state: 'chase',
      stun_ticks: 0
    });
    return id;
  }

  _initEntities() {
    // Spawn 20 initial motes deterministically
    for (let i = 0; i < 20; i++) {
      this._spawnRandomMote();
    }
    // Spawn 3 initial shades deterministically
    for (let i = 0; i < 3; i++) {
      this._spawnRandomShade();
    }
  }

  _applyScenario(sc) {
    if (typeof sc !== 'object' || sc === null || Array.isArray(sc)) {
      throw new Error('Invalid scenario format: must be a JSON object');
    }

    if (typeof sc.random_motes === 'boolean') {
      this.random_motes = sc.random_motes;
    }
    if (typeof sc.random_shades === 'boolean') {
      this.random_shades = sc.random_shades;
    }

    if (sc.time_left_s !== undefined) {
      const t = Number(sc.time_left_s);
      if (!Number.isFinite(t) || t < 0) {
        throw new Error('Invalid scenario.time_left_s');
      }
      this.initial_duration_s = t;
      this.time_left_s = t;
    }

    if (sc.player !== undefined) {
      if (typeof sc.player !== 'object' || sc.player === null) {
        throw new Error('Invalid scenario.player');
      }
      if (sc.player.pos !== undefined) {
        if (!Array.isArray(sc.player.pos) || sc.player.pos.length !== 3 || !sc.player.pos.every(Number.isFinite)) {
          throw new Error('Invalid scenario.player.pos');
        }
        this.player.pos = [Number(sc.player.pos[0]), Number(sc.player.pos[1]), Number(sc.player.pos[2])];
      }
      if (sc.player.carried !== undefined) {
        if (!Number.isFinite(sc.player.carried) || sc.player.carried < 0) {
          throw new Error('Invalid scenario.player.carried');
        }
        this.player.carried = Math.floor(sc.player.carried);
      }
      if (sc.player.flames !== undefined) {
        if (!Number.isFinite(sc.player.flames) || sc.player.flames < 0) {
          throw new Error('Invalid scenario.player.flames');
        }
        this.player.flames = Math.floor(sc.player.flames);
      }
    }

    // If random_motes is false and sc.motes is not provided, default to empty or keep only if provided
    if (sc.motes !== undefined) {
      if (!Array.isArray(sc.motes)) {
        throw new Error('Invalid scenario.motes: must be an array');
      }
      this.motes = [];
      this.nextMoteId = 1;
      for (const m of sc.motes) {
        if (Array.isArray(m)) {
          if (m.length !== 3 || !m.every(Number.isFinite)) {
            throw new Error('Invalid mote coordinate in scenario.motes');
          }
          this.motes.push({
            id: `M${this.nextMoteId++}`,
            pos: [Number(m[0]), Number(m[1]), Number(m[2])]
          });
        } else if (typeof m === 'object' && m !== null && Array.isArray(m.pos) && m.pos.length === 3) {
          const id = m.id ? String(m.id) : `M${this.nextMoteId++}`;
          this.motes.push({
            id,
            pos: [Number(m.pos[0]), Number(m.pos[1]), Number(m.pos[2])]
          });
        } else {
          throw new Error('Invalid mote entry in scenario.motes');
        }
      }
    } else if (this.random_motes === false) {
      this.motes = [];
    }

    if (sc.shades !== undefined) {
      if (!Array.isArray(sc.shades)) {
        throw new Error('Invalid scenario.shades: must be an array');
      }
      this.shades = [];
      this.nextShadeId = 1;
      for (const s of sc.shades) {
        if (typeof s !== 'object' || s === null || !Array.isArray(s.pos) || s.pos.length !== 3 || !s.pos.every(Number.isFinite)) {
          throw new Error('Invalid shade entry in scenario.shades');
        }
        const id = s.id ? String(s.id) : `S${this.nextShadeId++}`;
        const numMatch = /^S(\d+)$/.exec(id);
        if (numMatch) {
          this.nextShadeId = Math.max(this.nextShadeId, Number(numMatch[1]) + 1);
        }
        this.shades.push({
          id,
          pos: [Number(s.pos[0]), Number(s.pos[1]), Number(s.pos[2])],
          state: s.state ? String(s.state) : 'chase',
          stun_ticks: 0
        });
      }
    } else if (this.random_shades === false) {
      this.shades = [];
    }

    if (sc.lanterns !== undefined) {
      if (!Array.isArray(sc.lanterns)) {
        throw new Error('Invalid scenario.lanterns: must be an array');
      }
      for (const lPatch of sc.lanterns) {
        if (typeof lPatch !== 'object' || lPatch === null || !lPatch.id) {
          throw new Error('Invalid lantern entry in scenario.lanterns');
        }
        const target = this.lanterns.find((l) => l.id === lPatch.id);
        if (!target) {
          throw new Error(`Unknown lantern id in scenario: ${lPatch.id}`);
        }
        if (lPatch.pos !== undefined) {
          if (!Array.isArray(lPatch.pos) || lPatch.pos.length !== 3 || !lPatch.pos.every(Number.isFinite)) {
            throw new Error(`Invalid pos for lantern ${lPatch.id}`);
          }
          target.pos = [Number(lPatch.pos[0]), Number(lPatch.pos[1]), Number(lPatch.pos[2])];
        }
        if (lPatch.deposited !== undefined) {
          if (!Number.isFinite(lPatch.deposited) || lPatch.deposited < 0) {
            throw new Error(`Invalid deposited for lantern ${lPatch.id}`);
          }
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

  /**
   * Build snapshot object for the current tick
   */
  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.sim_tick,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: roundPos(this.player.pos),
        flames: this.player.flames,
        carried: this.player.carried
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
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: roundPos(m.pos)
      }))
    };
  }

  /**
   * Execute 1 simulation step from tick k to k+1.
   * @param {object|null} frameUpdate Optional input frame fields for tick k
   * @returns {Array<object>} Events emitted during this step (all tagged with tick = k + 1)
   */
  step(frameUpdate = null) {
    if (this.state !== 'playing') {
      return [];
    }

    const nextTick = this.tick + 1;
    const events = [];

    // 1. Process inputs & rising edges (false -> true)
    let jumpTriggered = false;
    let interactTriggered = false;
    let pulseTriggered = false;

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
    }

    // 2. Cooldowns & timers decrement
    if (this.player.invuln_ticks > 0) {
      this.player.invuln_ticks--;
    }
    if (this.player.pulse_cooldown_ticks > 0) {
      this.player.pulse_cooldown_ticks--;
    }
    for (const shade of this.shades) {
      if (shade.stun_ticks > 0) {
        shade.stun_ticks--;
        if (shade.stun_ticks === 0) {
          shade.state = 'chase';
        }
      }
    }

    // 3. Player movement (XZ + Jump Y)
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
    const wx = mx * cosT + mz * sinT;
    const wz = -mx * sinT + mz * cosT;

    const stepDist = this.tuning.player_speed * DT;
    let nextX = this.player.pos[0] + wx * stepDist;
    let nextZ = this.player.pos[2] + wz * stepDist;

    // Island boundary handling (fall_enabled: false keeps player on island)
    if (!this.tuning.fall_enabled) {
      const r = Math.hypot(nextX, nextZ);
      if (r > ISLAND_RADIUS) {
        const scale = ISLAND_RADIUS / r;
        nextX *= scale;
        nextZ *= scale;
      }
    }

    // Vertical jump physics (Y >= 0 on island)
    let nextY = this.player.pos[1];
    if (jumpTriggered && nextY <= 0.001) {
      this.player.vy = 6.0;
    }
    if (nextY > 0 || this.player.vy > 0) {
      nextY += this.player.vy * DT;
      this.player.vy -= 18.0 * DT;
      if (nextY <= 0) {
        nextY = 0;
        this.player.vy = 0;
      }
    }

    this.player.pos = [nextX, nextY, nextZ];

    // 4. Auto-pickup motes within pickup_radius (XZ)
    for (let i = 0; i < this.motes.length; i++) {
      if (this.player.carried >= this.tuning.carry_capacity) break;
      const mote = this.motes[i];
      if (distXZ(this.player.pos, mote.pos) <= this.tuning.pickup_radius) {
        this.motes.splice(i, 1);
        i--;
        this.player.carried++;
        this.score += this.tuning.score.per_mote;
        events.push({
          type: 'event',
          tick: nextTick,
          name: 'mote_picked',
          data: { carried: this.player.carried }
        });
      }
    }

    // 5. Interact: deposit carried motes into nearest unlit lantern within interact_radius
    if (interactTriggered && this.player.carried > 0) {
      let nearestLantern = null;
      let nearestDist = Infinity;
      for (const lantern of this.lanterns) {
        if (lantern.lit) continue;
        const d = distXZ(this.player.pos, lantern.pos);
        if (d <= this.tuning.interact_radius && d < nearestDist) {
          nearestDist = d;
          nearestLantern = lantern;
        }
      }
      if (nearestLantern) {
        const needed = this.tuning.lantern_cost - nearestLantern.deposited;
        const amount = Math.min(this.player.carried, needed);
        if (amount > 0) {
          this.player.carried -= amount;
          nearestLantern.deposited += amount;
          events.push({
            type: 'event',
            tick: nextTick,
            name: 'deposit',
            data: {
              lantern_id: nearestLantern.id,
              amount,
              deposited: nearestLantern.deposited
            }
          });

          if (nearestLantern.deposited >= this.tuning.lantern_cost && !nearestLantern.lit) {
            nearestLantern.lit = true;
            this.score += this.tuning.score.per_lantern;
            events.push({
              type: 'event',
              tick: nextTick,
              name: 'lantern_lit',
              data: { lantern_id: nearestLantern.id }
            });
          }
        }
      }
    }

    // 6. Pulse: spend pulse_cost motes to stun and push shades within pulse_radius
    if (
      pulseTriggered &&
      this.player.carried >= this.tuning.pulse_cost &&
      this.player.pulse_cooldown_ticks === 0
    ) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulse_cooldown_ticks = Math.round(this.tuning.pulse_cooldown_s * TICK_RATE);
      const stunTicks = Math.round(this.tuning.pulse_stun_s * TICK_RATE);
      const stunnedIds = [];

      for (const shade of this.shades) {
        const d = distXZ(this.player.pos, shade.pos);
        if (d <= this.tuning.pulse_radius) {
          shade.state = 'stunned';
          shade.stun_ticks = stunTicks;
          stunnedIds.push(shade.id);

          // Push shade away by pulse_push_m along XZ
          let dx = shade.pos[0] - this.player.pos[0];
          let dz = shade.pos[2] - this.player.pos[2];
          const curDist = Math.hypot(dx, dz);
          if (curDist > 1e-6) {
            dx /= curDist;
            dz /= curDist;
          } else {
            dx = 0;
            dz = 1;
          }
          shade.pos[0] += dx * this.tuning.pulse_push_m;
          shade.pos[2] += dz * this.tuning.pulse_push_m;
        }
      }

      this.score += stunnedIds.length * this.tuning.score.per_stun;
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'pulse',
        data: { stunned_ids: stunnedIds }
      });
    }

    // 7. Shades movement & periodic spawning
    const shadeStep = this.tuning.shade_speed * DT;
    for (const shade of this.shades) {
      if (shade.state === 'stunned' || shade.stun_ticks > 0) {
        shade.state = 'stunned';
        continue;
      }
      shade.state = 'chase';
      const dx = this.player.pos[0] - shade.pos[0];
      const dz = this.player.pos[2] - shade.pos[2];
      const dist = Math.hypot(dx, dz);
      let sx = shade.pos[0];
      let sz = shade.pos[2];
      if (dist > 1e-6) {
        const moveAmt = Math.min(dist, shadeStep);
        sx += (dx / dist) * moveAmt;
        sz += (dz / dist) * moveAmt;
      }

      // Enforce safe_radius around lit lanterns (Shades fear lit lanterns)
      if (this.tuning.safe_radius > 0) {
        for (const lantern of this.lanterns) {
          if (!lantern.lit) continue;
          const ldx = sx - lantern.pos[0];
          const ldz = sz - lantern.pos[2];
          const lDist = Math.hypot(ldx, ldz);
          if (lDist <= this.tuning.safe_radius) {
            const pushRadius = this.tuning.safe_radius + 0.01;
            if (lDist > 1e-6) {
              sx = lantern.pos[0] + (ldx / lDist) * pushRadius;
              sz = lantern.pos[2] + (ldz / lDist) * pushRadius;
            } else {
              sx = lantern.pos[0] + pushRadius;
              sz = lantern.pos[2];
            }
          }
        }
      }

      shade.pos[0] = sx;
      shade.pos[2] = sz;
    }

    if (this.random_motes && nextTick % 180 === 0 && this.motes.length < 15) {
      this._spawnRandomMote();
    }
    if (this.random_shades && nextTick % 900 === 0 && this.shades.length < 6) {
      const newShadeId = this._spawnRandomShade();
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'shade_spawned',
        data: { id: newShadeId }
      });
    }

    // 8. Shade collision with player (player_hit)
    if (this.player.invuln_ticks === 0) {
      for (const shade of this.shades) {
        if (shade.state === 'stunned' || shade.stun_ticks > 0) continue;
        if (distXZ(this.player.pos, shade.pos) <= this.tuning.shade_hit_radius) {
          this.player.flames = Math.max(0, this.player.flames - 1);
          const dropped = Math.floor(this.player.carried * (this.tuning.hit_drop_ratio || 0));
          this.player.carried -= dropped;
          this.player.invuln_ticks = Math.round(this.tuning.invuln_s * TICK_RATE);

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
          break; // At most one hit per tick due to invuln_s
        }
      }
    }

    // 9. Advance tick clocks & check win/loss conditions
    this.tick = nextTick;
    this.sim_tick = nextTick;
    this.time_left_s = Math.max(0, this.initial_duration_s - this.sim_tick / TICK_RATE);

    const allLit = this.lanterns.length > 0 && this.lanterns.every((l) => l.lit);
    if (allLit) {
      this.state = 'won';
      const timeBonus = Math.floor(this.time_left_s) * (this.tuning.score.per_second_left || 0);
      const flameBonus = this.player.flames * (this.tuning.score.per_flame_left || 0);
      this.score += timeBonus + flameBonus;
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'game_over',
        data: { result: 'won', reason: 'all_lit' }
      });
    } else if (this.player.flames <= 0) {
      this.state = 'lost';
      events.push({
        type: 'event',
        tick: nextTick,
        name: 'game_over',
        data: { result: 'lost', reason: 'no_flames' }
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

    return events;
  }
}

/**
 * Parse and validate an inputs JSON object according to Test Contract v1.0
 * Throws an Error on malformed structure or non-strictly-increasing ticks.
 */
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
      throw new Error(`Invalid frame order in inputs: tick ${frame.tick} is not strictly greater than ${lastTick}`);
    }
    lastTick = frame.tick;

    if (frame.move !== undefined) {
      if (
        !Array.isArray(frame.move) ||
        frame.move.length !== 2 ||
        !Number.isFinite(frame.move[0]) ||
        !Number.isFinite(frame.move[1])
      ) {
        throw new Error(`Invalid move vector at tick ${frame.tick}`);
      }
    }
    if (frame.cam_yaw_deg !== undefined && !Number.isFinite(frame.cam_yaw_deg)) {
      throw new Error(`Invalid cam_yaw_deg at tick ${frame.tick}`);
    }

    frameMap.set(frame.tick, frame);
  }

  return frameMap;
}
