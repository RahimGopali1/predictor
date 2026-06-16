import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FixtureStatus, TeamNextMatch, TournamentFixture, UpcomingMatch } from '../models/fixture.model';

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

    const data = await firstValueFrom(
      this.http.get<FixtureStatus>(`${this.api}/fixtures/status`)
    );
    this.status.set(data);
    return data;
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
}
