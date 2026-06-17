/**
 * Cleanup script for fixture-results.json
 *
 * Fixes corrupted winner entries caused by old buggy simulation code:
 * 1. Winners that are not one of the two teams playing
 * 2. Group stage draws that incorrectly have a winner set
 * 3. Knockout winners that contradict the score outcome
 *
 * Usage: node scripts/cleanup-fixture-results.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FIXTURE_RESULTS_PATH = path.join(DATA_DIR, 'fixture-results.json');
const OPENING_FIXTURES_PATH = path.join(DATA_DIR, 'opening-fixtures.json');

// ============================================
// Utility: regenerate match pairings
// ============================================

function buildMatchLookup() {
  const openingFixtures = JSON.parse(fs.readFileSync(OPENING_FIXTURES_PATH, 'utf8'));
  const lookup = {};

  // Matches 1-24: opening fixtures (Matchday 1)
  openingFixtures.forEach(m => {
    lookup[m.id] = { home: m.home, away: m.away, stage: 'Group', group: m.group };
  });

  // Generate matches 25-72 (Matchdays 2 & 3) - same logic as getGroupStageMatches()
  let matchId = 25;

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groupLetters.forEach(grp => {
    const md1 = openingFixtures.filter(m => m.group === grp);
    if (md1.length < 2) return;

    const T1 = md1[0].home;
    const T2 = md1[0].away;
    const T3 = md1[1].home;
    const T4 = md1[1].away;

    // Matchday 2: T1 vs T3, T2 vs T4
    lookup[matchId++] = { home: T1, away: T3, stage: 'Group', group: grp };
    lookup[matchId++] = { home: T2, away: T4, stage: 'Group', group: grp };
    // Matchday 3: T1 vs T4, T2 vs T3
    lookup[matchId++] = { home: T1, away: T4, stage: 'Group', group: grp };
    lookup[matchId++] = { home: T2, away: T3, stage: 'Group', group: grp };
  });

  return lookup;
}

// ============================================
// Main cleanup logic
// ============================================

function main() {
  const lookup = buildMatchLookup();
  const results = JSON.parse(fs.readFileSync(FIXTURE_RESULTS_PATH, 'utf8'));
  const changes = [];
  const fixed = {};

  for (const [key, entry] of Object.entries(results)) {
    if (key === '_syncedAt') {
      fixed[key] = entry;
      continue;
    }

    const matchId = Number(key);
    const { homeScore, awayScore, winner } = entry;
    const matchInfo = lookup[matchId];

    if (!matchInfo) {
      // Match not in lookup - possibly a future generated knockout match
      // Keep as-is but warn
      fixed[key] = entry;
      continue;
    }

    const { home, away, stage } = matchInfo;
    const isGroupStage = stage === 'Group';

    // Determine the correct winner from scores
    const scoreWinner = homeScore > awayScore ? home : awayScore > homeScore ? away : null;

    // Detect corruption
    let correctWinner = winner;
    let reason = null;

    // Rule 1: Winner must be one of the two teams playing
    if (winner && winner !== home && winner !== away) {
      reason = `Winner "${winner}" is not playing in match ${matchId} (${home} vs ${away}). Setting to score-based winner.`;
      correctWinner = scoreWinner;
    }
    // Rule 2: Group stage draws should have no winner
    else if (isGroupStage && homeScore === awayScore && winner !== null) {
      reason = `Group stage draw (${homeScore}-${awayScore}) in match ${matchId} should not have a winner. Removing winner "${winner}".`;
      correctWinner = null;
    }
    // Rule 3: Winner contradicts score (non-draw where winner doesn't match score outcome)
    else if (!isGroupStage && scoreWinner && winner && winner !== scoreWinner) {
      reason = `Knockout match ${matchId}: stored winner "${winner}" contradicts score (${homeScore}-${awayScore}). Score-based winner is "${scoreWinner}".`;
      correctWinner = scoreWinner;
    }
    // Rule 4: Knockout draw with a winner is valid (penalty winner) - keep as-is
    // Rule 5: Winner matches score - keep as-is

    if (reason) {
      changes.push({ matchId, home, away, homeScore, awayScore, oldWinner: winner, newWinner: correctWinner, reason });
      fixed[key] = { homeScore, awayScore, winner: correctWinner };
    } else {
      fixed[key] = entry;
    }
  }

  // Write fixed data
  fs.writeFileSync(FIXTURE_RESULTS_PATH, JSON.stringify(fixed, null, 2) + '\n', 'utf8');

  // Report results
  console.log(`\n=== Cleanup Report ===`);
  console.log(`Total entries: ${Object.keys(results).length}`);
  console.log(`Entries fixed: ${changes.length}`);
  console.log(`Entries unchanged: ${Object.keys(results).length - changes.length - 1} (excluding _syncedAt)`);

  if (changes.length > 0) {
    console.log(`\nChanges made:`);
    changes.forEach(c => {
      const oldVal = c.oldWinner || 'null';
      const newVal = c.newWinner || 'null';
      console.log(`  Match ${c.matchId} (${c.home} ${c.homeScore}-${c.awayScore} ${c.away}):`);
      console.log(`    Winner: ${oldVal} → ${newVal}`);
      console.log(`    Reason: ${c.reason}`);
    });
  } else {
    console.log(`\nNo changes needed - all entries are clean.`);
  }
}

main();
