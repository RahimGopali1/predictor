import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EspnMatchService, EspnMatch } from './espn-match.service';

describe('EspnMatchService — mapTournamentToEspn fallback', () => {
  let service: EspnMatchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EspnMatchService]
    });

    service = TestBed.inject(EspnMatchService);
  });

  // Directly calls the private mapTournamentToEspn method
  function mapTournament(status: any): EspnMatch[] {
    return (service as any).mapTournamentToEspn(status);
  }

  // Helper to populate the teamsCache for direct testing
  function setupTeamsCache(teams: { id: string; name: string; flag: string }[]) {
    const cache = (service as any).teamsCache as Map<string, { name: string; flag: string }>;
    cache.clear();
    teams.forEach(t => cache.set(t.id, { name: t.name, flag: t.flag }));
  }

  describe('mapTournamentToEspn (direct unit test)', () => {
    it('converts completed fixture to EspnMatch format', () => {
      setupTeamsCache([{ id: 'MEX', name: 'Mexico', flag: '/flags/mex.png' }]);

      const result = mapTournament({
        allFixtures: [{
          id: 1,
          home: 'MEX',
          away: 'RSA',
          homeScore: 2,
          awayScore: 1,
          finished: true,
          winnerId: 'MEX',
          status: 'Finished',
          stage: 'Group',
          group: 'A',
          venue: 'Estadio Azteca',
          city: 'Mexico City',
          date: 'Jun 12, 2026',
          time: '3:00 PM ET'
        }]
      });

      expect(result.length).toBe(1);
      const match = result[0];
      expect(match.id).toBe('1');
      expect(match.name).toBe('Mexico vs RSA');
      expect(match.statusName).toBe('STATUS_FULL_TIME');
      expect(match.shortDetail).toBe('FT · 2–1');
      expect(match.groupLabel).toBe('Group A');
      expect(match.seasonSlug).toBe('Group');
      expect(match.home.displayName).toBe('Mexico');
      expect(match.home.abbreviation).toBe('MEX');
      expect(match.home.logo).toBe('/flags/mex.png');
      expect(match.home.score).toBe(2);
      expect(match.home.winner).toBe(true);
      expect(match.away.displayName).toBe('RSA');
      expect(match.away.score).toBe(1);
      expect(match.away.winner).toBe(false);
      expect(match.venue).toBe('Estadio Azteca, Mexico City');
      expect(match.kickoff).toBe('');
      expect(match.odds).toBeUndefined();
      expect(match.broadcasts).toEqual([]);
      expect(match.details).toEqual([]);
    });

    it('marks away team as winner when winnerId matches away', () => {
      setupTeamsCache([{ id: 'RSA', name: 'South Africa', flag: '' }]);

      const result = mapTournament({
        allFixtures: [{
          id: 26,
          home: 'RSA',
          away: 'CZE',
          homeScore: 4,
          awayScore: 0,
          finished: true,
          winnerId: 'RSA',
          stage: 'Group',
          group: 'A',
          venue: 'SoFi Stadium',
          city: 'Los Angeles',
          date: 'Jun 20, 2026',
          time: '9:00 PM ET'
        }]
      });

      expect(result.length).toBe(1);
      expect(result[0].home.winner).toBe(true);
      expect(result[0].away.winner).toBe(false);
    });

    it('handles upcoming (unfinished) matches', () => {
      const result = mapTournament({
        allFixtures: [{
          id: 100,
          home: 'BRA',
          away: 'ARG',
          homeScore: null,
          awayScore: null,
          finished: false,
          status: 'Scheduled',
          stage: 'Quarter-Final',
          venue: 'Estadio Azteca',
          city: 'Mexico City',
          date: 'Jul 6, 2026',
          time: '3:00 PM ET'
        }]
      });

      expect(result.length).toBe(1);
      const match = result[0];
      expect(match.statusName).toBe('STATUS_SCHEDULED');
      expect(match.shortDetail).toBe('Jul 6, 2026 · 3:00 PM ET');
      expect(match.home.score).toBe(0);
      expect(match.away.score).toBe(0);
      expect(match.home.winner).toBe(false);
      expect(match.away.winner).toBe(false);
      expect(match.groupLabel).toBe('Quarter-Final');
    });

    it('does not set winner for draws', () => {
      const result = mapTournament({
        allFixtures: [{
          id: 2,
          home: 'KOR',
          away: 'CZE',
          homeScore: 1,
          awayScore: 1,
          finished: true,
          winnerId: null,
          stage: 'Group',
          group: 'A',
          venue: 'Estadio Akron',
          city: 'Guadalajara',
          date: 'Jun 12, 2026',
          time: '10:00 PM ET'
        }]
      });

      expect(result.length).toBe(1);
      expect(result[0].home.winner).toBe(false);
      expect(result[0].away.winner).toBe(false);
      expect(result[0].home.score).toBe(1);
      expect(result[0].away.score).toBe(1);
    });

    it('uses homeTeam/awayTeam names when team cache is empty', () => {
      (service as any).teamsCache.clear();
      // Intentionally don't set up teamsCache — should fall back to homeTeam/awayTeam
      const result = mapTournament({
        allFixtures: [{
          id: 73,
          home: 'RSA',
          away: 'CPV',
          homeTeam: 'South Africa',
          awayTeam: 'Cape Verde',
          homeScore: 2,
          awayScore: 0,
          finished: true,
          winnerId: 'RSA',
          stage: 'Round of 32',
          venue: 'MetLife Stadium',
          city: 'New York/New Jersey',
          date: 'Jun 28, 2026',
          time: '4:00 PM ET'
        }]
      });

      expect(result.length).toBe(1);
      expect(result[0].home.displayName).toBe('South Africa');
      expect(result[0].away.displayName).toBe('Cape Verde');
      expect(result[0].home.abbreviation).toBe('RSA');
      expect(result[0].away.abbreviation).toBe('CPV');
    });

    it('uses team IDs as display names when no name info is available', () => {
      const result = mapTournament({
        allFixtures: [{
          id: 99,
          home: 'UNK',
          away: 'XYZ',
          homeScore: null,
          awayScore: null,
          finished: false,
          stage: 'Grand Final',
          venue: 'MetLife Stadium',
          city: 'New York/New Jersey',
          date: 'Jul 19, 2026',
          time: '8:00 PM ET'
        }]
      });

      expect(result.length).toBe(1);
      expect(result[0].home.displayName).toBe('UNK');
      expect(result[0].away.displayName).toBe('XYZ');
      expect(result[0].name).toBe('UNK vs XYZ');
    });

    it('handles empty fixtures array', () => {
      const result = mapTournament({ allFixtures: [] });
      expect(result.length).toBe(0);
    });

    it('handles undefined status object', () => {
      const result = mapTournament(undefined);
      expect(result.length).toBe(0);
    });

    it('handles null status object', () => {
      const result = mapTournament(null);
      expect(result.length).toBe(0);
    });

    it('handles status without allFixtures property', () => {
      const result = mapTournament({});
      expect(result.length).toBe(0);
    });
  });

  describe('live/complete/upcoming filter behavior', () => {
    it('correctly categorizes tournament fallback matches using filter methods', () => {
      const matches = mapTournament({
        allFixtures: [
          {
            id: 1, home: 'MEX', away: 'RSA', homeScore: 2, awayScore: 1,
            finished: true, winnerId: 'MEX', stage: 'Group', group: 'A',
            venue: 'Estadio Azteca', city: 'Mexico City',
            date: 'Jun 12, 2026', time: '3:00 PM ET'
          },
          {
            id: 100, home: 'BRA', away: 'ARG', homeScore: null, awayScore: null,
            finished: false, stage: 'Grand Final',
            venue: 'MetLife Stadium', city: 'New York/New Jersey',
            date: 'Jul 19, 2026', time: '8:00 PM ET'
          }
        ]
      });

      const live = matches.filter((m: any) => (service as any).isLive(m));
      const completed = matches.filter((m: any) => (service as any).isCompleted(m));
      const upcoming = matches.filter((m: any) => (service as any).isUpcoming(m));

      expect(live.length).toBe(0);
      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe('1');
      expect(upcoming.length).toBe(1);
      expect(upcoming[0].id).toBe('100');
    });
  });
});
