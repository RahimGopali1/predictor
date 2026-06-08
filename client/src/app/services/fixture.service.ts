import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FixtureStatus, TeamNextMatch, UpcomingMatch } from '../models/fixture.model';

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
    const next = s?.nextMatches[teamId];
    if (!next?.match) return null;

    return {
      fixture: next.match,
      selectedId: teamId,
      opponentId: next.match.isHome ? next.match.away : next.match.home,
      isHome: next.match.isHome,
      teamStatus: next.status,
      statusMessage: next.message
    };
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
