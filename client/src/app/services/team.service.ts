import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RecentMatch, Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api';

  readonly teams = signal<Team[]>([]);
  readonly recentMatches = signal<RecentMatch[]>([]);
  readonly syncSource = signal<string>('loading');
  readonly syncedAt = signal<string | null>(null);
  readonly loading = signal(true);

  async loadTeams(sync = false): Promise<void> {
    this.loading.set(true);
    try {
      if (sync) {
        const synced = await firstValueFrom(this.http.post<{ teams: Team[]; source: string; syncedAt: string }>(
          `${this.api}/teams/sync`, {}
        ));
        this.teams.set(synced.teams);
        this.syncSource.set(synced.source);
        this.syncedAt.set(synced.syncedAt);
      } else {
        const data = await firstValueFrom(this.http.get<{ teams: Team[]; source: string; syncedAt: string | null }>(
          `${this.api}/teams`
        ));
        this.teams.set(data.teams);
        this.syncSource.set(data.source);
        this.syncedAt.set(data.syncedAt);
      }

      const matches = await firstValueFrom(this.http.get<RecentMatch[]>(`${this.api}/recent-matches`));
      this.recentMatches.set(matches);
    } finally {
      this.loading.set(false);
    }
  }

  getGroups(): Record<string, Team[]> {
    const groups: Record<string, Team[]> = {};
    for (const t of this.teams()) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
    return groups;
  }

  findTeam(id: string): Team | undefined {
    return this.teams().find(t => t.id === id);
  }
}
