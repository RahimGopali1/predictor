import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FixtureService } from './fixture.service';
import { TeamService } from './team.service';
import { Team } from '../models/team.model';
import { FixtureStatus, TournamentFixture } from '../models/fixture.model';

describe('FixtureService', () => {
  let service: FixtureService;

  // ── Mock Teams ──

  const bra: Team = {
    id: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'A',
    elo: 2100, fifaRank: 5, star: 'Neymar', starDOB: '1992-02-05',
    value: '€950M', penRate: 0.76, host: false, climate: 'tropical'
  };

  const mex: Team = {
    id: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'A',
    elo: 1850, fifaRank: 12, star: 'Jiménez', starDOB: '1991-05-05',
    value: '€200M', penRate: 0.72, host: true, climate: 'temperate'
  };

  const kor: Team = {
    id: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'A',
    elo: 1720, fifaRank: 28, star: 'Son', starDOB: '1992-07-08',
    value: '€180M', penRate: 0.70, host: false, climate: 'temperate'
  };

  const cze: Team = {
    id: 'CZE', name: 'Czech Republic', flag: '🇨🇿', group: 'A',
    elo: 1680, fifaRank: 35, star: 'Souček', starDOB: '1995-02-27',
    value: '€120M', penRate: 0.69, host: false, climate: 'temperate'
  };

  const esp: Team = {
    id: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'B',
    elo: 2080, fifaRank: 8, star: 'Pedri', starDOB: '2002-11-25',
    value: '€900M', penRate: 0.75, host: false, climate: 'temperate'
  };

  const ned: Team = {
    id: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'B',
    elo: 2040, fifaRank: 6, star: 'de Jong', starDOB: '1997-05-12',
    value: '€800M', penRate: 0.73, host: false, climate: 'temperate'
  };

  const cro: Team = {
    id: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'B',
    elo: 1950, fifaRank: 10, star: 'Modrić', starDOB: '1985-09-09',
    value: '€350M', penRate: 0.74, host: false, climate: 'temperate'
  };

  const mar: Team = {
    id: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'B',
    elo: 1750, fifaRank: 22, star: 'Hakimi', starDOB: '1998-11-04',
    value: '€250M', penRate: 0.71, host: false, climate: 'arid'
  };

  const groupATeams = [bra, mex, kor, cze];
  const groupBTeams = [esp, ned, cro, mar];
  const allTeams = [...groupATeams, ...groupBTeams];

  // ── Helpers ──

  function makeFixture(
    id: number, group: string, home: string, away: string,
    homeScore: number, awayScore: number, finished = true
  ): TournamentFixture {
    return {
      id, stage: 'Group', matchday: 1,
      date: '2026-06-12', time: '3:00 PM ET',
      group, home, away,
      venue: 'Estadio Azteca', city: 'Mexico City',
      homeScore, awayScore,
      status: finished ? 'completed' : 'scheduled',
      finished
    };
  }

  function setStatus(fixtures: TournamentFixture[]): void {
    service.status.set({
      teamStatus: {},
      nextMatches: {},
      champion: null,
      groupStageComplete: false,
      resultsSyncedAt: null,
      finishedMatches: fixtures.filter(f => f.finished).length,
      totalMatches: fixtures.length,
      allFixtures: fixtures
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FixtureService, TeamService]
    });
    service = TestBed.inject(FixtureService);
  });

  // ─── GROUP STANDINGS ───

  describe('getGroupStandings', () => {
    it('returns zeroed entries when no fixtures exist', () => {
      setStatus([]);
      const result = service.getGroupStandings(allTeams);
      // Groups are derived from teams parameter, not fixtures
      expect(result['A']).toBeDefined();
      expect(result['A'].length).toBe(4);
      expect(result['A'].every(e => e.gp === 0 && e.pts === 0)).toBeTrue();
      expect(result['B']).toBeDefined();
      expect(result['B'].length).toBe(4);
      expect(result['B'].every(e => e.gp === 0 && e.pts === 0)).toBeTrue();
    });

    it('returns empty groups when no group fixtures are finished', () => {
      const unfinished = allTeams.map((t, i) => {
        // Create 6 unfinished fixtures per group (round-robin)
        return makeFixture(i + 1, i < 3 ? 'A' : 'B', 'TBD', 'TBD', 0, 0, false);
      });
      setStatus(unfinished);
      const result = service.getGroupStandings(allTeams);

      // Every group should have 4 entries with zero stats
      expect(result['A']).toBeDefined();
      expect(result['A'].length).toBe(4);
      expect(result['A'].every(e => e.gp === 0 && e.pts === 0)).toBeTrue();
      expect(result['B'].length).toBe(4);
      expect(result['B'].every(e => e.gp === 0 && e.pts === 0)).toBeTrue();
    });

    it('handles empty teams array', () => {
      setStatus([]);
      const result = service.getGroupStandings([]);
      expect(result).toEqual({});
    });

    it('correctly computes points and goals for a single finished match', () => {
      // Brazil 3-1 Mexico
      setStatus([makeFixture(1, 'A', 'BRA', 'MEX', 3, 1)]);

      const result = service.getGroupStandings(groupATeams);

      const braEntry = result['A'].find(e => e.teamId === 'BRA')!;
      expect(braEntry.pts).toBe(3);
      expect(braEntry.gp).toBe(1);
      expect(braEntry.w).toBe(1);
      expect(braEntry.gf).toBe(3);
      expect(braEntry.ga).toBe(1);
      expect(braEntry.gd).toBe(2);
      expect(braEntry.form).toBe('W');

      const mexEntry = result['A'].find(e => e.teamId === 'MEX')!;
      expect(mexEntry.pts).toBe(0);
      expect(mexEntry.gp).toBe(1);
      expect(mexEntry.l).toBe(1);
      expect(mexEntry.gf).toBe(1);
      expect(mexEntry.ga).toBe(3);
      expect(mexEntry.gd).toBe(-2);
      expect(mexEntry.form).toBe('L');

      // Unplayed teams
      const korEntry = result['A'].find(e => e.teamId === 'KOR')!;
      expect(korEntry.gp).toBe(0);
      expect(korEntry.pts).toBe(0);
      expect(korEntry.form).toBe('');
    });

    it('handles a draw correctly', () => {
      // South Korea 1-1 Czech Republic
      setStatus([makeFixture(2, 'A', 'KOR', 'CZE', 1, 1)]);

      const result = service.getGroupStandings(groupATeams);

      const korEntry = result['A'].find(e => e.teamId === 'KOR')!;
      expect(korEntry.pts).toBe(1);
      expect(korEntry.d).toBe(1);
      expect(korEntry.form).toBe('D');

      const czeEntry = result['A'].find(e => e.teamId === 'CZE')!;
      expect(czeEntry.pts).toBe(1);
      expect(czeEntry.d).toBe(1);
      expect(czeEntry.form).toBe('D');
    });

    it('sorts by points descending', () => {
      // Brazil 2-0 Czech Republic
      // Mexico 3-1 South Korea
      // → BRA 3pts, MEX 3pts, KOR 0pts, CZE 0pts
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        makeFixture(2, 'A', 'MEX', 'KOR', 3, 1),
      ]);

      const result = service.getGroupStandings(groupATeams);
      const standings = result['A'];

      // Top 2 should be BRA and MEX (3 pts each)
      expect(standings[0].pts).toBe(3);
      expect(standings[1].pts).toBe(3);
      // Bottom 2 should be 0 pts
      expect(standings[2].pts).toBe(0);
      expect(standings[3].pts).toBe(0);

      // Within same points, tie-break by GD → GF. BRA has +2 GD (2-0), MEX has +2 GD (3-1)
      // BRA's GF=2, MEX's GF=3, so MEX should be first? No - both have GD=2, then tie-break is GF
      // MEX GF=3 > BRA GF=2, so MEX should be first
      // Wait, let me re-check. BRA 2-0 CZE: GF=2, GA=0, GD=+2
      // MEX 3-1 KOR: GF=3, GA=1, GD=+2
      // Both have GD=+2, so tie-break by GF: MEX (3) > BRA (2). So MEX should be position 1, BRA position 2.
      expect(standings[0].teamId).toBe('MEX');
      expect(standings[1].teamId).toBe('BRA');
    });

    it('tie-breaks by goal difference then goals scored', () => {
      // Brazil 2-0 Czech Republic → BRA: GF=2, GD=+2
      // Mexico 1-0 South Korea    → MEX: GF=1, GD=+1
      // South Korea 1-0 Czech Republic → KOR: GF=1, GD=0, CZE: GF=0, GD=-2
      // Standings: BRA 3pts GD+2, MEX 3pts GD+1, KOR 3pts GD+0, CZE 0pts GD-2
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        makeFixture(2, 'A', 'MEX', 'KOR', 1, 0),
        makeFixture(3, 'A', 'KOR', 'CZE', 1, 0),
      ]);

      const result = service.getGroupStandings(groupATeams);
      const standings = result['A'];

      expect(standings[0].teamId).toBe('BRA');  // 3pts, +2 GD
      expect(standings[1].teamId).toBe('MEX');  // 3pts, +1 GD
      expect(standings[2].teamId).toBe('KOR');  // 3pts, 0 GD
      expect(standings[3].teamId).toBe('CZE');  // 0pts, -2 GD

      // Check positions
      expect(standings[0].position).toBe(1);
      expect(standings[1].position).toBe(2);
      expect(standings[2].position).toBe(3);
      expect(standings[3].position).toBe(4);

      // Check form strings
      // BRA: 2-0 CZE (W)
      expect(standings[0].form).toBe('W');
      // MEX: 1-0 KOR (W)
      expect(standings[1].form).toBe('W');
      // KOR: 1-0 MEX (L), 1-0 CZE (W) = 'LW'
      expect(standings[2].form).toBe('LW');
      // CZE: 0-2 BRA (L), 0-1 KOR (L) = 'LL'
      expect(standings[3].form).toBe('LL');
    });

    it('tie-breaks by goals scored when GD is equal', () => {
      // Brazil 2-0 Czech Republic → BRA: GF=2, GD=+2
      // Mexico 3-1 South Korea    → MEX: GF=3, GD=+2
      // Both 3pts, both +2 GD → MEX wins on GF (3 vs 2)
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        makeFixture(2, 'A', 'MEX', 'KOR', 3, 1),
      ]);

      const result = service.getGroupStandings(groupATeams);
      const standings = result['A'];

      expect(standings[0].teamId).toBe('MEX'); // GF=3
      expect(standings[1].teamId).toBe('BRA'); // GF=2
    });

    it('computes full round-robin standings correctly', () => {
      // Full Group A round-robin:
      // Brazil 2-0 Czech Republic
      // Mexico 3-1 South Korea
      // Brazil 1-1 Mexico
      // South Korea 0-0 Czech Republic
      // Brazil 2-0 South Korea
      // Mexico 2-1 Czech Republic
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        makeFixture(2, 'A', 'MEX', 'KOR', 3, 1),
        makeFixture(3, 'A', 'BRA', 'MEX', 1, 1),
        makeFixture(4, 'A', 'KOR', 'CZE', 0, 0),
        makeFixture(5, 'A', 'BRA', 'KOR', 2, 0),
        makeFixture(6, 'A', 'MEX', 'CZE', 2, 1),
      ]);

      const result = service.getGroupStandings(groupATeams);
      const standings = result['A'];

      // Expected:
      // BRA: 2-0 CZE, 1-1 MEX, 2-0 KOR = 7pts, GF=5, GA=1, GD=+4
      // MEX: 3-1 KOR, 1-1 BRA, 2-1 CZE = 7pts, GF=6, GA=3, GD=+3
      // KOR: 1-3 MEX, 0-0 CZE, 0-2 BRA = 1pt, GF=1, GA=5, GD=-4
      // CZE: 0-2 BRA, 0-0 KOR, 1-2 MEX = 1pt, GF=1, GA=4, GD=-3

      expect(standings[0].teamId).toBe('BRA');
      expect(standings[0].pts).toBe(7);
      expect(standings[0].w).toBe(2);
      expect(standings[0].d).toBe(1);
      expect(standings[0].l).toBe(0);
      expect(standings[0].gf).toBe(5);
      expect(standings[0].ga).toBe(1);
      expect(standings[0].gd).toBe(4);
      expect(standings[0].form).toBe('WDW');
      expect(standings[0].position).toBe(1);

      expect(standings[1].teamId).toBe('MEX');
      expect(standings[1].pts).toBe(7);
      expect(standings[1].w).toBe(2);
      expect(standings[1].d).toBe(1);
      expect(standings[1].l).toBe(0);
      expect(standings[1].gf).toBe(6);
      expect(standings[1].ga).toBe(3);
      expect(standings[1].gd).toBe(3);
      expect(standings[1].form).toBe('WDW');
      expect(standings[1].position).toBe(2);

      // KOR and CZE are tied on points (1), KOR has better GD (-4 vs -3)... wait
      // KOR: GF=1, GA=5, GD=-4
      // CZE: GF=1, GA=4, GD=-3
      // CZE has better GD (-3 > -4), so CZE should be 3rd
      expect(standings[2].teamId).toBe('CZE');
      expect(standings[2].pts).toBe(1);
      expect(standings[2].gd).toBe(-3);
      expect(standings[2].position).toBe(3);

      expect(standings[3].teamId).toBe('KOR');
      expect(standings[3].pts).toBe(1);
      expect(standings[3].gd).toBe(-4);
      expect(standings[3].position).toBe(4);
    });

    it('ignores unfinished fixtures', () => {
      // Brazil 2-0 Czech (finished)
      // Mexico vs South Korea (not finished)
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        { ...makeFixture(2, 'A', 'MEX', 'KOR', 0, 0, false), finished: false, status: 'scheduled' }
      ]);

      const result = service.getGroupStandings(groupATeams);

      const bra = result['A'].find(e => e.teamId === 'BRA')!;
      expect(bra.gp).toBe(1);
      expect(bra.pts).toBe(3);

      const mex = result['A'].find(e => e.teamId === 'MEX')!;
      expect(mex.gp).toBe(0);
      expect(mex.pts).toBe(0);
    });

    it('returns separate standings for multiple groups', () => {
      // Group A: Brazil 2-0 Czech Republic
      // Group B: Spain 1-0 Morocco
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        makeFixture(2, 'B', 'ESP', 'MAR', 1, 0),
      ]);

      const result = service.getGroupStandings(allTeams);

      // Group A
      expect(result['A']).toBeDefined();
      expect(result['A'].length).toBe(4);
      expect(result['A'][0].teamId).toBe('BRA');

      // Group B
      expect(result['B']).toBeDefined();
      expect(result['B'].length).toBe(4);
      expect(result['B'][0].teamId).toBe('ESP');

      // No other groups
      expect(Object.keys(result).length).toBe(2);
    });

    it('handles null/undefined scores gracefully', () => {
      const fixture: TournamentFixture = {
        ...makeFixture(1, 'A', 'BRA', 'MEX', 0, 0),
        homeScore: null,
        awayScore: null,
        finished: true
      };
      setStatus([fixture]);

      // Should not crash - fixture with null scores should be skipped
      const result = service.getGroupStandings(groupATeams);
      const entries = result['A'];
      expect(entries.every(e => e.gp === 0)).toBeTrue();
    });

    it('preserves team metadata (name, flag) in standings', () => {
      setStatus([makeFixture(1, 'A', 'BRA', 'MEX', 2, 0)]);

      const result = service.getGroupStandings(groupATeams);
      const braEntry = result['A'].find(e => e.teamId === 'BRA')!;

      expect(braEntry.teamName).toBe('Brazil');
      expect(braEntry.teamFlag).toBe('🇧🇷');
      expect(braEntry.group).toBe('A');
    });

    it('only processes fixtures with a matching group in standings', () => {
      // Fixture with no group field
      const noGroupFixture: TournamentFixture = {
        ...makeFixture(1, '', 'BRA', 'MEX', 2, 0),
        group: undefined as any
      };
      setStatus([noGroupFixture]);

      // Should not crash, fixture without group should be skipped
      const result = service.getGroupStandings(groupATeams);
      const entries = result['A'];
      expect(entries.every(e => e.gp === 0)).toBeTrue();
    });

    it('handles teams missing from the standings map gracefully', () => {
      // Fixture with a team not in any group's 4 teams
      setStatus([
        makeFixture(1, 'A', 'BRA', 'MEX', 2, 0),
        makeFixture(2, 'A', 'FRA', 'KOR', 3, 0), // FRA is not in group A
      ]);

      // Should not crash, FRA fixture should be skipped
      const result = service.getGroupStandings(groupATeams);
      expect(result['A'].length).toBe(4);
      const kor = result['A'].find(e => e.teamId === 'KOR')!;
      expect(kor.gp).toBe(0); // KOR wasn't involved in any valid finished fixture
    });

    it('builds multi-match form strings ordered by match sequence', () => {
      // Brazil: W (2-0 CZE), D (1-1 MEX), W (2-0 KOR) = "WDW"
      // Mexico: W (3-1 KOR), D (1-1 BRA), W (2-1 CZE) = "WDW"
      setStatus([
        makeFixture(1, 'A', 'BRA', 'CZE', 2, 0),
        makeFixture(2, 'A', 'MEX', 'KOR', 3, 1),
        makeFixture(3, 'A', 'BRA', 'MEX', 1, 1),
        makeFixture(4, 'A', 'KOR', 'CZE', 0, 0),
        makeFixture(5, 'A', 'BRA', 'KOR', 2, 0),
        makeFixture(6, 'A', 'MEX', 'CZE', 2, 1),
      ]);

      const result = service.getGroupStandings(groupATeams);

      expect(result['A'].find(e => e.teamId === 'BRA')!.form).toBe('WDW');
      expect(result['A'].find(e => e.teamId === 'MEX')!.form).toBe('WDW');
      expect(result['A'].find(e => e.teamId === 'KOR')!.form).toBe('LDL');
      expect(result['A'].find(e => e.teamId === 'CZE')!.form).toBe('LDL');
    });
  });
});
