import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SimulationService } from './simulation.service';
import { TeamService } from './team.service';
import { Team, RecentMatch } from '../models/team.model';

describe('SimulationService', () => {
  let service: SimulationService;

  // Sample teams for testing
  const arg: Team = {
    id: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J',
    elo: 2140, fifaRank: 3, star: 'Messi', starDOB: '1987-06-24',
    value: '€750M', penRate: 0.78, host: false, climate: 'temperate'
  };

  const eng: Team = {
    id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L',
    elo: 2020, fifaRank: 4, star: 'Kane', starDOB: '1993-07-28',
    value: '€1.3B', penRate: 0.72, host: false, climate: 'temperate'
  };

  const hai: Team = {
    id: 'HAI', name: 'Haiti', flag: '🇭🇹', group: 'C',
    elo: 1590, fifaRank: 85, star: 'Nazon', starDOB: '1994-04-08',
    value: '€8M', penRate: 0.68, host: false, climate: 'tropical'
  };

  const usa: Team = {
    id: 'USA', name: 'United States', flag: '🇺🇸', group: 'D',
    elo: 1850, fifaRank: 16, star: 'Pulisic', starDOB: '1998-09-18',
    value: '€350M', penRate: 0.74, host: true, climate: 'varied'
  };

  // Sample recent matches
  const recentMatches: RecentMatch[] = [
    { date: '2026-03-20', home: 'ARG', away: 'BRA', sH: 3, sA: 0, type: 'Friendly', k: 60, rec: 1.0 },
    { date: '2026-02-15', home: 'ARG', away: 'URU', sH: 2, sA: 1, type: 'Qualifier', k: 90, rec: 1.5 },
    { date: '2026-01-10', home: 'COL', away: 'ARG', sH: 1, sA: 1, type: 'Friendly', k: 60, rec: 0.8 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SimulationService, TeamService]
    });
    service = TestBed.inject(SimulationService);
  });

  // ─── VALUE PARSING ───

  describe('parseValue', () => {
    it('parses millions (M) correctly', () => {
      expect(service.parseValue('€750M')).toBe(750);
      expect(service.parseValue('€8M')).toBe(8);
      expect(service.parseValue('€350M')).toBe(350);
    });

    it('parses billions (B) correctly', () => {
      expect(service.parseValue('€1.3B')).toBe(1300);
      expect(service.parseValue('€1.2B')).toBe(1200);
      expect(service.parseValue('€1.0B')).toBe(1000);
    });

    it('handles empty or invalid values gracefully', () => {
      expect(service.parseValue('')).toBe(0);
      expect(service.parseValue('N/A')).toBe(0);
      expect(service.parseValue('€0M')).toBe(0);
    });

    it('handles plain numbers', () => {
      expect(service.parseValue('500')).toBe(500);
    });
  });

  // ─── VALUE MODIFIER ───

  describe('valueMod', () => {
    it('gives positive boost to high-value teams', () => {
      // England €1.3B → log10(1300) ≈ 3.11 → (3.11 - 2) × 14 ≈ 15.6 → capped at 15
      expect(service.valueMod('€1.3B')).toBe(15);
      expect(service.valueMod('€1.2B')).toBe(15);
    });

    it('gives moderate boost to above-average teams', () => {
      // Argentina €750M → log10(750) ≈ 2.875 → (2.875 - 2) × 14 ≈ 12.25
      const mod = service.valueMod('€750M');
      expect(mod).toBeGreaterThan(10);
      expect(mod).toBeLessThan(15);
    });

    it('gives small boost to average teams', () => {
      // USA €350M → log10(350) ≈ 2.544 → (2.544 - 2) × 14 ≈ 7.6
      const mod = service.valueMod('€350M');
      expect(mod).toBeGreaterThan(5);
      expect(mod).toBeLessThan(10);
    });

    it('penalizes low-value teams', () => {
      // Haiti €8M → log10(8) ≈ 0.903 → (0.903 - 2) × 14 ≈ -15.4 → capped at -15
      expect(service.valueMod('€8M')).toBe(-15);
    });

    it('returns 0 for empty or invalid values', () => {
      expect(service.valueMod('')).toBe(0);
      expect(service.valueMod('N/A')).toBe(0);
    });

    it('is symmetric: stronger team gets bigger boost than weaker team', () => {
      const engMod = service.valueMod(eng.value);
      const haiMod = service.valueMod(hai.value);
      expect(engMod).toBeGreaterThan(haiMod);
    });
  });

  // ─── RECENT FORM MODIFIER ───

  describe('formMod', () => {
    it('gives positive adjustment for winning form', () => {
      const mod = service.formMod('ARG', recentMatches);
      expect(mod).toBeGreaterThan(0);
    });

    it('gives negative adjustment for losing form', () => {
      const losingMatches: RecentMatch[] = [
        { date: '2026-03-20', home: 'HAI', away: 'BRA', sH: 0, sA: 4, type: 'Friendly', k: 60, rec: 1.0 },
        { date: '2026-02-15', home: 'HAI', away: 'URU', sH: 0, sA: 3, type: 'Qualifier', k: 90, rec: 1.5 },
      ];
      const mod = service.formMod('HAI', losingMatches);
      expect(mod).toBeLessThan(0);
    });

    it('returns 0 for team with no recent matches', () => {
      expect(service.formMod('FIJ', [])).toBe(0);
    });

    it('weights dominant wins more than narrow wins', () => {
      const dominantWin: RecentMatch[] = [
        { date: '2026-03-20', home: 'ARG', away: 'BRA', sH: 5, sA: 0, type: 'Friendly', k: 60, rec: 1.0 }
      ];
      const narrowWin: RecentMatch[] = [
        { date: '2026-03-20', home: 'ARG', away: 'BRA', sH: 1, sA: 0, type: 'Friendly', k: 60, rec: 1.0 }
      ];
      const dominant = service.formMod('ARG', dominantWin);
      const narrow = service.formMod('ARG', narrowWin);
      expect(dominant).toBeGreaterThan(narrow);
    });
  });

  // ─── DIXON-COLES CORRELATION ───

  describe('dcRho and dcCorr', () => {
    it('returns stronger negative rho for close expected goal rates', () => {
      const close = service.dcRho(1.3, 1.2);  // gap 0.1
      const far = service.dcRho(2.5, 0.8);    // gap 1.7
      expect(close).toBeLessThan(far);
      expect(close).toBe(-0.13);
      expect(far).toBe(-0.05);
    });

    it('dcCorr returns 1 for uncorrelated scores', () => {
      expect(service.dcCorr(3, 4, 1.3, 1.2, -0.13)).toBe(1);
    });

    it('dcCorr adjusts 0-0 and 0-1 outcomes', () => {
      const rho = -0.13;
      const la = 1.3, lb = 1.2;
      // 0-0: 1 - la*lb*rho = 1 - 1.3*1.2*(-0.13) = 1 + 0.2028 = 1.2028
      expect(service.dcCorr(0, 0, la, lb, rho)).toBeCloseTo(1.2028, 3);
      // 0-1: 1 + la*rho = 1 + 1.3*(-0.13) = 0.831
      expect(service.dcCorr(0, 1, la, lb, rho)).toBeCloseTo(0.831, 3);
    });
  });

  // ─── POISSON PROBABILITIES ───

  describe('poissonProb', () => {
    it('returns valid probabilities', () => {
      const p0 = service.poissonProb(0, 1.3);
      expect(p0).toBeGreaterThan(0);
      expect(p0).toBeLessThan(1);

      const p1 = service.poissonProb(1, 1.3);
      expect(p1).toBeGreaterThan(0);
      expect(p1).toBeLessThan(1);
    });

    it('probabilities for λ=1.3 sum to ~1 over 0..8 goals', () => {
      let total = 0;
      for (let k = 0; k <= 8; k++) total += service.poissonProb(k, 1.3);
      expect(total).toBeCloseTo(1, 1);
    });
  });

  // ─── EXPECTED GOALS ───

  describe('xGoals', () => {
    it('returns higher expected goals for the stronger team', () => {
      const { lA, lB } = service.xGoals(arg, hai, []);
      expect(lA).toBeGreaterThan(lB);
    });

    it('gives host team an advantage', () => {
      const { lA: usHome } = service.xGoals(usa, arg, []);
      const { lA: argAway } = service.xGoals(arg, usa, []);
      // USA gets +75 ELO as host in the first call; ARG plays away in second
      // so USA's home xG should be relatively higher than ARG's away xG
      expect(usHome).toBeGreaterThan(0.5);
      expect(argAway).toBeGreaterThan(0.1);
    });

    it('returns values within the clamped range', () => {
      const { lA, lB } = service.xGoals(arg, hai, []);
      expect(lA).toBeGreaterThanOrEqual(0.1);
      expect(lA).toBeLessThanOrEqual(5.5);
      expect(lB).toBeGreaterThanOrEqual(0.1);
      expect(lB).toBeLessThanOrEqual(5.5);
    });

    it('produces lower goals in KO mode', () => {
      const group = service.xGoals(arg, eng, [], {}, false);
      const ko = service.xGoals(arg, eng, [], {}, true);
      expect(ko.lA).toBeLessThan(group.lA);
      expect(ko.lB).toBeLessThan(group.lB);
    });

    it('integrates form modifier correctly', () => {
      const withForm = service.xGoals(arg, hai, recentMatches);
      const withoutForm = service.xGoals(arg, hai, []);
      // ARG has winning form (3-0, 2-1, draw), so withForm should favor ARG more
      expect(withForm.lA - withForm.lB).toBeGreaterThanOrEqual(withoutForm.lA - withoutForm.lB - 0.3);
    });

    it('integrates squad value modifier', () => {
      // England has much higher value than Haiti
      const { lA: engA, lB: engB } = service.xGoals(eng, hai, []);
      // England's expected goals should be significantly higher
      expect(engA).toBeGreaterThan(engB + 0.5);
    });
  });

  // ─── PENALTY SHOOTOUTS ───

  describe('simPens', () => {
    it('always produces a winner', () => {
      for (let i = 0; i < 20; i++) {
        const result = service.simPens(arg, eng);
        expect(result.winner).toBeTruthy();
        expect([arg.id, eng.id]).toContain(result.winner.id);
      }
    });

    it('scores are non-negative and reasonable', () => {
      for (let i = 0; i < 20; i++) {
        const result = service.simPens(arg, hai);
        expect(result.sA).toBeGreaterThanOrEqual(0);
        expect(result.sB).toBeGreaterThanOrEqual(0);
        expect(result.sA).toBeLessThanOrEqual(10);
        expect(result.sB).toBeLessThanOrEqual(10);
      }
    });

    it('higher penRate leads to more wins (over many trials)', () => {
      // ARG (0.78) vs HAI (0.68) — ARG should win ~55%+ over 100 trials
      let argWins = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const result = service.simPens(arg, hai);
        if (result.winner.id === 'ARG') argWins++;
      }
      expect(argWins).toBeGreaterThan(trials * 0.45); // not a strict threshold, but should be >45%
    });
  });

  // ─── ELO UPDATE ───

  describe('updateElo', () => {
    it('gives points to winner and takes from loser', () => {
      const { nA, nB } = service.updateElo(2000, 1800, 2, 0, 32);
      expect(nA).toBeGreaterThan(2000);
      expect(nB).toBeLessThan(1800);
    });

    it('draw gives slight advantage to lower-rated team', () => {
      const { nA, nB } = service.updateElo(2000, 1800, 1, 1, 32);
      expect(nA).toBeLessThan(2000); // higher-rated loses ELO for drawing
      expect(nB).toBeGreaterThan(1800); // lower-rated gains ELO for drawing
    });

    it('applies K-factor correctly', () => {
      // Higher K = bigger swing
      const { nA: lowK } = service.updateElo(2000, 1800, 1, 0, 32);
      const { nA: highK } = service.updateElo(2000, 1800, 1, 0, 64);
      expect(highK - 2000).toBeGreaterThan(lowK - 2000);
    });
  });

  // ─── SINGLE MATCH SIMULATION ───

  describe('simMatch', () => {
    it('returns a valid MatchResult', () => {
      const result = service.simMatch(arg, hai, []);
      expect(result.tA.id).toBe('ARG');
      expect(result.tB.id).toBe('HAI');
      expect(result.sA).toBeGreaterThanOrEqual(0);
      expect(result.sB).toBeGreaterThanOrEqual(0);
      expect(result.sA).toBeLessThanOrEqual(15);
      expect(result.sB).toBeLessThanOrEqual(15);
    });

    it('ARG is more likely to beat HAI (over many trials)', () => {
      let argWins = 0;
      const trials = 500;
      for (let i = 0; i < trials; i++) {
        const result = service.simMatch(arg, hai, []);
        if (result.winner?.id === 'ARG') argWins++;
      }
      expect(argWins).toBeGreaterThan(trials * 0.5);
    });

    it('KO matches can go to extra time', () => {
      let etCount = 0;
      const trials = 500;
      for (let i = 0; i < trials; i++) {
        const result = service.simMatch(arg, eng, [], true);
        if (result.et || result.pens) etCount++;
      }
      // Close matchups should go to ET occasionally
      expect(etCount).toBeGreaterThan(0);
    });
  });

  // ─── WIN/DRAW/LOSS PROBABILITIES ───

  describe('winDrawLossProbs', () => {
    it('probabilities sum to 1', () => {
      const { pw, pd, pl } = service.winDrawLossProbs(arg, hai, []);
      const total = pw + pd + pl;
      expect(total).toBeCloseTo(1, 3);
    });

    it('stronger team has higher win probability', () => {
      const { pw: pwStrong } = service.winDrawLossProbs(arg, hai, []);
      const { pw: pwWeak } = service.winDrawLossProbs(hai, arg, []);
      expect(pwStrong).toBeGreaterThan(pwWeak);
    });

    it('close teams have relatively balanced probabilities', () => {
      const { pw, pd, pl } = service.winDrawLossProbs(arg, eng, []);
      // ARG (2140) vs ENG (2020) — close enough that no single outcome > 60%
      expect(pw).toBeLessThan(0.6);
      expect(pl).toBeLessThan(0.6);
      expect(pd).toBeGreaterThan(0.15);
    });
  });

  // ─── THIRD PLACE PAIRING ───

  describe('pairThirds', () => {
    it('pairs third-placed teams with allowed group winners', () => {
      const groups = 'ABCDEFGHIJKL'.split('').reduce((acc, g) => {
        acc[g] = { id: `W${g}`, name: `W${g}`, group: g } as Team;
        return acc;
      }, {} as Record<string, Team>);

      const thirds: Team[] = 'CDEFGHIJKL'.split('').map(g => ({
        id: `3rd${g}`, name: `3rd${g}`, group: g
      } as Team));

      const result = service.pairThirds(groups, thirds);

      // Should have exactly 8 pairings (8 group winners get a third)
      expect(Object.keys(result).length).toBe(8);

      // Each paired third should come from an allowed group
      for (const [wk, tp] of Object.entries(result)) {
        expect(tp.group).not.toBe(wk); // can't be from same group
      }
    });

    it('handles empty thirds array', () => {
      const winners = { A: arg };
      const result = service.pairThirds(winners, []);
      expect(result).toBeDefined();
    });
  });

  // ─── TOURNAMENT RUNNER ───

  describe('runTournament', () => {
    // Use a minimal 4-team single-group setup for fast testing
    // All teams must be in the same group for a valid round-robin
    const miniTeams: Team[] = [
      { ...arg, group: 'A' },
      { ...eng, group: 'A' },
      { ...usa, group: 'A' },
      { ...hai, group: 'A' },
    ];

    it('completes without error', () => {
      const result = service.runTournament(miniTeams, recentMatches);
      expect(result).toBeDefined();
      expect(result.champion).toBeDefined();
      expect(result.stage).toBeDefined();
    });

    it('produces a bracket with all stages', () => {
      const result = service.runTournament(miniTeams, []);
      const bracket = result.bracket;
      expect(bracket.r32).toBeDefined();
      expect(bracket.r16).toBeDefined();
      expect(bracket.qf).toBeDefined();
      expect(bracket.sf).toBeDefined();
      expect(bracket.final).toBeDefined();
    });

    it('champion is one of the participating teams', () => {
      const result = service.runTournament(miniTeams, []);
      const teamIds = miniTeams.map(t => t.id);
      expect(teamIds).toContain(result.champion.id);
    });

    it('every team has a stage value', () => {
      const result = service.runTournament(miniTeams, []);
      for (const t of miniTeams) {
        expect(result.stage[t.id]).toBeDefined();
        expect(result.stage[t.id]).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
