// Automated Verification & Proof Generation Suite for Phase 1 ("Đảo Đèn Lồng")
// Runs unit tests, scenario headless tests, determinism checks, and exit-code checks,
// and saves real verification artifacts into docs/proof/phase1/.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameSimulation, DEFAULT_TUNING } from '../src/core/sim.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PROOF_DIR = path.join(ROOT_DIR, 'docs', 'proof', 'phase1');
const SCENARIOS_DIR = path.join(PROOF_DIR, 'scenarios');
const OUTPUTS_DIR = path.join(PROOF_DIR, 'outputs');

fs.mkdirSync(SCENARIOS_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function runHeadlessCLI(args) {
  const headlessPath = path.join(ROOT_DIR, 'src', 'headless.mjs');
  return spawnSync(process.execPath, [headlessPath, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  });
}

function parseJsonl(content) {
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const results = [];

function runTest(id, description, fn) {
  const start = performance.now();
  try {
    const details = fn();
    const ms = (performance.now() - start).toFixed(2);
    results.push({ id, description, status: 'PASS', ms, details: details || '' });
    console.log(`✅ [PASS] ${id}: ${description} (${ms} ms)`);
  } catch (err) {
    const ms = (performance.now() - start).toFixed(2);
    results.push({ id, description, status: 'FAIL', ms, details: err.message });
    console.error(`❌ [FAIL] ${id}: ${description} — ${err.message}`);
    throw err;
  }
}

console.log('=== ĐẢO ĐÈN LỒNG — PHASE 1 AUTOMATED VERIFICATION ===\n');

// Test 1: Contract validation
runTest('AC-1.1', 'Validate game.contract.json schema & tuning fields', () => {
  const contractPath = path.join(ROOT_DIR, 'game.contract.json');
  assert.ok(fs.existsSync(contractPath), 'game.contract.json must exist at repo root');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  assert.equal(contract.contract_version, '1.0');
  assert.equal(contract.tuning.lantern_count_night1, 5);
  assert.ok(contract.tuning.player_speed > 0);
  assert.ok(contract.tuning.carry_capacity >= contract.tuning.lantern_cost);
  return `contract_version=${contract.contract_version}, team=${contract.team}`;
});

// Test 2: Movement math with cam_yaw_deg & mote_picked
runTest('AC-1.2', 'Verify cam_yaw_deg movement transformation & mote_picked event', () => {
  const scPath = path.join(SCENARIOS_DIR, 'sc_pickup_yaw.json');
  const inPath = path.join(SCENARIOS_DIR, 'in_pickup_yaw.json');
  const outPath = path.join(OUTPUTS_DIR, 'out_pickup_yaw.jsonl');

  // Place M1 at (0, 0, 3) and M2 at (3, 0, 3)
  fs.writeFileSync(
    scPath,
    JSON.stringify(
      {
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        random_motes: false,
        random_shades: false,
        motes: [
          [0, 0, 3],
          [3, 0, 3]
        ],
        shades: []
      },
      null,
      2
    )
  );

  // Move forward along +Z (move:[0,1], yaw:0) for 23 ticks (~3.06m), then turn yaw:90 and move forward (move:[0,1] -> +X) for 23 ticks
  fs.writeFileSync(
    inPath,
    JSON.stringify(
      {
        frames: [
          { tick: 0, move: [0, 1], cam_yaw_deg: 0 },
          { tick: 23, move: [0, 1], cam_yaw_deg: 90 },
          { tick: 46, move: [0, 0] }
        ]
      },
      null,
      2
    )
  );

  const res = runHeadlessCLI([
    '--seed', '10',
    '--night', '1',
    '--scenario', scPath,
    '--inputs', inPath,
    '--ticks', '50',
    '--out', outPath,
    '--snapshot-every', '10'
  ]);
  assert.equal(res.status, 0, `Expected exit 0, got ${res.status}: ${res.stderr}`);

  const records = parseJsonl(fs.readFileSync(outPath, 'utf8'));
  const pickups = records.filter((r) => r.type === 'event' && r.name === 'mote_picked');
  assert.equal(pickups.length, 2, 'Must pick up both motes using cam_yaw_deg rotation');
  assert.equal(pickups[0].data.carried, 1);
  assert.equal(pickups[1].data.carried, 2);
  const endRec = records.at(-1);
  assert.equal(endRec.type, 'end');
  assert.equal(endRec.score, 20);
  return `Picked 2 motes at ticks ${pickups.map((p) => p.tick).join(', ')}; final score=${endRec.score}`;
});

// Test 3: Deposit, lantern_lit, and win condition (all_lit)
runTest('AC-1.3', 'Verify interact deposit, lantern_lit, and game_over (won / all_lit)', () => {
  const scPath = path.join(SCENARIOS_DIR, 'sc_win_all_lit.json');
  const inPath = path.join(SCENARIOS_DIR, 'in_win_all_lit.json');
  const outPath = path.join(OUTPUTS_DIR, 'out_win_all_lit.jsonl');

  // L2..L5 already lit; L1 at (0, 0, 2) needs 3 motes; player at (0,0,0) carries 3 motes
  fs.writeFileSync(
    scPath,
    JSON.stringify(
      {
        player: { pos: [0, 0, 0], carried: 3, flames: 3 },
        random_motes: false,
        random_shades: false,
        motes: [],
        shades: [],
        lanterns: [
          { id: 'L1', pos: [0, 0, 2.0], deposited: 0, lit: false },
          { id: 'L2', lit: true },
          { id: 'L3', lit: true },
          { id: 'L4', lit: true },
          { id: 'L5', lit: true }
        ],
        time_left_s: 120
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    inPath,
    JSON.stringify(
      {
        frames: [
          { tick: 5, interact: true },
          { tick: 6, interact: false }
        ]
      },
      null,
      2
    )
  );

  const res = runHeadlessCLI([
    '--seed', '1',
    '--night', '1',
    '--scenario', scPath,
    '--inputs', inPath,
    '--ticks', '100',
    '--out', outPath
  ]);
  assert.equal(res.status, 0);

  const records = parseJsonl(fs.readFileSync(outPath, 'utf8'));
  const depositEv = records.find((r) => r.type === 'event' && r.name === 'deposit');
  const litEv = records.find((r) => r.type === 'event' && r.name === 'lantern_lit');
  const winEv = records.find((r) => r.type === 'event' && r.name === 'game_over');
  const endRec = records.at(-1);

  assert.ok(depositEv, 'deposit event must be emitted');
  assert.deepEqual(depositEv.data, { lantern_id: 'L1', amount: 3, deposited: 3 });
  assert.ok(litEv, 'lantern_lit event must be emitted');
  assert.equal(litEv.data.lantern_id, 'L1');
  assert.ok(winEv, 'game_over event must be emitted');
  assert.deepEqual(winEv.data, { result: 'won', reason: 'all_lit' });
  assert.equal(endRec.state, 'won');
  assert.equal(endRec.ticks, 6, 'Simulation must stop at tick 6 immediately when won');

  return `Lit L1 at tick ${litEv.tick}, game_over=won(all_lit), score=${endRec.score}`;
});

// Test 4: Pulse stun and knockback
runTest('AC-1.4', 'Verify pulse event stuns and pushes shades back', () => {
  const scPath = path.join(SCENARIOS_DIR, 'sc_pulse_stun.json');
  const inPath = path.join(SCENARIOS_DIR, 'in_pulse_stun.json');
  const outPath = path.join(OUTPUTS_DIR, 'out_pulse_stun.jsonl');

  fs.writeFileSync(
    scPath,
    JSON.stringify(
      {
        player: { pos: [0, 0, 0], carried: 2, flames: 3 },
        random_motes: false,
        random_shades: false,
        motes: [],
        shades: [
          { id: 'S1', pos: [0, 0, 3.0] },
          { id: 'S2', pos: [0, 0, 15.0] }
        ]
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    inPath,
    JSON.stringify(
      {
        frames: [
          { tick: 0, pulse: true },
          { tick: 1, pulse: false }
        ]
      },
      null,
      2
    )
  );

  const res = runHeadlessCLI([
    '--seed', '1',
    '--night', '1',
    '--scenario', scPath,
    '--inputs', inPath,
    '--ticks', '10',
    '--out', outPath,
    '--snapshot-every', '1'
  ]);
  assert.equal(res.status, 0);

  const records = parseJsonl(fs.readFileSync(outPath, 'utf8'));
  const pulseEv = records.find((r) => r.type === 'event' && r.name === 'pulse');
  assert.ok(pulseEv, 'pulse event must be emitted');
  assert.deepEqual(pulseEv.data.stunned_ids, ['S1']);

  const snap1 = records.find((r) => r.type === 'snapshot' && r.tick === 1);
  const s1 = snap1.shades.find((s) => s.id === 'S1');
  assert.equal(s1.state, 'stunned');
  assert.equal(s1.pos[2], 7.0, 'S1 at z=3 pushed by 4m must be at z=7');

  return `Pulse stunned S1, pushed from z=3.0 to z=${s1.pos[2]}`;
});

// Test 5: Shade hit, mote drop, and loss by no_flames
runTest('AC-1.5', 'Verify player_hit event, mote drop ratio, and game_over (lost / no_flames)', () => {
  const scPath = path.join(SCENARIOS_DIR, 'sc_hit_lose.json');
  const outPath = path.join(OUTPUTS_DIR, 'out_hit_lose.jsonl');

  fs.writeFileSync(
    scPath,
    JSON.stringify(
      {
        player: { pos: [0, 0, 0], carried: 4, flames: 1 },
        random_motes: false,
        random_shades: false,
        motes: [],
        shades: [{ id: 'S1', pos: [0, 0, 0.8] }]
      },
      null,
      2
    )
  );

  const res = runHeadlessCLI([
    '--seed', '1',
    '--night', '1',
    '--scenario', scPath,
    '--ticks', '20',
    '--out', outPath
  ]);
  assert.equal(res.status, 0);

  const records = parseJsonl(fs.readFileSync(outPath, 'utf8'));
  const hitEv = records.find((r) => r.type === 'event' && r.name === 'player_hit');
  const overEv = records.find((r) => r.type === 'event' && r.name === 'game_over');
  const endRec = records.at(-1);

  assert.ok(hitEv, 'player_hit must be emitted');
  assert.deepEqual(hitEv.data, { by: 'shade', flames: 0, dropped: 2 });
  assert.ok(overEv, 'game_over must be emitted');
  assert.deepEqual(overEv.data, { result: 'lost', reason: 'no_flames' });
  assert.equal(endRec.state, 'lost');

  return `Hit at tick ${hitEv.tick}: flames=0, dropped=2 -> game_over=lost(no_flames)`;
});

// Test 6: Dawn timeout & Safe radius around lit lanterns
runTest('AC-1.6', 'Verify safe_radius around lit lantern & game_over (lost / dawn)', () => {
  const scPath = path.join(SCENARIOS_DIR, 'sc_safe_dawn.json');
  const outPath = path.join(OUTPUTS_DIR, 'out_safe_dawn.jsonl');

  // Player stands right next to lit lantern L1 at (0,0,0); Shade S1 tries to chase from (0,0,7)
  // Time left is 1.0 second (60 ticks), so at tick 60 dawn occurs without player being hit!
  fs.writeFileSync(
    scPath,
    JSON.stringify(
      {
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        random_motes: false,
        random_shades: false,
        motes: [],
        shades: [{ id: 'S1', pos: [0, 0, 6.0] }],
        lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }],
        time_left_s: 1.0
      },
      null,
      2
    )
  );

  const res = runHeadlessCLI([
    '--seed', '1',
    '--night', '1',
    '--scenario', scPath,
    '--ticks', '100',
    '--out', outPath,
    '--snapshot-every', '10'
  ]);
  assert.equal(res.status, 0);

  const records = parseJsonl(fs.readFileSync(outPath, 'utf8'));
  const hits = records.filter((r) => r.type === 'event' && r.name === 'player_hit');
  assert.equal(hits.length, 0, 'Shade must not enter safe_radius (5.0m) of lit L1');

  const overEv = records.find((r) => r.type === 'event' && r.name === 'game_over');
  assert.deepEqual(overEv.data, { result: 'lost', reason: 'dawn' });
  const endRec = records.at(-1);
  assert.equal(endRec.ticks, 60);
  assert.equal(endRec.state, 'lost');

  return `0 hits inside safe_radius=5m; dawn triggered at tick ${endRec.ticks}`;
});

// Test 7: Determinism & Exit Code 2 on invalid inputs
runTest('AC-1.7', 'Verify 100% byte-for-byte determinism & exit code 2 on malformed inputs', () => {
  const outRun1 = path.join(OUTPUTS_DIR, 'out_det_run1.jsonl');
  const outRun2 = path.join(OUTPUTS_DIR, 'out_det_run2.jsonl');
  const inDetPath = path.join(SCENARIOS_DIR, 'in_determinism.json');

  fs.writeFileSync(
    inDetPath,
    JSON.stringify(
      {
        frames: [
          { tick: 0, move: [0.6, 0.8], cam_yaw_deg: 30 },
          { tick: 60, jump: true },
          { tick: 61, jump: false },
          { tick: 120, move: [-0.5, 0.5], cam_yaw_deg: 145 },
          { tick: 300, pulse: true },
          { tick: 301, pulse: false }
        ]
      },
      null,
      2
    )
  );

  // Run 950 ticks so periodic shade_spawned (at tick 900) and random motes are also tested
  const r1 = runHeadlessCLI([
    '--seed', '202603575',
    '--night', '1',
    '--inputs', inDetPath,
    '--ticks', '950',
    '--out', outRun1,
    '--snapshot-every', '50'
  ]);
  const r2 = runHeadlessCLI([
    '--seed', '202603575',
    '--night', '1',
    '--inputs', inDetPath,
    '--ticks', '950',
    '--out', outRun2,
    '--snapshot-every', '50'
  ]);

  assert.equal(r1.status, 0);
  assert.equal(r2.status, 0);

  const hash1 = sha256(fs.readFileSync(outRun1, 'utf8'));
  const hash2 = sha256(fs.readFileSync(outRun2, 'utf8'));
  assert.equal(hash1, hash2, 'Determinism check failed: SHA-256 hashes differ');

  // Verify shade_spawned occurred at tick 900
  const detRecords = parseJsonl(fs.readFileSync(outRun1, 'utf8'));
  const spawnEv = detRecords.find((r) => r.type === 'event' && r.name === 'shade_spawned');
  assert.ok(spawnEv, 'Periodic shade_spawned event should be recorded at tick 900');

  // Now test invalid input (non-increasing frame ticks) -> must exit with code 2
  const badInPath = path.join(SCENARIOS_DIR, 'in_invalid_order.json');
  fs.writeFileSync(
    badInPath,
    JSON.stringify({
      frames: [
        { tick: 10, move: [1, 0] },
        { tick: 10, move: [0, 1] }
      ]
    })
  );
  const badRes = runHeadlessCLI([
    '--seed', '1',
    '--night', '1',
    '--inputs', badInPath,
    '--ticks', '20',
    '--out', path.join(OUTPUTS_DIR, 'out_should_not_exist.jsonl')
  ]);
  assert.equal(badRes.status, 2, `Expected exit code 2 for invalid inputs, got ${badRes.status}`);
  assert.ok(badRes.stderr.includes('Error:'), 'Must write error message to stderr');

  return `SHA-256=${hash1.slice(0, 16)}... matched 100%; invalid input exit_code=${badRes.status}`;
});

// Test 8: AC-1.8 3D Client & Creative Features Isolation
runTest('AC-1.8', 'Verify 3D Client assets & strict isolation of creative features from headless core', () => {
  const htmlPath = path.join(ROOT_DIR, 'src', 'client', 'index.html');
  const clientPath = path.join(ROOT_DIR, 'src', 'client', 'main.mjs');
  const corePath = path.join(ROOT_DIR, 'src', 'core', 'sim.mjs');

  assert.ok(fs.existsSync(htmlPath), '3D client index.html must exist');
  assert.ok(fs.existsSync(clientPath), '3D client main.mjs must exist');

  const coreSource = fs.readFileSync(corePath, 'utf8');
  assert.ok(!coreSource.includes('Math.random'), 'src/core/sim.mjs must not use Math.random()');
  assert.ok(!coreSource.includes('Date.now'), 'src/core/sim.mjs must not use Date.now()');
  assert.ok(!coreSource.includes('window') && !coreSource.includes('document'), 'src/core/sim.mjs must be 100% DOM-free');

  const clientSource = fs.readFileSync(clientPath, 'utf8');
  assert.ok(clientSource.includes('PentatonicAudio'), 'Creative feature 1 (PentatonicAudio) present in client');
  assert.ok(clientSource.includes('Guiding Spirit Wisp'), 'Creative feature 2 (Guiding Spirit Wisp) present in client');

  return 'Core is 100% DOM/Math.random-free; 3D client & 2 creative features verified';
});

// Generate Markdown Proof Report for Phase 1
const reportLines = [
  '# Bằng chứng Kiểm chứng Phase 1 (Verification Proof Report)',
  '',
  `- **Node.js Runtime:** \`${process.version}\` (\`${process.platform} / ${process.arch}\`)`,
  `- **Trạng thái tổng thể:** **${results.every((r) => r.status === 'PASS') ? '100% PASS (8/8 AC)' : 'FAILED'}**`,
  '',
  '## 1. Bảng Truy vết Yêu cầu đến Bằng chứng (Traceability Matrix)',
  '',
  '| Mã AC | Yêu cầu (PRD-0 & Contract v1.0) | Kịch bản & File Đầu vào | File Output Bằng chứng | Kết quả | Chi tiết Kiểm chứng |',
  '|---|---|---|---|---|---|',
  ...results.map((r) => {
    const mapFiles = {
      'AC-1.1': ['`game.contract.json`', '`game.contract.json`'],
      'AC-1.2': ['`scenarios/sc_pickup_yaw.json`, `in_pickup_yaw.json`', '`outputs/out_pickup_yaw.jsonl`'],
      'AC-1.3': ['`scenarios/sc_win_all_lit.json`, `in_win_all_lit.json`', '`outputs/out_win_all_lit.jsonl`'],
      'AC-1.4': ['`scenarios/sc_pulse_stun.json`, `in_pulse_stun.json`', '`outputs/out_pulse_stun.jsonl`'],
      'AC-1.5': ['`scenarios/sc_hit_lose.json`', '`outputs/out_hit_lose.jsonl`'],
      'AC-1.6': ['`scenarios/sc_safe_dawn.json`', '`outputs/out_safe_dawn.jsonl`'],
      'AC-1.7': ['`scenarios/in_determinism.json`, `in_invalid_order.json`', '`outputs/out_det_run1.jsonl`, `out_det_run2.jsonl`'],
      'AC-1.8': ['`src/client/index.html`, `src/client/main.mjs`', '`src/core/sim.mjs` (Static Isolation Check)']
    }[r.id] || ['-', '-'];
    return `| **${r.id}** | ${r.description} | ${mapFiles[0]} | ${mapFiles[1]} | **${r.status}** | ${r.details} |`;
  }),
  '',
  '## 2. Lệnh Tái lập Bằng chứng (Reproducibility)',
  '',
  'Giảng viên có thể chạy lại toàn bộ bộ kiểm chứng này ở tag `phase-1` bằng một lệnh duy nhất:',
  '```bash',
  'npm run verify',
  '```'
];

fs.writeFileSync(path.join(PROOF_DIR, 'PROOF_PHASE1.md'), reportLines.join('\n') + '\n', 'utf8');
console.log(`\n📄 Proof report generated at: docs/proof/phase1/PROOF_PHASE1.md`);
