/**
 * Lambda Calibration Script (v2 — Attack/Defense Split + DC Correction)
 *
 * Runs tournament simulations at multiple BASE lambda values using the full
 * Dixon-Coles corrected Poisson model with separate attack/defense ratings,
 * then compares champion probabilities against betting market odds to find
 * the best-fit BASE value.
 *
 * Usage: node scripts/calibrate-lambda.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// ─── Market odds (bench table from SimulationService) ───
// ─── Market odds (bench table from SimulationService — June 2026) ───
const BENCH = Object.freeze({
  FRA: { opta: 19.2, market: 20.8 }, ESP: { opta: 14.8, market: 15.4 },
  ENG: { opta: 12.1, market: 12.5 }, POR: { opta: 10.5, market: 11.1 },
  ARG: { opta: 10.1, market: 10.5 }, BRA: { opta: 8.0, market: 8.3 },
  GER: { opta: 6.8, market: 7.1 }, NED: { opta: 5.6, market: 5.9 },
  BEL: { opta: 3.2, market: 3.0 }, URU: { opta: 4.0, market: 4.2 },
  CRO: { opta: 2.4, market: 2.2 }, MAR: { opta: 3.0, market: 2.8 },
  COL: { opta: 3.5, market: 3.8 }, USA: { opta: 2.0, market: 1.8 },
  JPN: { opta: 1.4, market: 1.2 }, SWE: { opta: 1.0, market: 0.9 },
  MEX: { opta: 1.2, market: 1.0 }, SUI: { opta: 1.3, market: 1.4 },
  NOR: { opta: 0.8, market: 0.6 }, CAN: { opta: 0.7, market: 0.5 }
});

// ─── Configuration ───
const QUICK = process.env.CI_QUICK === '1';
const CANDIDATES = [1.15, 1.20, 1.22, 1.25, 1.28, 1.30, 1.32, 1.35, 1.40, 1.45];
const SIMS_PER_RUN = QUICK ? 3000 : 10000;
const SIM_RUNS = QUICK ? 1 : 3;

// ─── Load team data ───
function loadTeams() {
  const metaPath = join(DATA_DIR, 'teams-metadata.json');
  const raw = readFileSync(metaPath, 'utf8');
  const meta = JSON.parse(raw);
  return Object.entries(meta).map(([id, val]) => ({ id, ...val }));
}

// ─── Squad value helpers (mirrors SimulationService) ───
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

// ─── Tournament history (mirrors SimulationService.tournamentHistory) ───
const TOURNAMENT_HISTORY = {
  ARG: { stage2022: 'champion', stage2018: 'round16' },
  FRA: { stage2022: 'runnerUp', stage2018: 'champion' },
  CRO: { stage2022: 'semiFinal', stage2018: 'runnerUp' },
  MAR: { stage2022: 'semiFinal', stage2018: '' },
  NED: { stage2022: 'quarterFinal', stage2018: 'round16' },
  ENG: { stage2022: 'quarterFinal', stage2018: 'semiFinal' },
  BRA: { stage2022: 'quarterFinal', stage2018: 'quarterFinal' },
  POR: { stage2022: 'quarterFinal', stage2018: 'round16' },
  USA: { stage2022: 'round16', stage2018: '' },
  AUS: { stage2022: 'round16', stage2018: '' },
  JPN: { stage2022: 'round16', stage2018: 'round16' },
  KOR: { stage2022: 'round16', stage2018: '' },
  SEN: { stage2022: 'round16', stage2018: '' },
  ESP: { stage2022: 'round16', stage2018: 'round16' },
  SUI: { stage2022: 'round16', stage2018: 'round16' },
  BEL: { stage2022: '', stage2018: 'semiFinal' },
  URU: { stage2022: '', stage2018: 'quarterFinal' },
  SWE: { stage2022: '', stage2018: 'quarterFinal' },
  COL: { stage2022: '', stage2018: 'round16' },
  MEX: { stage2022: '', stage2018: 'round16' },
};

function tournamentMod(id) {
  const hist = TOURNAMENT_HISTORY[id];
  if (!hist) return 0;
  const stageBonus = { champion: 15, runnerUp: 10, semiFinal: 7, quarterFinal: 5, round16: 3 };
  return (stageBonus[hist.stage2022] || 0) * 1.0 + (stageBonus[hist.stage2018] || 0) * 0.5;
}

// ─── Attack/Defense split (mirrors SimulationService.getAttDefElo) ───
function getAttDefElo(team, effectiveElo) {
  const logVal = Math.log10(Math.max(1, parseValue(team.value)));
  const valueNorm = Math.max(-1, Math.min(1, (logVal - 2.0) / 1.1));
  const rankNorm = Math.max(-1, Math.min(1, 1 - (team.fifaRank - 1) / 50));
  const MAX_SPREAD = 45;
  const spread = (valueNorm - rankNorm) / 2 * MAX_SPREAD;
  return { att: effectiveElo + spread, def: effectiveElo - spread };
}

// ─── Poisson probability ───
function poissonProb(k, lam) {
  let p = Math.exp(-lam);
  for (let i = 1; i <= k; i++) p *= lam / i;
  return p;
}

// ─── Poisson sampler ───
function sampleGoals(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 15);
  return k - 1;
}

// ─── Dixon-Coles correlation ───
function dcRho(la, lb) {
  const gap = Math.abs(la - lb);
  if (gap < 0.3) return -0.13;
  if (gap < 0.6) return -0.09;
  return -0.05;
}

function dcCorr(x, y, la, lb, rho) {
  if (x === 0 && y === 0) return 1 - la * lb * rho;
  if (x === 0 && y === 1) return 1 + la * rho;
  if (x === 1 && y === 0) return 1 + lb * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

// ─── Expected goals for a matchup (EXACT mirror of SimulationService.xGoals) ───
function xGoals(tA, tB, base, isKO) {
  const BASE = isKO ? base * (1.08 / 1.30) : base;
  const HOST = 75;
  let eA = tA.elo;
  let eB = tB.elo;

  if (tA.host && !tB.host) eA += HOST;
  if (tB.host && !tA.host) eB += HOST;
  if (tA.climate === 'cold' || tA.climate === 'temperate') eA -= 15;
  if (tB.climate === 'cold' || tB.climate === 'temperate') eB -= 15;

  // Tournament pedigree bonus (matches service)
  eA += tournamentMod(tA.id);
  eB += tournamentMod(tB.id);

  // Small residual flat value boost (matches service — 35% of valueMod)
  eA += valueMod(tA.value) * 0.35;
  eB += valueMod(tB.value) * 0.35;

  // Split into attack/defense
  const { att: attA, def: defA } = getAttDefElo(tA, eA);
  const { att: attB, def: defB } = getAttDefElo(tB, eB);

  let lA = BASE * Math.exp((attA - defB) / 600);
  let lB = BASE * Math.exp((attB - defA) / 600);

  // Convergence uses base ELO diff (same as service)
  const diff = eA - eB;
  if (Math.abs(diff) < 80) {
    const c = (1 - Math.abs(diff) / 80) * 0.12;
    const avg = (lA + lB) / 2;
    lA = lA * (1 - c) + avg * c;
    lB = lB * (1 - c) + avg * c;
  }

  return {
    lA: Math.max(0.1, Math.min(5.5, lA)),
    lB: Math.max(0.1, Math.min(5.5, lB))
  };
}

// ─── Simulate a single match using DC-corrected Poisson matrix ───
function simMatch(tA, tB, base, liveElo, isKO) {
  const { lA, lB } = xGoals(
    { ...tA, elo: liveElo[tA.id] },
    { ...tB, elo: liveElo[tB.id] },
    base, isKO
  );

  const rho = dcRho(lA, lB);
  const dcMatrix = [];
  let norm = 0;
  for (let a = 0; a <= 8; a++) {
    dcMatrix[a] = [];
    for (let b = 0; b <= 8; b++) {
      const raw = poissonProb(a, lA) * poissonProb(b, lB) * dcCorr(a, b, lA, lB, rho);
      dcMatrix[a][b] = Math.max(0, raw);
      norm += dcMatrix[a][b];
    }
  }

  let r = Math.random() * norm, gA = 0, gB = 0;
  outer: for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) {
    r -= dcMatrix[a][b];
    if (r <= 0) { gA = a; gB = b; break outer; }
  }

  if (isKO && gA !== gB) {
    const bonus = sampleGoals(0.25);
    if (gA < gB) gA += bonus;
    else gB += bonus;
  }

  // Update live ELO
  const expA = 1 / (1 + Math.pow(10, (liveElo[tB.id] - liveElo[tA.id]) / 400));
  const actA = gA > gB ? 1 : gA === gB ? 0.5 : 0;
  const k = isKO ? 60 : 40;
  const dA = k * (actA - expA);
  liveElo[tA.id] += dA;
  liveElo[tB.id] -= dA;

  if (gA > gB) return { winner: tA };
  if (gB > gA) return { winner: tB };
  // Draw in KO → extra time / pens
  if (isKO) {
    const etA = sampleGoals(lA * 0.38);
    const etB = sampleGoals(lB * 0.38);
    gA += etA; gB += etB;
    if (gA !== gB) return { winner: gA > gB ? tA : tB };
    // Penalties
    const pA = tA.penRate || 0.75;
    const pB = tB.penRate || 0.75;
    let sA = 0, sB = 0;
    while (sA === sB) {
      if (Math.random() < pA) sA++;
      if (Math.random() < pB) sB++;
    }
    return { winner: sA > sB ? tA : tB };
  }
  return { winner: null, draw: true };
}

// ─── THIRD PLACE PAIRING ───
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

// ─── RUN TOURNAMENT ───
function runTournament(teams, base) {
  const groups = {};
  teams.forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  });

  const liveElo = {};
  teams.forEach(t => { liveElo[t.id] = t.elo; });

  const ts = {};
  teams.forEach(t => { ts[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0 }; });

  // Group stage — round robin
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
  const safe = (t) => t || teams[0];

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
console.log(`Testing ${CANDIDATES.length} BASE values across ${SIM_RUNS} runs of ${SIMS_PER_RUN} sims each`);
console.log(`Model: Attack/Defense split + Dixon-Coles DC-correction\n`);

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

  // Top-5 comparison
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
