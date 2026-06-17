#!/usr/bin/env node
/**
 * Apply Calibration Script
 *
 * Runs the lambda calibration, compares the optimal BASE value against the
 * current values in all three source files, and updates them if needed.
 *
 * Designed for CI/CD (GitHub Actions) so it returns a machine-readable
 * JSON summary on stdout and uses exit code 0 / 1 to signal whether
 * changes were applied.
 *
 * Usage:
 *   node scripts/apply-calibration.mjs [--dry-run]
 *
 * Env vars:
 *   CI_QUICK=1   Reduce simulation runs for faster CI execution
 *
 * Exit codes:
 *   0 — No update needed (optimal lambda matches current value)
 *   1 — Update applied (or would have been applied in dry-run mode)
 *   2 — Error
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

// ─── Files that contain the BASE_LAMBDA constant ───
const SOURCE_FILES = [
  {
    path: join(PROJECT_ROOT, 'client', 'src', 'app', 'services', 'simulation.service.ts'),
    // Match the line: readonly BASE_LAMBDA = <number>;
    pattern: /(readonly BASE_LAMBDA\s*=\s*)([\d.]+)(;\s*\/\*\*)/,
    label: 'client SimulationService',
  },
  {
    path: join(PROJECT_ROOT, 'server', 'index.js'),
    // Match the line: const BASE_LAMBDA = <number>;
    pattern: /(const BASE_LAMBDA\s*=\s*)([\d.]+)(;)/,
    label: 'server/index.js',
  },
  {
    path: join(PROJECT_ROOT, 'netlify', 'functions', 'api.js'),
    // Match the line: const BASE_LAMBDA = <number>;
    pattern: /(const BASE_LAMBDA\s*=\s*)([\d.]+)(;)/,
    label: 'netlify/functions/api.js',
  },
];

// ─── Read current value from a source file ───
function readCurrentValue(filePath, pattern) {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(pattern);
  if (!match) {
    console.error(`  [ERR] Could not find BASE_LAMBDA in ${filePath}`);
    return null;
  }
  return { value: parseFloat(match[2]), line: match[0], prefix: match[1], suffix: match[3] };
}

// ─── Read calibration results from data/lambda-calibration.json ───
function readCalibrationResults() {
  const calPath = join(PROJECT_ROOT, 'data', 'lambda-calibration.json');
  const raw = readFileSync(calPath, 'utf8');
  const results = JSON.parse(raw);
  // Sort by MSE ascending (best first)
  results.sort((a, b) => a.mse - b.mse);
  const best = results[0];
  return { best, all: results };
}

// ─── Update a source file with the new value ───
function updateSourceFile(filePath, original, oldVal, newVal) {
  const content = readFileSync(filePath, 'utf8');
  // Replace the exact captured line with the new value (toFixed preserves decimals like 1.40)
  const newLine = original.replace(oldVal.toFixed(2), newVal.toFixed(2));
  const idx = content.indexOf(original);
  if (idx === -1) {
    console.error(`  [ERR] Could not locate BASE_LAMBDA line for replacement in ${filePath}`);
    return false;
  }
  const updatedContent = content.slice(0, idx) + newLine + content.slice(idx + original.length);
  if (!isDryRun) {
    writeFileSync(filePath, updatedContent, 'utf8');
  }
  return true;
}

// ─── Get all BASE_LAMBDA constants from market-odds bench tables (not needed, only source files matter) ───

// ─── MAIN ───
async function main() {
  console.log('═══ Auto-Calibration Script ═══');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no files will be written)' : 'LIVE'}`);
  console.log();

  // Step 1: Run the calibration script
  console.log('▶ Step 1: Running calibration…');
  const child = await import('child_process');
  const calScript = join(__dirname, 'calibrate-lambda.mjs');
  const calResult = child.spawnSync(process.execPath, [calScript], {
    cwd: PROJECT_ROOT,
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env },
  });

  if (calResult.status !== 0) {
    console.error(`Calibration script exited with code ${calResult.status}`);
    process.exit(2);
  }

  // Step 2: Read calibration results
  console.log();
  console.log('▶ Step 2: Reading calibration results…');
  let calData;
  try {
    calData = readCalibrationResults();
  } catch (err) {
    console.error(`Failed to read calibration results: ${err.message}`);
    process.exit(2);
  }

  const optimalBase = calData.best.base;
  const optimalMse = calData.best.mse;
  console.log(`  Optimal BASE = ${optimalBase.toFixed(2)} (MSE: ${optimalMse.toFixed(4)})`);

  // Step 3: Compare with current values in source files
  console.log();
  console.log('▶ Step 3: Comparing with source files…');

  const updates = [];
  for (const sf of SOURCE_FILES) {
    const current = readCurrentValue(sf.path, sf.pattern);
    if (current === null) continue;

    const relPath = relative(PROJECT_ROOT, sf.path);
    const needsUpdate = Math.abs(current.value - optimalBase) > 0.01; // tolerance for float comparison

    console.log(`  ${sf.label} (${relPath}): current=${current.value.toFixed(2)}, optimal=${optimalBase.toFixed(2)}`);

    if (needsUpdate) {
      console.log(`    → NEEDS UPDATE: ${current.value} → ${optimalBase}`);
      updates.push({
        file: sf.path,
        relPath,
        label: sf.label,
        oldVal: current.value,
        newVal: optimalBase,
        originalLine: current.line,
        prefix: current.prefix,
        suffix: current.suffix,
      });
    } else {
      console.log(`    ✓ Already at optimal value`);
    }
  }

  // Step 4: Apply updates if needed
  console.log();
  if (updates.length === 0) {
    console.log('▶ Step 4: No updates needed — all source files are at optimal BASE_LAMBDA ✅');
    console.log();
    console.log('═══ Result: NO_CHANGE ═══');
    process.exit(0);
  }

  console.log(`▶ Step 4: Applying ${updates.length} update(s)…`);

  let allApplied = true;
  for (const u of updates) {
    console.log(`  ${u.label}: ${u.oldVal} → ${u.newVal}${isDryRun ? ' (dry-run, skipped)' : ''}`);
    const ok = updateSourceFile(u.file, u.originalLine, u.oldVal, u.newVal);
    if (!ok) allApplied = false;
  }

  if (!allApplied) {
    console.error('Some updates failed');
    process.exit(2);
  }

  if (isDryRun) {
    console.log();
    console.log('═══ Result: UPDATE_NEEDED (dry-run) ═══');
    process.exit(1);
  }

  // Record the calibration metadata
  const calMetaPath = join(PROJECT_ROOT, 'data', 'calibration-meta.json');
  const meta = {
    lastCalibratedAt: new Date().toISOString(),
    optimalBase,
    optimalMse,
    previously: updates[0].oldVal,
    filesUpdated: updates.map(u => u.relPath),
  };
  writeFileSync(calMetaPath, JSON.stringify(meta, null, 2));
  console.log(`  Calibration metadata written to data/calibration-meta.json`);

  console.log();
  console.log('═══ Result: UPDATED ═══');
  process.exit(1); // Exit 1 signals "changes were made"
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
