import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PredictionTrackerService } from '../../services/prediction-tracker.service';

@Component({
  selector: 'app-prediction-tracker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wrap">
      <div class="card tracker-header">
        <div class="tracker-title-group">
          <div>
            <div class="header-eyebrow">ESPN World Cup comparison</div>
            <h1>Prediction Tracker</h1>
            <p class="card-sub">Track your Dixon-Coles score forecasts against ESPN World Cup results, with live status and completed match accuracy.</p>
          </div>
          <div class="tracker-actions">
            <a routerLink="/" class="btn-sm">← Back to Predictor</a>
          </div>
        </div>
      </div>

      <div class="tracker-dashboard">
        <ng-container *ngIf="summary$ | async as summary">
          <div class="card tracker-summary-card">
            <div class="card-title">Completed</div>
            <div class="tracker-summary-value">{{ summary.completed }}</div>
            <p class="card-sub">Matches with final scores</p>
          </div>
          <div class="card tracker-summary-card">
            <div class="card-title">Correct</div>
            <div class="tracker-summary-value tracker-summary-correct">{{ summary.correct }}</div>
            <p class="card-sub">Forecasts matched the final outcome</p>
          </div>
          <div class="card tracker-summary-card">
            <div class="card-title">Accuracy</div>
            <div class="tracker-summary-value tracker-summary-accuracy">{{ summary.accuracy }}%</div>
            <p class="card-sub">Completed predictions only</p>
          </div>
        </ng-container>
      </div>

      <div class="tracker-match-list">
        <div *ngIf="trackedMatches$ | async as matches">
          <div *ngIf="matches.length; else emptyState">
            <article *ngFor="let match of matches" class="card tracker-match">
              <div class="tracker-match-header">
                <div>
                  <div class="card-title">{{ match.homeTeam.abbreviation }} vs {{ match.awayTeam.abbreviation }}</div>
                  <div class="tracker-match-title">{{ match.homeTeam.name }} vs {{ match.awayTeam.name }}</div>
                </div>
                <div class="tracker-meta">
                  <span class="badge" [ngClass]="statusClass(match.status)">{{ match.status }}</span>
                  <div class="card-sub">{{ match.matchTime }}</div>
                </div>
              </div>

              <div class="tracker-match-grid">
                <div class="tracker-team-block">
                  <div class="tracker-team-card">
                    <div class="tracker-team-logo">
                      <img *ngIf="match.homeTeam.logo" [src]="match.homeTeam.logo" [alt]="match.homeTeam.abbreviation" />
                      <span *ngIf="!match.homeTeam.logo">{{ match.homeTeam.abbreviation }}</span>
                    </div>
                    <div>
                      <div class="tracker-label">Predicted</div>
                      <div class="tracker-score tracker-predicted">{{ match.predictedHome }} – {{ match.predictedAway }}</div>
                    </div>
                  </div>
                  <div class="tracker-team-name">{{ match.homeTeam.name }}</div>
                </div>

                <div class="tracker-team-block tracker-center-block">
                  <div class="tracker-label">Actual</div>
                  <div class="tracker-score tracker-actual">{{ match.actualHome !== null ? match.actualHome + ' – ' + match.actualAway : '—' }}</div>
                  <div class="tracker-text">{{ match.displayStatus }}</div>
                </div>

                <div class="tracker-team-block tracker-center-block">
                  <div class="tracker-label">Outcome</div>
                  <div class="tracker-score tracker-outcome">{{ outcomeLabel(match.predictedOutcome) }}</div>
                  <div class="tracker-text">{{ match.status === 'LIVE' ? 'Live updating' : 'Updated every minute' }}</div>
                </div>
              </div>

              <div class="tracker-goals">
                <div class="tracker-goals-header">
                  <div>Goal timeline</div>
                  <div>{{ match.goals.length }} events</div>
                </div>

                <div *ngIf="match.goals.length; else noGoals" class="tracker-goal-list">
                  <div *ngFor="let goal of match.goals" class="tracker-goal-item">
                    <div>
                      <div class="tracker-goal-player">{{ goal.scorer }}</div>
                      <div class="tracker-goal-type">{{ goal.type }}</div>
                    </div>
                    <div class="tracker-goal-minute">{{ goal.minute }}</div>
                  </div>
                </div>
                <ng-template #noGoals>
                  <div class="tracker-no-goals">No goal event data available yet.</div>
                </ng-template>
              </div>
            </article>
          </div>
          <ng-template #emptyState>
            <div class="card tracker-empty-state">
              <div class="tracker-empty-title">No matched predictions found.</div>
              <div>Make sure your predicted matches are saved in localStorage with the expected team abbreviations.</div>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [
    ".tracker-header { padding: 32px; margin-top: 32px; }",
    ".tracker-title-group { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px; align-items: flex-start; }",
    ".tracker-actions { display: flex; align-items: center; gap: 12px; }",
    ".tracker-dashboard { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 24px; }",
    ".tracker-summary-card { padding: 24px; }",
    ".tracker-summary-value { font-size: 3rem; font-weight: 700; color: var(--text); margin: 12px 0; }",
    ".tracker-summary-correct { color: var(--green); }",
    ".tracker-summary-accuracy { color: var(--blue); }",
    ".tracker-match-list { margin-top: 28px; display: grid; gap: 20px; }",
    ".tracker-match { padding: 26px 26px 22px; }",
    ".tracker-match-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; align-items: flex-start; }",
    ".tracker-match-title { font-size: 1.2rem; font-weight: 700; color: var(--text); margin-top: 6px; }",
    ".tracker-meta { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }",
    ".tracker-match-grid { display: grid; gap: 16px; margin-top: 20px; }",
    "@media (min-width: 900px) { .tracker-match-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
    ".tracker-team-block { background: var(--bg3); border: 1px solid var(--border); border-radius: 16px; padding: 18px; }",
    ".tracker-center-block { text-align: center; }",
    ".tracker-team-card { display: flex; gap: 14px; align-items: center; margin-bottom: 10px; }",
    ".tracker-team-logo { width: 54px; height: 54px; border-radius: 16px; background: var(--card); display: grid; place-items: center; }",
    ".tracker-team-logo img { width: 32px; height: 32px; object-fit: contain; }",
    ".tracker-label { font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text3); }",
    ".tracker-score { font-size: 2rem; font-weight: 700; color: var(--text); margin-top: 8px; }",
    ".tracker-text { margin-top: 10px; color: var(--text2); font-size: 0.95rem; }",
    ".tracker-goals { background: var(--bg3); border: 1px solid var(--border); border-radius: 16px; padding: 18px; margin-top: 22px; }",
    ".tracker-goals-header { display: flex; justify-content: space-between; gap: 12px; font-size: 0.82rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text3); font-weight: 700; }",
    ".tracker-goal-list { display: grid; gap: 12px; margin-top: 14px; }",
    ".tracker-goal-item { display: flex; justify-content: space-between; gap: 16px; padding: 14px 16px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; }",
    ".tracker-goal-player { font-size: 0.95rem; font-weight: 700; color: var(--text); }",
    ".tracker-goal-type { margin-top: 4px; font-size: 0.8rem; color: var(--text2); }",
    ".tracker-goal-minute { font-size: 0.82rem; font-weight: 700; color: var(--text3); min-width: 60px; text-align: right; }",
    ".tracker-no-goals { padding: 22px 18px; text-align: center; color: var(--text2); }",
    ".tracker-empty-state { padding: 42px; text-align: center; color: var(--text2); }",
    ".tracker-empty-title { font-size: 1.15rem; font-weight: 700; color: var(--text); margin-bottom: 10px; }"
  ]
})
export class PredictionTrackerComponent {
  private readonly trackerService = inject(PredictionTrackerService);
  readonly trackedMatches$ = this.trackerService.trackedMatches$;
  readonly summary$ = this.trackerService.summary$;

  statusClass(status: string): string {
    return {
      CORRECT: 'badge-green',
      WRONG: 'badge-red',
      LIVE: 'badge-gold',
      PENDING: 'badge-purple'
    }[status as keyof Record<string, string>] ?? 'badge-purple';
  }

  outcomeLabel(outcome: 'W' | 'D' | 'L'): string {
    return outcome === 'W' ? 'Win' : outcome === 'D' ? 'Draw' : 'Loss';
  }
}
