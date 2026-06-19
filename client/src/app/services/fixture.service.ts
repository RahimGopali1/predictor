import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Team } from '../models/team.model';
import { FixtureStatus, GroupStandingEntry, TeamNextMatch, TournamentFixture, UpcomingMatch } from '../models/fixture.model';
import { TeamService } from './team.service';

@Injectable({ providedIn: 'root' })
export class FixtureService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api';

  readonly status = signal<FixtureStatus | null>(null);
  readonly syncing = signal(false);

  async loadStatus(sync = false): Promise<FixtureStatus> {
    if (sync) {
      this.syncing.set(true);
      try {
        const res = await firstValueFrom(
          this.http.post<{ status: FixtureStatus }>(`${this.api}/fixtures/sync`, {})
        );
        this.status.set(res.status);
        return res.status;
      } finally {
        this.syncing.set(false);
      }
    }

    try {
      const data = await firstValueFrom(
        this.http.get<FixtureStatus>(`${this.api}/fixtures/status`)
      );
      this.status.set(data);
      return data;
    } catch (err) {
      // If the API isn't available (hosting without server funcs), fall back to a
      // static `fixture-status.json` bundled with the client app (served from /).
      console.warn('Failed to load /api/fixtures/status, falling back to /fixture-status.json', err);
      const fallback = await firstValueFrom(
        this.http.get<FixtureStatus>('/fixture-status.json')
      );
      this.status.set(fallback);
      return fallback;
    }
  }

  getUpcomingMatch(teamId: string): UpcomingMatch | null {
    const s = this.status();
    let next = s?.nextMatches[teamId];

    if (!next?.match) {
      next = Object.values(s?.nextMatches || {}).find((entry: any) =>
        entry.match && (entry.match.home === teamId || entry.match.away === teamId)
      ) as any;
    }

    if (!next?.match) return null;

    const actual = this.getFixtureById(next.match.id);
    const fixture = {
      ...next.match,
      ...(actual ? {
        ...actual,
        finished: actual.finished,
        homeScore: actual.homeScore,
        awayScore: actual.awayScore,
        status: actual.status
      } : {})
    };
    const { home, away } = fixture;
    if (!home || !away || home === 'TBD' || away === 'TBD') {
      return null;
    }

    const isHome = fixture.home === teamId
      ? true
      : fixture.away === teamId
        ? false
        : Boolean(next.match.isHome);
    const opponentId = isHome ? fixture.away : fixture.home;

    return {
      fixture,
      selectedId: teamId,
      opponentId,
      isHome,
      teamStatus: next.status,
      statusMessage: next.message
    };
  }

  getFixtureById(matchId: number): TournamentFixture | null {
    const fixtures = (this.status()?.allFixtures as TournamentFixture[] | undefined) ?? [];
    return fixtures.find(match => match.id === matchId) ?? null;
  }

  getTeamNext(teamId: string): TeamNextMatch | null {
    return this.status()?.nextMatches[teamId] ?? null;
  }

  isEliminated(teamId: string): boolean {
    const next = this.getTeamNext(teamId);
    return next?.status === 'eliminated';
  }

  isChampion(teamId: string): boolean {
    return this.status()?.champion === teamId;
  }

  /**
   * Compute group standings from the loaded allFixtures data.
   * Returns a record keyed by group letter (A-L), each containing
   * an array of 4 teams sorted by Points → GD → GF → ELO.
   */
  getGroupStandings(teams: Team[]): Record<string, GroupStandingEntry[]> {
    const fixtures = (this.status()?.allFixtures as TournamentFixture[]) ?? [];
    const groupFixtures = fixtures.filter(f => f.stage === 'Group' || !f.stage || f.matchday);
    const teamsByGroup = this.groupTeams(teams);

    const standings: Record<string, Record<string, GroupStandingEntry>> = {};

    for (const gk in teamsByGroup) {
      standings[gk] = {};
      for (const t of teamsByGroup[gk]) {
        standings[gk][t.id] = {
          teamId: t.id,
          teamName: t.name,
          teamFlag: t.flag,
          group: gk,
          pts: 0, gp: 0, w: 0, d: 0, l: 0,
          gf: 0, ga: 0, gd: 0,
          form: '',
          position: 0
        };
      }
    }

    for (const f of groupFixtures) {
      if (!f.finished || f.homeScore == null || f.awayScore == null) continue;
      if (!f.group) continue;
      const grp = standings[f.group];
      if (!grp || !grp[f.home] || !grp[f.away]) continue;

      const h = grp[f.home];
      const a = grp[f.away];
      const sH = f.homeScore;
      const sA = f.awayScore;

      h.gp++; a.gp++;
      h.gf += sH; h.ga += sA;
      a.gf += sA; a.ga += sH;
      h.gd = h.gf - h.ga;
      a.gd = a.gf - a.ga;

      if (sH > sA) {
        h.pts += 3; h.w++; a.l++;
        h.form += 'W'; a.form += 'L';
      } else if (sA > sH) {
        a.pts += 3; a.w++; h.l++;
        h.form += 'L'; a.form += 'W';
      } else {
        h.pts += 1; a.pts += 1;
        h.d++; a.d++;
        h.form += 'D'; a.form += 'D';
      }
    }

    // Sort & assign positions
    const result: Record<string, GroupStandingEntry[]> = {};
    for (const gk in teamsByGroup) {
      const teamsMap = standings[gk];
      const sorted = teamsByGroup[gk]
        .map(t => teamsMap[t.id])
        .sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return 0;
        })
        .map((entry, idx) => ({ ...entry, position: idx + 1 }));
      result[gk] = sorted;
    }

    return result;
  }

  private groupTeams(teams: Team[]): Record<string, Team[]> {
    const groups: Record<string, Team[]> = {};
    for (const t of teams) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
    return groups;
  }
}
