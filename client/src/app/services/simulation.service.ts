import { Injectable, inject } from '@angular/core';
import { BracketData, MatchResult, RecentMatch, SimResult, Team } from '../models/team.model';
import { TeamService } from './team.service';

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private readonly teamService = inject(TeamService);

  readonly TOTAL = 50000;
  readonly BATCH = 500;

  /**
   * Base lambda for expected goals calculation.
   * Calibrated against betting market odds via scripts/calibrate-lambda.mjs.
   * Higher values = more goals scored across the tournament.
   * Current calibrated value: 1.35 (was 1.30 before calibration).
   */
  readonly BASE_LAMBDA = 1.35;

  readonly bench: Record<string, { opta: number; market: number }> = {
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
  };

  /**
   * Parse squad value string (e.g. "€750M", "€1.2B") into millions.
   */
  parseValue(value: string): number {
    const raw = value.replace(/[€\s]/g, '');
    if (raw.endsWith('B')) {
      return parseFloat(raw) * 1000;
    }
    if (raw.endsWith('M')) {
      return parseFloat(raw);
    }
    // Fallback: strip trailing K or plain number
    return parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
  }

  /**
   * Squad value modifier: converts market value to ELO adjustment.
   * Uses a log scale so the gap between low-value and high-value teams
   * is meaningful but not dominant over existing ELO ratings.
   * Range: approximately -15 to +15 ELO.
   */
  valueMod(value: string): number {
    const valM = this.parseValue(value);
    if (valM <= 0) return 0;
    // log10(200M) ≈ 2.3, log10(1.2B) ≈ 3.08, log10(8M) ≈ 0.9
    const mod = (Math.log10(valM) - 2.0) * 14;
    return Math.max(-15, Math.min(15, mod));
  }

  /**
   * Recent form modifier: computes an ELO adjustment based on recent matches.
   * Uses goal difference weighting so dominant wins (3-0) count more than
   * narrow wins (1-0), and heavy losses penalize more.
   * GD is scaled by 0.33 and capped at ±1 to produce a smooth curve.
   * Range: -25 to +25 ELO.
   */
  formMod(id: string, recent: RecentMatch[]): number {
    let ws = 0, tw = 0;
    for (const m of recent) {
      let gd = 0;
      if (m.home === id) gd = m.sH - m.sA;
      else if (m.away === id) gd = m.sA - m.sH;
      else continue;
      // Scale goal difference: -1..+1 range with diminishing returns beyond GD±3
      const r = Math.max(-1, Math.min(1, gd * 0.33));
      const w = (m.k / 60) * m.rec;
      ws += r * w;
      tw += w;
    }
    if (!tw) return 0;
    return Math.max(-25, Math.min(25, (ws / tw) * 25));
  }

  xGoals(tA: Team, tB: Team, recent: RecentMatch[], eloOvr: Record<string, number> = {}, isKO = false, restA = 4, restB = 4) {
    const BASE = isKO ? this.BASE_LAMBDA * (1.08 / 1.30) : this.BASE_LAMBDA;
    const HOST = 75;
    let eA = (eloOvr[tA.id] ?? tA.elo) + this.formMod(tA.id, recent);
    let eB = (eloOvr[tB.id] ?? tB.elo) + this.formMod(tB.id, recent);

    // Apply Rest Days Modifier: +8 Elo per extra day of rest, max +24
    if (restA > restB) eA += Math.min(24, (restA - restB) * 8);
    else if (restB > restA) eB += Math.min(24, (restB - restA) * 8);

    if (tA.host && !tB.host) eA += HOST;
    if (tB.host && !tA.host) eB += HOST;
    if (tA.climate === 'cold' || tA.climate === 'temperate') eA -= 15;
    if (tB.climate === 'cold' || tB.climate === 'temperate') eB -= 15;

    // Squad market value adjustment: high-value squads get a small ELO boost
    eA += this.valueMod(tA.value);
    eB += this.valueMod(tB.value);
    const diff = eA - eB;
    let lA = BASE * Math.exp(diff / 600);
    let lB = BASE * Math.exp(-diff / 600);
    const gap = Math.abs(diff);
    if (gap < 80) {
      const c = (1 - gap / 80) * 0.12;
      const avg = (lA + lB) / 2;
      lA = lA * (1 - c) + avg * c;
      lB = lB * (1 - c) + avg * c;
    }
    return { lA: Math.max(0.1, Math.min(5.5, lA)), lB: Math.max(0.1, Math.min(5.5, lB)) };
  }

  dcRho(la: number, lb: number): number {
    const gap = Math.abs(la - lb);
    if (gap < 0.3) return -0.13;
    if (gap < 0.6) return -0.09;
    return -0.05;
  }

  dcCorr(x: number, y: number, la: number, lb: number, rho: number): number {
    if (x === 0 && y === 0) return 1 - la * lb * rho;
    if (x === 0 && y === 1) return 1 + la * rho;
    if (x === 1 && y === 0) return 1 + lb * rho;
    if (x === 1 && y === 1) return 1 - rho;
    return 1;
  }

  poissonProb(k: number, lam: number): number {
    let p = Math.exp(-lam);
    for (let i = 1; i <= k; i++) p *= lam / i;
    return p;
  }

  poissonGoals(lam: number): number {
    const L = Math.exp(-lam);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L && k < 15);
    return k - 1;
  }

  simMatch(tA: Team, tB: Team, recent: RecentMatch[], isKO = false, eloOvr: Record<string, number> = {}, restA = 4, restB = 4): MatchResult {
    const { lA, lB } = this.xGoals(tA, tB, recent, eloOvr, isKO, restA, restB);
    const rho = this.dcRho(lA, lB);
    const dcMatrix: number[][] = [];
    let norm = 0;
    for (let a = 0; a <= 8; a++) {
      dcMatrix[a] = [];
      for (let b = 0; b <= 8; b++) {
        const raw = this.poissonProb(a, lA) * this.poissonProb(b, lB) * this.dcCorr(a, b, lA, lB, rho);
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
      const bonusGoals = this.poissonGoals(0.25);
      if (gA < gB) gA += bonusGoals;
      else gB += bonusGoals;
    }
    const res: MatchResult = { tA, tB, sA: gA, sB: gB, et: false, pens: false, pA: 0, pB: 0, winner: null };
    if (gA > gB) res.winner = tA;
    else if (gB > gA) res.winner = tB;
    else if (isKO) {
      res.et = true;
      const etA = this.poissonGoals(lA * 0.38), etB = this.poissonGoals(lB * 0.38);
      res.sA += etA; res.sB += etB;
      if (res.sA > res.sB) res.winner = tA;
      else if (res.sB > res.sA) res.winner = tB;
      else {
        res.pens = true;
        const ps = this.simPens(tA, tB);
        res.pA = ps.sA; res.pB = ps.sB; res.winner = ps.winner;
      }
    }
    return res;
  }

  simPens(tA: Team, tB: Team) {
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

  updateElo(eA: number, eB: number, sA: number, sB: number, k = 32) {
    const exp = 1 / (1 + Math.pow(10, (eB - eA) / 400));
    const act = sA > sB ? 1 : sA === sB ? 0.5 : 0;
    const d = k * (act - exp);
    return { nA: eA + d, nB: eB - d };
  }

  pairThirds(winners: Record<string, Team>, thirds: Team[]): Record<string, Team> {
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

  runTournament(teams: Team[], recent: RecentMatch[]) {
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
      lastMatchDay[t.id] = 0; // Days since tournament start
    });

    const gStand: Record<string, Team[]> = {};
    for (const gk in groups) {
      const gt = groups[gk];
      gt.forEach(t => { ts[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0 }; });
      for (let i = 0; i < gt.length; i++) for (let j = i + 1; j < gt.length; j++) {
        const tA = gt[i], tB = gt[j];
        // Simplified Group Stage Schedule: Match 1 = Day 1, Match 2 = Day 5, Match 3 = Day 9
        const currentMatchDay = (ts[tA.id].pts === 0 && ts[tA.id].gf === 0) ? 1 : 
                                (ts[tA.id].pts <= 3) ? 5 : 9;
        
        const restA = lastMatchDay[tA.id] === 0 ? 4 : currentMatchDay - lastMatchDay[tA.id];
        const restB = lastMatchDay[tB.id] === 0 ? 4 : currentMatchDay - lastMatchDay[tB.id];

        const r = this.simMatch(tA, tB, recent, false, liveElo, restA, restB);
        lastMatchDay[tA.id] = currentMatchDay;
        lastMatchDay[tB.id] = currentMatchDay;

        ts[tA.id].gf += r.sA; ts[tA.id].ga += r.sB; ts[tA.id].gd += r.sA - r.sB;
        ts[tB.id].gf += r.sB; ts[tB.id].ga += r.sA; ts[tB.id].gd += r.sB - r.sA;
        if (r.sA > r.sB) ts[tA.id].pts += 3;
        else if (r.sB > r.sA) ts[tB.id].pts += 3;
        else { ts[tA.id].pts += 1; ts[tB.id].pts += 1; }
        const { nA, nB } = this.updateElo(liveElo[tA.id], liveElo[tB.id], r.sA, r.sB, 40);
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
    const mt = this.pairThirds(wins, best8);
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
        const r = this.simMatch(m[0], m[1], recent, true, liveElo, restA, restB);
        winners.push(r.winner!);
        details.push(r);
        stage[r.winner!.id] = stageNum;
        lastMatchDay[m[0].id] = day;
        lastMatchDay[m[1].id] = day;
        const { nA, nB } = this.updateElo(liveElo[m[0].id], liveElo[m[1].id], r.sA, r.sB, 60);
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
    const fin = this.simMatch(wsf[0], wsf[1], recent, true, liveElo, restFinA, restFinB);
    stage[fin.winner!.id] = 6;

    return {
      stage,
      champion: fin.winner!,
      bracket: { r32: ro32.details, r16: ro16.details, qf: roqf.details, sf: rosf.details, final: fin } as BracketData
    };
  }

  initSimResults(teams: Team[]): Record<string, SimResult> {
    const simRes: Record<string, SimResult> = {};
    teams.forEach(t => { simRes[t.id] = { team: t, r32: 0, r16: 0, qf: 0, sf: 0, fin: 0, champ: 0 }; });
    return simRes;
  }

  winDrawLossProbs(tA: Team, tB: Team, recent: RecentMatch[]) {
    const { lA, lB } = this.xGoals(tA, tB, recent, {}, false);
    const rho = this.dcRho(lA, lB);
    let pw = 0, pd = 0, pl = 0, norm = 0;
    for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) {
      const p = Math.max(0, this.poissonProb(x, lA) * this.poissonProb(y, lB) * this.dcCorr(x, y, lA, lB, rho));
      norm += p;
      if (x > y) pw += p; else if (x === y) pd += p; else pl += p;
    }
    return { pw: pw / norm, pd: pd / norm, pl: pl / norm, lA, lB, rho };
  }
}
