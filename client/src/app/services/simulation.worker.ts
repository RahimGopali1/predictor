/// <reference lib="webworker" />

import { Team, RecentMatch, MatchResult, BracketData } from '../models/team.model';

// ── Constants ──

const tournamentHistory: Record<string, { stage2022: string; stage2018: string }> = {
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

const BASE_LAMBDA = 1.28;

// ── Helper Functions ──

function parseValue(value: string): number {
  const raw = value.replace(/[€\s]/g, '');
  if (raw.endsWith('B')) return parseFloat(raw) * 1000;
  if (raw.endsWith('M')) return parseFloat(raw);
  return parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
}

function valueMod(value: string): number {
  const valM = parseValue(value);
  if (valM <= 0) return 0;
  const mod = (Math.log10(valM) - 2.0) * 14;
  return Math.max(-15, Math.min(15, mod));
}

function tournamentMod(id: string): number {
  const hist = tournamentHistory[id];
  if (!hist) return 0;
  const stageBonus: Record<string, number> = {
    champion: 15, runnerUp: 10, semiFinal: 7, quarterFinal: 5, round16: 3,
  };
  const bonus2022 = stageBonus[hist.stage2022] || 0;
  const bonus2018 = stageBonus[hist.stage2018] || 0;
  return bonus2022 * 1.0 + bonus2018 * 0.5;
}

function formMod(id: string, recent: RecentMatch[]): number {
  let ws = 0, tw = 0;
  for (const m of recent) {
    let gd = 0;
    if (m.home === id) gd = m.sH - m.sA;
    else if (m.away === id) gd = m.sA - m.sH;
    else continue;
    const r = Math.max(-1, Math.min(1, gd * 0.33));
    const w = (m.k / 60) * m.rec;
    ws += r * w;
    tw += w;
  }
  if (!tw) return 0;
  return Math.max(-25, Math.min(25, (ws / tw) * 25));
}

function getAttDefElo(team: Team, effectiveElo: number): { att: number; def: number } {
  const logVal = Math.log10(Math.max(1, parseValue(team.value)));
  const valueNorm = Math.max(-1, Math.min(1, (logVal - 2.0) / 1.1));
  const rankNorm = Math.max(-1, Math.min(1, 1 - (team.fifaRank - 1) / 50));
  const MAX_SPREAD = 45;
  const spread = (valueNorm - rankNorm) / 2 * MAX_SPREAD;
  return { att: effectiveElo + spread, def: effectiveElo - spread };
}

function xGoals(tA: Team, tB: Team, recent: RecentMatch[], eloOvr: Record<string, number> = {}, isKO = false, restA = 4, restB = 4) {
  const BASE = isKO ? BASE_LAMBDA * (1.08 / 1.30) : BASE_LAMBDA;
  const HOST = 75;
  let eA = (eloOvr[tA.id] ?? tA.elo) + formMod(tA.id, recent);
  let eB = (eloOvr[tB.id] ?? tB.elo) + formMod(tB.id, recent);
  if (restA > restB) eA += Math.min(24, (restA - restB) * 8);
  else if (restB > restA) eB += Math.min(24, (restB - restA) * 8);
  if (tA.host && !tB.host) eA += HOST;
  if (tB.host && !tA.host) eB += HOST;
  if (tA.climate === 'cold' || tA.climate === 'temperate') eA -= 15;
  if (tB.climate === 'cold' || tB.climate === 'temperate') eB -= 15;
  eA += tournamentMod(tA.id);
  eB += tournamentMod(tB.id);
  eA += valueMod(tA.value) * 0.35;
  eB += valueMod(tB.value) * 0.35;
  const { att: attA, def: defA } = getAttDefElo(tA, eA);
  const { att: attB, def: defB } = getAttDefElo(tB, eB);
  let lA = BASE * Math.exp((attA - defB) / 600);
  let lB = BASE * Math.exp((attB - defA) / 600);
  const diff = eA - eB;
  if (Math.abs(diff) < 80) {
    const c = (1 - Math.abs(diff) / 80) * 0.12;
    const avg = (lA + lB) / 2;
    lA = lA * (1 - c) + avg * c;
    lB = lB * (1 - c) + avg * c;
  }
  return { lA: Math.max(0.1, Math.min(5.5, lA)), lB: Math.max(0.1, Math.min(5.5, lB)) };
}

function dcRho(la: number, lb: number): number {
  const gap = Math.abs(la - lb);
  if (gap < 0.3) return -0.13;
  if (gap < 0.6) return -0.09;
  return -0.05;
}

function dcCorr(x: number, y: number, la: number, lb: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - la * lb * rho;
  if (x === 0 && y === 1) return 1 + la * rho;
  if (x === 1 && y === 0) return 1 + lb * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

function poissonProb(k: number, lam: number): number {
  let p = Math.exp(-lam);
  for (let i = 1; i <= k; i++) p *= lam / i;
  return p;
}

function poissonGoals(lam: number): number {
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 15);
  return k - 1;
}

function simMatch(tA: Team, tB: Team, recent: RecentMatch[], isKO = false, eloOvr: Record<string, number> = {}, restA = 4, restB = 4): MatchResult {
  const { lA, lB } = xGoals(tA, tB, recent, eloOvr, isKO, restA, restB);
  const rho = dcRho(lA, lB);
  const dcMatrix: number[][] = [];
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
    const bonusGoals = poissonGoals(0.25);
    if (gA < gB) gA += bonusGoals;
    else gB += bonusGoals;
  }
  const res: MatchResult = { tA, tB, sA: gA, sB: gB, et: false, pens: false, pA: 0, pB: 0, winner: null };
  if (gA > gB) res.winner = tA;
  else if (gB > gA) res.winner = tB;
  else if (isKO) {
    res.et = true;
    const etA = poissonGoals(lA * 0.38), etB = poissonGoals(lB * 0.38);
    res.sA += etA; res.sB += etB;
    if (res.sA > res.sB) res.winner = tA;
    else if (res.sB > res.sA) res.winner = tB;
    else {
      res.pens = true;
      const ps = simPens(tA, tB);
      res.pA = ps.sA; res.pB = ps.sB; res.winner = ps.winner;
    }
  }
  return res;
}

function simPens(tA: Team, tB: Team) {
  const pA = tA.penRate || 0.75;
  const pB = tB.penRate || 0.75;
  let sA = 0, sB = 0, k = 0;
  while (k < 5) {
    if (Math.random() < pA) sA++;
    if (Math.random() < pB) sB++;
    k++;
    const rem = 5 - k;
    if (sA - sB > rem || sB - sA > rem) break;
  }
  while (sA === sB) {
    if (Math.random() < pA) sA++;
    if (Math.random() < pB) sB++;
  }
  return { sA, sB, winner: sA > sB ? tA : tB };
}

function updateElo(eA: number, eB: number, sA: number, sB: number, k = 32) {
  const exp = 1 / (1 + Math.pow(10, (eB - eA) / 400));
  const act = sA > sB ? 1 : sA === sB ? 0.5 : 0;
  const d = k * (act - exp);
  return { nA: eA + d, nB: eB - d };
}

function pairThirds(winners: Record<string, Team>, thirds: Team[]): Record<string, Team> {
  const allowed: Record<string, string[]> = {
    A: ['C', 'E', 'F', 'H', 'I'], B: ['E', 'F', 'G', 'I', 'J'],
    D: ['B', 'E', 'F', 'I', 'J'], E: ['A', 'B', 'C', 'D', 'F'],
    G: ['A', 'E', 'H', 'I', 'J'], I: ['C', 'D', 'F', 'G', 'H'],
    K: ['D', 'E', 'I', 'J', 'L'], L: ['E', 'H', 'I', 'J', 'K']
  };
  const wks = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'];
  const matched: Record<string, Team> = {};
  const bt = (idx: number): boolean => {
    if (idx === wks.length) return true;
    const wk = wks[idx];
    for (const tp of thirds) {
      if (!tp) continue;
      if (Object.values(matched).some(m => m?.id === tp.id)) continue;
      if (allowed[wk]?.includes(tp.group) && tp.group !== wk) {
        matched[wk] = tp;
        if (bt(idx + 1)) return true;
        delete matched[wk];
      }
    }
    return false;
  };
  if (bt(0)) return matched;
  const fb: Record<string, Team> = {};
  const used = new Set<string>();
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

function runTournament(teams: Team[], recent: RecentMatch[]) {
  const groups: Record<string, Team[]> = {};
  teams.forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  });
  const stage: Record<string, number> = {};
  const ts: Record<string, { pts: number; gf: number; ga: number; gd: number }> = {};
  const liveElo: Record<string, number> = {};
  const lastMatchDay: Record<string, number> = {};
  teams.forEach(t => { 
    stage[t.id] = 0; 
    ts[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0 }; 
    liveElo[t.id] = t.elo;
    lastMatchDay[t.id] = 0;
  });

  const gStand: Record<string, Team[]> = {};
  for (const gk in groups) {
    const gt = groups[gk];
    gt.forEach(t => { ts[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0 }; });
    for (let i = 0; i < gt.length; i++) for (let j = i + 1; j < gt.length; j++) {
      const tA = gt[i], tB = gt[j];
      const currentMatchDay = (ts[tA.id].pts === 0 && ts[tA.id].gf === 0) ? 1 : 
                              (ts[tA.id].pts <= 3) ? 5 : 9;
      const restA = lastMatchDay[tA.id] === 0 ? 4 : currentMatchDay - lastMatchDay[tA.id];
      const restB = lastMatchDay[tB.id] === 0 ? 4 : currentMatchDay - lastMatchDay[tB.id];
      const r = simMatch(tA, tB, recent, false, liveElo, restA, restB);
      lastMatchDay[tA.id] = currentMatchDay;
      lastMatchDay[tB.id] = currentMatchDay;
      ts[tA.id].gf += r.sA; ts[tA.id].ga += r.sB; ts[tA.id].gd += r.sA - r.sB;
      ts[tB.id].gf += r.sB; ts[tB.id].ga += r.sA; ts[tB.id].gd += r.sB - r.sA;
      if (r.sA > r.sB) ts[tA.id].pts += 3;
      else if (r.sB > r.sA) ts[tB.id].pts += 3;
      else { ts[tA.id].pts += 1; ts[tB.id].pts += 1; }
      const { nA, nB } = updateElo(liveElo[tA.id], liveElo[tB.id], r.sA, r.sB, 40);
      liveElo[tA.id] = nA; liveElo[tB.id] = nB;
    }
    gStand[gk] = [...gt].sort((a, b) => {
      const sa = ts[a.id], sb = ts[b.id];
      if (sa.pts !== sb.pts) return sb.pts - sa.pts;
      if (sa.gd !== sb.gd) return sb.gd - sa.gd;
      if (sa.gf !== sb.gf) return sb.gf - sa.gf;
      return liveElo[b.id] - liveElo[a.id];
    });
  }

  const wins: Record<string, Team> = {}, runs: Record<string, Team> = {};
  const thirds: Team[] = [];
  for (const gk in gStand) {
    const list = gStand[gk];
    wins[gk] = list[0]; runs[gk] = list[1];
    if (list[2]) thirds.push(list[2]);
    stage[list[0].id] = 1; stage[list[1].id] = 1;
  }
  thirds.sort((a, b) => {
    const sa = ts[a.id], sb = ts[b.id];
    if (sa.pts !== sb.pts) return sb.pts - sa.pts;
    if (sa.gd !== sb.gd) return sb.gd - sa.gd;
    return liveElo[b.id] - liveElo[a.id];
  });
  const best8 = thirds.slice(0, 8);
  best8.forEach(t => { stage[t.id] = 1; });
  const mt = pairThirds(wins, best8);
  const safe = (t: Team | undefined) => t || teams[0];

  const r32: [Team, Team, string][] = [
    [safe(wins['A']), safe(mt['A']), 'R32-1'], [safe(wins['B']), safe(mt['B']), 'R32-2'],
    [safe(wins['C']), safe(runs['F']), 'R32-3'], [safe(wins['D']), safe(mt['D']), 'R32-4'],
    [safe(wins['E']), safe(mt['E']), 'R32-5'], [safe(wins['F']), safe(runs['C']), 'R32-6'],
    [safe(wins['G']), safe(mt['G']), 'R32-7'], [safe(wins['H']), safe(runs['J']), 'R32-8'],
    [safe(wins['I']), safe(mt['I']), 'R32-9'], [safe(wins['J']), safe(runs['H']), 'R32-10'],
    [safe(wins['K']), safe(mt['K']), 'R32-11'], [safe(wins['L']), safe(mt['L']), 'R32-12'],
    [safe(runs['A']), safe(runs['B']), 'R32-13'], [safe(runs['E']), safe(runs['I']), 'R32-14'],
    [safe(runs['K']), safe(runs['L']), 'R32-15'], [safe(runs['D']), safe(runs['G']), 'R32-16']
  ];

  const playRound = (matches: [Team, Team, string][], stageNum: number, day: number) => {
    const winners: Team[] = [], details: MatchResult[] = [];
    matches.forEach(m => {
      const restA = day - lastMatchDay[m[0].id];
      const restB = day - lastMatchDay[m[1].id];
      const r = simMatch(m[0], m[1], recent, true, liveElo, restA, restB);
      winners.push(r.winner!);
      details.push(r);
      stage[r.winner!.id] = stageNum;
      lastMatchDay[m[0].id] = day;
      lastMatchDay[m[1].id] = day;
      const { nA, nB } = updateElo(liveElo[m[0].id], liveElo[m[1].id], r.sA, r.sB, 60);
      liveElo[m[0].id] = nA; liveElo[m[1].id] = nB;
    });
    return { winners, details };
  };

  const ro32 = playRound(r32, 2, 14);
  const w32 = ro32.winners;
  const r16: [Team, Team, string][] = [
    [w32[0], w32[12], 'R16-1'], [w32[2], w32[13], 'R16-2'], [w32[4], w32[14], 'R16-3'], [w32[6], w32[15], 'R16-4'],
    [w32[1], w32[3], 'R16-5'], [w32[5], w32[7], 'R16-6'], [w32[8], w32[10], 'R16-7'], [w32[9], w32[11], 'R16-8']
  ];
  const ro16 = playRound(r16, 3, 18);
  const w16 = ro16.winners;
  const qf: [Team, Team, string][] = [[w16[0], w16[1], 'QF-1'], [w16[2], w16[3], 'QF-2'], [w16[4], w16[5], 'QF-3'], [w16[6], w16[7], 'QF-4']];
  const roqf = playRound(qf, 4, 22);
  const wqf = roqf.winners;
  const sf: [Team, Team, string][] = [[wqf[0], wqf[1], 'SF-1'], [wqf[2], wqf[3], 'SF-2']];
  const rosf = playRound(sf, 5, 26);
  const wsf = rosf.winners;
  const finalDay = 30;
  const restFinA = finalDay - lastMatchDay[wsf[0].id];
  const restFinB = finalDay - lastMatchDay[wsf[1].id];
  const fin = simMatch(wsf[0], wsf[1], recent, true, liveElo, restFinA, restFinB);
  stage[fin.winner!.id] = 6;

  return {
    stage,
    champion: fin.winner!,
    bracket: { r32: ro32.details, r16: ro16.details, qf: roqf.details, sf: rosf.details, final: fin } as BracketData
  };
}

// ── Worker Message Handler ──

self.onmessage = (e: MessageEvent<{
  type: string;
  teams: Team[];
  recentMatches: RecentMatch[];
  TOTAL: number;
  BATCH: number;
}>) => {
  const { teams, recentMatches, TOTAL, BATCH } = e.data;

  // Initialize results storage
  const simRes: Record<string, { r32: number; r16: number; qf: number; sf: number; fin: number; champ: number }> = {};
  teams.forEach(t => {
    simRes[t.id] = { r32: 0, r16: 0, qf: 0, sf: 0, fin: 0, champ: 0 };
  });

  const bracketCounts: Record<string, number> = {};
  let modalBracket: BracketData | null = null;
  let modalBracketChanged = false;
  let simsRun = 0;

  // Find leader helper
  const findLeader = () => {
    const sorted = Object.entries(simRes).sort(([, a], [, b]) => b.champ - a.champ);
    return sorted[0] ? { id: sorted[0][0], pct: (sorted[0][1].champ / Math.max(1, simsRun)) * 100 } : { id: '', pct: 0 };
  };

  const runBatch = () => {
    for (let b = 0; b < BATCH && simsRun < TOTAL; b++) {
      const r = runTournament(teams, recentMatches);
      simsRun++;
      const cId = r.champion.id;
      bracketCounts[cId] = (bracketCounts[cId] || 0) + 1;
      const topId = Object.keys(bracketCounts).reduce(
        (a, k) => (bracketCounts[a] > bracketCounts[k] ? a : k),
        cId,
      );
      if (!modalBracket || bracketCounts[cId] > (bracketCounts[topId] || 0)) {
        modalBracket = r.bracket;
        modalBracketChanged = true;
      }
      for (const id in r.stage) {
        const v = r.stage[id];
        const tgt = simRes[id];
        if (!tgt) continue;
        if (v >= 1) tgt.r32++;
        if (v >= 2) tgt.r16++;
        if (v >= 3) tgt.qf++;
        if (v >= 4) tgt.sf++;
        if (v >= 5) tgt.fin++;
        if (v >= 6) tgt.champ++;
      }
    }

    const leader = findLeader();

    // Post progress back to main thread (only send modal bracket when it changed)
    self.postMessage({
      type: 'PROGRESS',
      simsRun,
      simRes,
      bracketCounts,
      modalBracket: modalBracketChanged ? modalBracket : null,
      modalBracketChanged,
      leaderId: leader.id,
      leaderPct: leader.pct,
    });
    modalBracketChanged = false;

    if (simsRun < TOTAL) {
      setTimeout(runBatch, 0); // yield to event loop every batch
    } else {
      self.postMessage({ type: 'DONE' });
    }
  };

  runBatch();
};
