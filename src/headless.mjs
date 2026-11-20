#!/usr/bin/env node
// Headless CLI Runner for "Đảo Đèn Lồng" (Test Contract v1.0)
// Usage:
//   node src/headless.mjs --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameSimulation, DEFAULT_TUNING, parseAndValidateInputs } from './core/sim.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function exitWithError(msg, code = 1) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    seed: 1,
    night: 1,
    scenario: null,
    inputs: null,
    ticks: null,
    out: null,
    snapshotEvery: 10
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];

    switch (flag) {
      case '--seed':
        if (next === undefined) exitWithError('Missing value for --seed', 1);
        args.seed = Number(next);
        if (!Number.isInteger(args.seed)) exitWithError('--seed must be an integer', 1);
        i++;
        break;
      case '--night':
        if (next === undefined) exitWithError('Missing value for --night', 1);
        args.night = Number(next);
        if (!Number.isInteger(args.night) || args.night < 1) exitWithError('--night must be a positive integer', 1);
        i++;
        break;
      case '--scenario':
        if (next === undefined) exitWithError('Missing value for --scenario', 2);
        args.scenario = next;
        i++;
        break;
      case '--inputs':
        if (next === undefined) exitWithError('Missing value for --inputs', 2);
        args.inputs = next;
        i++;
        break;
      case '--ticks':
        if (next === undefined) exitWithError('Missing value for --ticks', 1);
        args.ticks = Number(next);
        if (!Number.isInteger(args.ticks) || args.ticks < 0) exitWithError('--ticks must be a non-negative integer', 1);
        i++;
        break;
      case '--out':
        if (next === undefined) exitWithError('Missing value for --out', 1);
        args.out = next;
        i++;
        break;
      case '--snapshot-every':
        if (next === undefined) exitWithError('Missing value for --snapshot-every', 1);
        args.snapshotEvery = Number(next);
        if (!Number.isInteger(args.snapshotEvery) || args.snapshotEvery <= 0) {
          exitWithError('--snapshot-every must be a positive integer', 1);
        }
        i++;
        break;
      default:
        exitWithError(`Unknown argument: ${flag}`, 1);
    }
  }

  if (args.ticks === null) {
    exitWithError('Missing required argument: --ticks', 1);
  }
  if (!args.out) {
    exitWithError('Missing required argument: --out', 1);
  }

  return args;
}

function loadContractTuning() {
  try {
    const contractPath = path.resolve(__dirname, '..', 'game.contract.json');
    if (fs.existsSync(contractPath)) {
      const raw = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
      if (raw && raw.tuning) {
        return raw.tuning;
      }
    }
  } catch {
    // Fallback to DEFAULT_TUNING
  }
  return DEFAULT_TUNING;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tuning = loadContractTuning();

  let scenarioObj = null;
  if (args.scenario) {
    let rawScenario;
    try {
      rawScenario = fs.readFileSync(args.scenario, 'utf8');
    } catch (err) {
      exitWithError(`Failed to read scenario file "${args.scenario}": ${err.message}`, 2);
    }
    try {
      scenarioObj = JSON.parse(rawScenario);
    } catch (err) {
      exitWithError(`Invalid JSON in scenario file "${args.scenario}": ${err.message}`, 2);
    }
  }

  let frameMap = new Map();
  if (args.inputs) {
    let rawInputs;
    try {
      rawInputs = fs.readFileSync(args.inputs, 'utf8');
    } catch (err) {
      exitWithError(`Failed to read inputs file "${args.inputs}": ${err.message}`, 2);
    }
    let inputsObj;
    try {
      inputsObj = JSON.parse(rawInputs);
    } catch (err) {
      exitWithError(`Invalid JSON in inputs file "${args.inputs}": ${err.message}`, 2);
    }
    try {
      frameMap = parseAndValidateInputs(inputsObj);
    } catch (err) {
      exitWithError(`Validation error in inputs file "${args.inputs}": ${err.message}`, 2);
    }
  }

  let sim;
  try {
    sim = new GameSimulation({
      seed: args.seed,
      night: args.night,
      scenario: scenarioObj,
      tuning
    });
  } catch (err) {
    exitWithError(`Scenario validation error: ${err.message}`, 2);
  }

  const lines = [];

  // Snapshot at tick 0 (after scenario setup, before applying any input)
  lines.push(JSON.stringify(sim.getSnapshot()));

  // Run up to args.ticks steps (k = 0 .. N-1)
  for (let k = 0; k < args.ticks; k++) {
    if (sim.state !== 'playing') {
      break;
    }

    const frame = frameMap.get(k) || null;
    const events = sim.step(frame);

    for (const ev of events) {
      lines.push(JSON.stringify(ev));
    }

    // Snapshot every --snapshot-every ticks
    if (sim.tick % args.snapshotEvery === 0) {
      lines.push(JSON.stringify(sim.getSnapshot()));
    }

    if (sim.state !== 'playing') {
      break;
    }
  }

  // Final compulsory "end" record
  lines.push(
    JSON.stringify({
      type: 'end',
      ticks: sim.tick,
      state: sim.state,
      score: sim.score
    })
  );

  try {
    const outDir = path.dirname(path.resolve(args.out));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(args.out, lines.join('\n') + '\n', 'utf8');
  } catch (err) {
    exitWithError(`Failed to write output file "${args.out}": ${err.message}`, 1);
  }

  process.exit(0);
}

main();
