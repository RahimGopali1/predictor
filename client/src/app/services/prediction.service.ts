import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SimResult, UserPrediction } from '../models/team.model';

export interface LeaderboardEntry {
  rank: number;
  userName: string;
  championId: string;
  championName: string;
  championFlag: string;
  championCorrect: boolean;
  championPts: number;
  topPicksPts: number;
  totalScore: number;
  topPicks: { id: string; name: string; pct: number }[];
  pickDetails: { id: string; name: string; stage: string; pts: number }[];
  simsRun: number;
  createdAt: string;
}

export interface LeaderboardResponse {
  champion: string | null;
  championName: string | null;
  championFlag: string;
  totalUsers: number;
  leaderboard: LeaderboardEntry[];
}

export interface AdminStats {
  totalPredictions: number;
  uniqueUsers: number;
  championStats: { id: string; name: string; flag: string; count: number; pct: number }[];
  sandboxStats: { id: string; name: string; flag: string; count: number }[];
  totalSandboxSims: number;
  recent: UserPrediction[];
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api';

  getUserName(): string {
    const stored = localStorage.getItem('wc_user_name');
    if (stored) return stored;
    const name = `User_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem('wc_user_name', name);
    return name;
  }

  setUserName(name: string): void {
    localStorage.setItem('wc_user_name', name);
  }

  async savePrediction(
    userName: string,
    simRes: Record<string, SimResult>,
    simsRun: number
  ): Promise<void> {
    const sorted = Object.values(simRes).sort((a, b) => b.champ - a.champ);
    const leader = sorted[0];
    if (!leader) return;

    const topPicks = sorted.slice(0, 5).map(s => ({
      id: s.team.id,
      name: s.team.name,
      pct: simsRun > 0 ? (s.champ / simsRun) * 100 : 0
    }));

    await firstValueFrom(this.http.post(`${this.api}/predictions`, {
      userName,
      championId: leader.team.id,
      championName: leader.team.name,
      championFlag: leader.team.flag,
      topPicks,
      simsRun
    }));
  }

  async saveSandboxSim(teamA: string, teamB: string, scoreA: number, scoreB: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/sandbox-sims`, {
      teamA,
      teamB,
      scoreA,
      scoreB,
      userName: this.getUserName()
    }));
  }

  async getLeaderboard(): Promise<LeaderboardResponse> {
    return firstValueFrom(
      this.http.get<LeaderboardResponse>(`${this.api}/leaderboard`)
    );
  }

  async getAdminPredictions(adminKey: string): Promise<UserPrediction[]> {
    return firstValueFrom(
      this.http.get<UserPrediction[]>(`${this.api}/admin/predictions`, {
        headers: { 'X-Admin-Key': adminKey }
      })
    );
  }

  async getAdminStats(adminKey: string): Promise<AdminStats> {
    return firstValueFrom(
      this.http.get<AdminStats>(`${this.api}/admin/stats`, {
        headers: { 'X-Admin-Key': adminKey }
      })
    );
  }
}
