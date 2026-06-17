/**
 * Lambda Calibration Script
 *
 * Runs tournament simulations at multiple BASE lambda values and compares
 * champion probabilities against betting market odds (from the bench table)
 * to find the best-fit BASE value.
 *
 * Usage: node scripts/calibrate-lambda.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// ─── Market odds (bench table from SimulationService) ───
const BENCH = Object.freeze({
  ESP: { opta: 16.1, market: 16.5 }, FRA: { opta: 13.0, market: 13.5 },
  ENG: { opta: 11.2, market: 11.5 }, ARG: { opta: 10.4, market: 10.5 },
  POR: { opta: 7.8, market: 8.0 }, BRA: { opta: 7.2, market: 7.5 },
  GER: { opta: 5.8, market: 6.0 }, NED: { opta: 5.2, market: 5.5 },
  URU: { opta: 4.3, market: 4.5 }, COL: { opta: 4.1, market: 4.0 },
  MAR: { opta: 3.5, market: 3.2 }, BEL: { opta: 3.0, market: 2.8 },
  CRO: { opta: 2.2, market: 2.0 }, SUI: { opta: 1.5, market: 1.6 },
  USA: { opta: 1.8, market: 1.5 }, JPN: { opta: 1.2, market: 1.0 },
  NOR: { opta: 0.6, market: 0.5 }, MEX: { opta: 0.9, market: 0.8 },
  CAN: { opta: 0.6, market: 0.5 }, SWE: { opta: 0.8, market: 0.7 }
});

// ─── Configuration (overridable via env vars for CI) ───
// CI_QUICK=1 reduces runs for fast calibration in CI; otherwise full 30K runs per candidate
const QUICK = process.env.CI_QUICK === '1';
const CANDIDATES = [1.15, 1.20, 1.22, 1.25, 1.28, 1.30, 1.32, 1.35, 1.40, 1.45];
const SIMS_PER_RUN = QUICK ? 3000 : 10000;
const SIM_RUNS = QUICK ? 1 : 3; // Quick mode: 3K sims × 1 run; Full: 10K × 3 runs

// ─── Load team data ───
function loadTeams() {
  const metaPath = join(DATA_DIR, 'teams-metadata.json');
  const raw = readFileSync(metaPath, 'utf8');
  const meta = JSON.parse(raw);
  return Object.entries(meta).map(([id, val]) => ({ id, ...val }));
}

// ─── Squad value modifier (mirrors SimulationService.valueMod) ───
function parseValue(value) {
  const raw = String(value || '').replace(/[€\s]/g, '');
  if (raw.endsWith('B')) return parseFloat(raw) * 1000;
  if (raw.endsWith('M')) return parseFloat(raw);
  return parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
}

function valueMod(value) {
  const valM = parseValue(value);
  if (valM <= 0) return 0;
  const mod = (Math.log10(valM) - 2.0) * 14;
  return Math.max(-15, Math.min(15, mod));
}

// ─── Win probability given ELOs ───
function winProb(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

// ─── Simple Poisson goals ───
function sampleGoals(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 15);
  return k - 1;
}

// ─── POISSON WIN/DRAW/LOSS PROBABILITIES (for quick per-match estimation) ───
function poissonProb(k, lam) {
  let p = Math.exp(-lam);
  for (let i = 1; i <= k; i++) p *= lam / i;
  return p;
}

function matchProbs(eloA, eloB, teamA, teamB, base, isKO) {
  const b = isKO ? base * (1.08 / 1.30) : base;
  // Apply squad value modifier (mirrors the simulation service)
  const eA = eloA + valueMod(teamA.value);
  const eB = eloB + valueMod(teamB.value);
  const diff = eA - eB;
  const lA = Math.max(0.1, Math.min(5.5, b * Math.exp(diff / 600)));
  const lB = Math.max(0.1, Math.min(5.5, b * Math.exp(-diff / 600)));

  let pw = 0, pd = 0, pl = 0, norm = 0;
  for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) {
    const p = poissonProb(x, lA) * poissonProb(y, lB);
    norm += p;
    if (x > y) pw += p; else if (x === y) pd += p; else pl += p;
  }
  return { pw: pw / norm, pd: pd / norm, pl: pl / norm };
}

// ─── THIRD PLACE PAIRING (simplified) ───
function pairThirds(winners, thirds) {
  const allowed = {
    A: ['C','E','F','H','I'], B: ['E','F','G','I','J'],
    D: ['B','E','F','I','J'], E: ['A','B','C','D','F'],
    G: ['A','E','H','I','J'], I: ['C','D','F','G','H'],
    K: ['D','E','I','J','L'], L: ['E','H','I','J','K']
  };
  const wks = ['A','B','D','E','G','I','K','L'];
  const bt = (idx, matched) => {
    if (idx === wks.length) return matched;
    const wk = wks[idx];
    for (const tp of thirds) {
      if (!tp) continue;
      if (Object.values(matched).some(m => m?.id === tp.id)) continue;
      if (allowed[wk]?.includes(tp.group) && tp.group !== wk) {
        const next = { ...matched, [wk]: tp };
        const r = bt(idx + 1, next);
        if (r) return r;
      }
    }
    return null;
  };
  let m = bt(0, {});
  if (m) return m;
  // Fallback
  const fb = {};
  const used = new Set();
  for (const wk of wks) {
    for (const tp of thirds) {
      if (!tp || used.has(tp.id)) continue;
      if (tp.group !== wk) { fb[wk] = tp; used.add(tp.id); break; }
    }
    if (!fb[wk]) for (const tp of thirds) {
      if (!tp || used.has(tp.id)) continue;
      fb[wk] = tp; used.add(tp.id); break;
    }
  }
  return fb;
}

// ─── SIMULATE A SINGLE MATCH ───
function simMatch(teamA, teamB, base, liveElo, isKO) {
  // Use squad-value-adjusted ELOs (mirrors the simulation service)
  const { pw, pd, pl } = matchProbs(liveElo[teamA.id], liveElo[teamB.id], teamA, teamB, base, isKO);
  const r = Math.random();
  if (r < pw) return { winner: teamA };
  if (r < pw + pd) return { winner: null, draw: true };
  return { winner: teamB };
}

// ─── RUN TOURNAMENT ───
function runTournament(teams, base) {
  const groups = {};
  teams.forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  });

  const liveElo = {};
  teams.forEach(t => { liveElo[t.id] = t.elo; });

  // Group stage — round robin
  const ts = {};
  teams.forEach(t => { ts[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0 }; });

  for (const gk in groups) {
    const gt = groups[gk];
    for (let i = 0; i < gt.length; i++) {
      for (let j = i + 1; j < gt.length; j++) {
        const tA = gt[i], tB = gt[j];
        const r = simMatch(tA, tB, base, liveElo, false);
        if (r.winner === tA) ts[tA.id].pts += 3;
        else if (r.winner === tB) ts[tB.id].pts += 3;
        else { ts[tA.id].pts += 1; ts[tB.id].pts += 1; }
      }
    }
  }

  // Standings per group
  const gStand = {};
  for (const gk in groups) {
    gStand[gk] = [...groups[gk]].sort((a, b) => {
      if (ts[a.id].pts !== ts[b.id].pts) return ts[b.id].pts - ts[a.id].pts;
      if (ts[a.id].gd !== ts[b.id].gd) return ts[b.id].gd - ts[a.id].gd;
      return liveElo[b.id] - liveElo[a.id];
    });
  }

  // Winners and runners-up
  const wins = {}, runs = {};
  const thirds = [];
  for (const gk in gStand) {
    const list = gStand[gk];
    wins[gk] = list[0];
    runs[gk] = list[1];
    if (list[2]) thirds.push(list[2]);
  }

  // Best 8 third-placed
  thirds.sort((a, b) => {
    if (ts[a.id].pts !== ts[b.id].pts) return ts[b.id].pts - ts[a.id].pts;
    return liveElo[b.id] - liveElo[a.id];
  });
  const best8 = thirds.slice(0, 8);
  const mt = pairThirds(wins, best8);
  const safe = (t) => { if (t) return t; console.warn('Missing team, using fallback'); return teams[0]; };

  // Round of 32
  const r32Pairs = [
    [safe(wins['A']), safe(mt['A'])], [safe(wins['B']), safe(mt['B'])],
    [safe(wins['C']), safe(runs['F'])], [safe(wins['D']), safe(mt['D'])],
    [safe(wins['E']), safe(mt['E'])], [safe(wins['F']), safe(runs['C'])],
    [safe(wins['G']), safe(mt['G'])], [safe(wins['H']), safe(runs['J'])],
    [safe(wins['I']), safe(mt['I'])], [safe(wins['J']), safe(runs['H'])],
    [safe(wins['K']), safe(mt['K'])], [safe(wins['L']), safe(mt['L'])],
    [safe(runs['A']), safe(runs['B'])], [safe(runs['E']), safe(runs['I'])],
    [safe(runs['K']), safe(runs['L'])], [safe(runs['D']), safe(runs['G'])]
  ];

  const playKO = (pairs) => pairs.map(p => {
    const r = simMatch(p[0], p[1], base, liveElo, true);
    return r.winner || (Math.random() < 0.5 ? p[0] : p[1]);
  });

  const w32 = playKO(r32Pairs);

  // Round of 16
  const r16Pairs = [
    [w32[0], w32[12]], [w32[2], w32[13]], [w32[4], w32[14]], [w32[6], w32[15]],
    [w32[1], w32[3]], [w32[5], w32[7]], [w32[8], w32[10]], [w32[9], w32[11]]
  ];
  const w16 = playKO(r16Pairs);

  // Quarter-Finals
  const qfPairs = [[w16[0], w16[1]], [w16[2], w16[3]], [w16[4], w16[5]], [w16[6], w16[7]]];
  const wqf = playKO(qfPairs);

  // Semi-Finals
  const sfPairs = [[wqf[0], wqf[1]], [wqf[2], wqf[3]]];
  const wsf = playKO(sfPairs);

  // Final
  const finalResult = simMatch(wsf[0], wsf[1], base, liveElo, true);
  return finalResult.winner || (Math.random() < 0.5 ? wsf[0] : wsf[1]);
}

// ─── MEAN SQUARED ERROR ───
function mse(simulated, target) {
  let sum = 0, count = 0;
  for (const id in target) {
    if (simulated[id] !== undefined) {
      const diff = simulated[id] - target[id];
      sum += diff * diff;
      count++;
    }
  }
  return count > 0 ? sum / count : Infinity;
}

// ─── MAIN ───
const teams = loadTeams();
console.log(`Loaded ${teams.length} teams`);
console.log(`Testing ${CANDIDATES.length} BASE values across ${SIM_RUNS} runs of ${SIMS_PER_RUN} sims each\n`);

const results = [];

for (const base of CANDIDATES) {
  const allCounts = {};

  for (let run = 0; run < SIM_RUNS; run++) {
    const counts = {};
    teams.forEach(t => { counts[t.id] = 0; });

    for (let s = 0; s < SIMS_PER_RUN; s++) {
      const winner = runTournament(teams, base);
      if (winner) counts[winner.id]++;
    }

    for (const id in counts) {
      allCounts[id] = (allCounts[id] || 0) + counts[id];
    }
  }

  const total = SIMS_PER_RUN * SIM_RUNS;
  const simPcts = {};
  for (const id in allCounts) {
    simPcts[id] = (allCounts[id] / total) * 100;
  }

  // MSE against market odds
  const marketTargets = {};
  for (const id in BENCH) {
    marketTargets[id] = BENCH[id].market;
  }
  const err = mse(simPcts, marketTargets);

  // Also show top-5 comparison
  const sorted = Object.entries(simPcts).sort((a, b) => b[1] - a[1]);
  const top5 = sorted.slice(0, 5).map(([id, pct]) => {
    const mkt = BENCH[id]?.market;
    return `${id}: ${pct.toFixed(1)}%${mkt !== undefined ? ` (market: ${mkt}%)` : ''}`;
  });

  results.push({ base, mse: err, top5 });
  console.log(`BASE=${base.toFixed(2)} | MSE: ${err.toFixed(4)} | Top 5: ${top5.join(', ')}`);
}

// Best result
results.sort((a, b) => a.mse - b.mse);
const best = results[0];
const second = results[1];

console.log(`\n══════════════════════════════════════════`);
console.log(` BEST FIT: BASE = ${best.base.toFixed(2)} (MSE: ${best.mse.toFixed(4)})`);
console.log(` 2nd:      BASE = ${second.base.toFixed(2)} (MSE: ${second.mse.toFixed(4)})`);
console.log(` Current:  BASE = 1.35 (MSE: ${results.find(r => r.base === 1.35)?.mse.toFixed(4)})`);
console.log(`══════════════════════════════════════════`);
console.log(`\nTop 5 at optimal BASE=${best.base}:\n${best.top5.map((t, i) => `  ${i+1}. ${t}`).join('\n')}`);

// Save results
const outPath = join(__dirname, '..', 'data', 'lambda-calibration.json');
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nFull results saved to data/lambda-calibration.json`);
