/**
 * Tests for winner validation and draw handling logic
 *
 * Tests the two winner-resolution functions from winner-utils.js:
 *
 * resolveGroupWinner(): Used for group stage matches (1-72).
 *   - Accepts stored winner only if it's one of the two teams playing
 *   - Falls back to score-based winner (null for draws)
 *
 * resolveKOWinner(): Used for knockout matches (73+).
 *   - Accepts stored winner only if it agrees with score outcome,
 *     OR if match is a draw (penalty winner, stored winner is one of the teams)
 *   - Rejects stored winner that contradicts the score
 *   - Falls back to score-based winner
 *
 * Usage: node server/test-winner-validation.js
 */

'use strict';

const { resolveGroupWinner, resolveKOWinner } = require('./winner-utils');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || ''} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNull(actual, msg) {
  if (actual !== null) {
    throw new Error(`${msg || ''} Expected null, got ${JSON.stringify(actual)}`);
  }
}

// ── Tests: Group Stage Winner Resolution ───────────────────────────────────────

console.log('\n═══ GROUP STAGE WINNER RESOLUTION ═══\n');

test('home team wins, no stored winner', () => {
  assertEqual(resolveGroupWinner(null, 3, 1, 'BRA', 'MAR'), 'BRA');
});

test('away team wins, no stored winner', () => {
  assertEqual(resolveGroupWinner(null, 0, 2, 'KSA', 'URU'), 'URU');
});

test('draw, no stored winner → null', () => {
  assertNull(resolveGroupWinner(null, 1, 1, 'KOR', 'CZE'));
});

test('home wins, stored winner matches score outcome → accepted', () => {
  assertEqual(resolveGroupWinner('BRA', 3, 2, 'BRA', 'MAR'), 'BRA');
});

test('away wins, stored winner matches score outcome → accepted', () => {
  assertEqual(resolveGroupWinner('URU', 0, 2, 'KSA', 'URU'), 'URU');
});

test('stored winner is NOT one of the two teams → recompute from scores', () => {
  // Match 6: AUS vs TUR 5-0, stored winner "BRA" (corrupted - BRA not playing)
  assertEqual(resolveGroupWinner('BRA', 5, 0, 'AUS', 'TUR'), 'AUS');
});

test('stored winner is NOT one of the two teams, draw → null', () => {
  // Match 23: POR vs COD 2-2, stored winner "PAN" (PAN not playing)
  assertNull(resolveGroupWinner('PAN', 2, 2, 'POR', 'COD'));
});

test('stored winner is NOT one of the two teams, away win → correct away team', () => {
  // Match 21: GHA vs PAN 1-2, stored winner "COD" (COD not playing)
  assertEqual(resolveGroupWinner('COD', 1, 2, 'GHA', 'PAN'), 'PAN');
});

// ── Tests: Knockout Winner Resolution ────────────────────────────────────────

console.log('\n═══ KNOCKOUT WINNER RESOLUTION ═══\n');

test('home wins clearly, no stored winner', () => {
  assertEqual(resolveKOWinner(null, 2, 0, 'RSA', 'EGY'), 'RSA');
});

test('away wins clearly, no stored winner', () => {
  assertEqual(resolveKOWinner(null, 1, 3, 'USA', 'GER'), 'GER');
});

test('draw with stored winner (penalty winner) → accept stored winner', () => {
  assertEqual(resolveKOWinner('CAN', 1, 1, 'CAN', 'JPN'), 'CAN');
});

test('draw with stored winner as away team (penalty winner) → accept', () => {
  assertEqual(resolveKOWinner('JPN', 1, 1, 'CAN', 'JPN'), 'JPN');
});

test('stored winner contradicts score (non-draw) → use score-based winner', () => {
  // GHA 4-5 OPP, stored winner "GHA". Score says away team won.
  assertEqual(resolveKOWinner('GHA', 4, 5, 'GHA', 'EGY'), 'EGY');
});

test('stored winner contradicts score (home clearly wins, stored says away) → use score-based', () => {
  // USA 3-0 MEX, stored winner "MEX" is wrong. Score says USA won.
  assertEqual(resolveKOWinner('MEX', 3, 0, 'USA', 'MEX'), 'USA');
});

test('stored winner is not playing in the match → recompute from scores', () => {
  assertEqual(resolveKOWinner('BRA', 2, 1, 'RSA', 'EGY'), 'RSA');
});

test('draw with no stored winner → null', () => {
  assertNull(resolveKOWinner(null, 2, 2, 'NED', 'FRA'));
});

test('home wins, stored winner matches → accepted', () => {
  assertEqual(resolveKOWinner('BRA', 3, 0, 'BRA', 'ARG'), 'BRA');
});

test('away wins, stored winner matches → accepted', () => {
  assertEqual(resolveKOWinner('ARG', 1, 2, 'BRA', 'ARG'), 'ARG');
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

console.log('\n═══ EDGE CASES ═══\n');

test('null scores with stored winner → group stage accepts stored winner if valid', () => {
  assertEqual(resolveGroupWinner('USA', null, null, 'USA', 'MEX'), 'USA');
});

test('null scores with stored winner → KO accepts stored winner (null scores are treated as unknown, winner passes through)', () => {
  // With null scores, scoreWinner is null. stored winner 'USA' is one of the teams,
  // and since !scoreWinner is true, the stored winner is accepted as a potential penalty winner.
  assertEqual(resolveKOWinner('USA', null, null, 'USA', 'MEX'), 'USA');
});

test('zero-zero draw, no stored winner → null (both)', () => {
  assertNull(resolveGroupWinner(null, 0, 0, 'A', 'B'));
  assertNull(resolveKOWinner(null, 0, 0, 'A', 'B'));
});

test('large score (6-0), stored winner is wrong team → correct', () => {
  assertEqual(resolveGroupWinner('X', 6, 0, 'A', 'B'), 'A');
  assertEqual(resolveKOWinner('X', 6, 0, 'A', 'B'), 'A');
});

test('group stage: valid stored winner for non-draw takes precedence', () => {
  // Score says away team won, but stored says home - group stage accepts stored
  assertEqual(resolveGroupWinner('A', 0, 2, 'A', 'B'), 'A');
});

test('KO: valid stored winner for non-draw must match score', () => {
  // Score says away team won, stored says home - KO should reject stored
  assertEqual(resolveKOWinner('A', 0, 2, 'A', 'B'), 'B');
});

// ── Summary ────────────────────────────────────────────────────────────────────

console.log(`\n═══ RESULTS ═══`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);

if (failed > 0) {
  console.log(`\n  ❌ Some tests FAILED.`);
  process.exit(1);
} else {
  console.log(`\n  ✅ All ${passed} tests passed.`);
}

console.log();
