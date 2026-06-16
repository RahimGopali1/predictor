import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, timer } from 'rxjs';

export interface PredictedMatch {
  homeTeam: string;
  awayTeam: string;
  predictedHome: number;
  predictedAway: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
}

export interface PredictionGoal {
  scorer: string;
  minute: string;
  type: string;
}

export type PredictionStatus = 'CORRECT' | 'WRONG' | 'LIVE' | 'PENDING';

export interface TrackedMatch {
  id: string;
  homeTeam: {
    abbreviation: string;
    name: string;
    logo: string;
  };
  awayTeam: {
    abbreviation: string;
    name: string;
    logo: string;
  };
  matchTime: string;
  predictedHome: number;
  predictedAway: number;
  actualHome: number | null;
  actualAway: number | null;
  predictedOutcome: 'W' | 'D' | 'L';
  actualOutcome: 'W' | 'D' | 'L' | null;
  status: PredictionStatus;
  displayStatus: string;
  goals: PredictionGoal[];
}

export interface PredictionTrackerSummary {
  correct: number;
  completed: number;
  accuracy: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionTrackerService {
  private readonly http = inject(HttpClient);
  private readonly espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
  private readonly storedPredictions = this.loadPredictedMatches();

  readonly trackedMatches$: Observable<TrackedMatch[]> = timer(0, 60000).pipe(
    switchMap(() => this.http.get<any>(this.espnUrl).pipe(
      map((response) => this.mapResponse(response)),
      catchError((error) => {
        console.error('PredictionTrackerService error', error);
        return of([] as TrackedMatch[]);
      })
    ))
  );

  readonly summary$: Observable<PredictionTrackerSummary> = this.trackedMatches$.pipe(
    map((matches) => {
      const completed = matches.filter((match) => match.actualOutcome !== null);
      const correct = completed.filter((match) => match.status === 'CORRECT').length;
      const accuracy = completed.length ? Math.round((correct / completed.length) * 100) : 0;
      return { correct, completed: completed.length, accuracy };
    })
  );

  private loadPredictedMatches(): PredictedMatch[] {
    try {
      const raw = localStorage.getItem('wc_predicted_matches');
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore parsing errors and return empty list
    }
    return [];
  }

  private mapResponse(response: any): TrackedMatch[] {
    const events = Array.isArray(response?.events) ? response.events : [];
    return events
      .map((event: any) => this.mapEvent(event))
      .filter((match: TrackedMatch | null): match is TrackedMatch => match !== null);
  }

  private mapEvent(event: any): TrackedMatch | null {
    const competition = event?.competitions?.[0];
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
    const homeCompetitor = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
    const awayCompetitor = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1] ?? competitors[0];

    if (!homeCompetitor || !awayCompetitor) {
      return null;
    }

    const homeAbbreviation = String(homeCompetitor?.team?.abbreviation ?? '').trim();
    const awayAbbreviation = String(awayCompetitor?.team?.abbreviation ?? '').trim();
    const predictionMatch = this.findPrediction(homeAbbreviation, awayAbbreviation);

    if (!predictionMatch) {
      return null;
    }

    const predictedHome = predictionMatch.reversed ? predictionMatch.predictedMatch.predictedAway : predictionMatch.predictedMatch.predictedHome;
    const predictedAway = predictionMatch.reversed ? predictionMatch.predictedMatch.predictedHome : predictionMatch.predictedMatch.predictedAway;
    const predictedOutcome = this.pickOutcome(predictedHome, predictedAway);

    const homeScore = Number(homeCompetitor.score ?? 0);
    const awayScore = Number(awayCompetitor.score ?? 0);

    const statusType = event?.status?.type;
    const statusName = String(statusType?.name ?? '').toUpperCase();
    const shortDetail = String(statusType?.shortDetail ?? statusType?.detail ?? '').trim();
    const isFullTime = statusName.includes('FULL_TIME') || statusName.includes('FINAL') || statusName.includes('POST');
    const isInProgress = statusName.includes('IN_PROGRESS') || statusName.includes('ACTIVE') || statusName.includes('LIVE');
    const actualOutcome = isFullTime ? this.pickOutcome(homeScore, awayScore) : null;
    const status: PredictionStatus = isFullTime
      ? (actualOutcome === predictedOutcome ? 'CORRECT' : 'WRONG')
      : isInProgress
        ? 'LIVE'
        : 'PENDING';

    const kickoff = event?.date ? new Date(event.date) : null;
    const matchTime = kickoff instanceof Date && !Number.isNaN(kickoff.getTime())
      ? kickoff.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
      : '';

    return {
      id: String(event?.id ?? `${homeAbbreviation}-${awayAbbreviation}`),
      homeTeam: {
        abbreviation: homeAbbreviation,
        name: String(homeCompetitor?.team?.displayName ?? homeCompetitor?.team?.name ?? homeAbbreviation),
        logo: String(homeCompetitor?.team?.logo ?? '')
      },
      awayTeam: {
        abbreviation: awayAbbreviation,
        name: String(awayCompetitor?.team?.displayName ?? awayCompetitor?.team?.name ?? awayAbbreviation),
        logo: String(awayCompetitor?.team?.logo ?? '')
      },
      matchTime,
      predictedHome,
      predictedAway,
      actualHome: isFullTime || isInProgress ? homeScore : null,
      actualAway: isFullTime || isInProgress ? awayScore : null,
      predictedOutcome,
      actualOutcome,
      status,
      displayStatus: shortDetail || statusName || 'TBD',
      goals: this.mapGoals(competition?.details)
    };
  }

  private findPrediction(homeAbbreviation: string, awayAbbreviation: string): { predictedMatch: PredictedMatch; reversed: boolean } | null {
    const exact = this.storedPredictions.find((candidate) => candidate.homeTeam === homeAbbreviation && candidate.awayTeam === awayAbbreviation);
    if (exact) {
      return { predictedMatch: exact, reversed: false };
    }
    const reversed = this.storedPredictions.find((candidate) => candidate.homeTeam === awayAbbreviation && candidate.awayTeam === homeAbbreviation);
    if (reversed) {
      return { predictedMatch: reversed, reversed: true };
    }
    return null;
  }

  private pickOutcome(home: number, away: number): 'W' | 'D' | 'L' {
    if (home > away) return 'W';
    if (home < away) return 'L';
    return 'D';
  }

  private mapGoals(details: any): PredictionGoal[] {
    if (!Array.isArray(details)) {
      return [];
    }
    return details
      .map((detail: any) => {
        const scorer = String(detail?.scorer?.displayName ?? detail?.scorer?.fullName ?? detail?.athlete?.displayName ?? detail?.scorer ?? '').trim();
        const minute = String(detail?.minute ?? detail?.clock ?? detail?.shortDetail ?? detail?.detail ?? '').trim();
        const type = String(detail?.type ?? detail?.detail ?? '').trim();
        return { scorer: scorer || 'Unknown', minute: minute || '0', type: type || 'Goal' };
      })
      .filter((goal) => !!goal.scorer);
  }
}
