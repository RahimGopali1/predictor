import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { EspnMatchService, EspnMatch } from '../../services/espn-match.service';

@Component({
  selector: 'app-live-scores',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wrap">
      <header>
        <div>
          <div class="header-eyebrow">ESPN Real-Time API · Updated Every Minute</div>
          <h1>LIVE<br><span>SCORES</span></h1>
          <p class="header-sub">Track all 2026 FIFA World Cup matches as they happen with real-time score updates.</p>
        </div>
        <div class="header-controls">
          <a routerLink="/" class="btn-sm" role="button">← BACK TO PREDICTOR</a>
        </div>
      </header>

      <section class="hero-card">
        <div>
          <div class="hero-eyebrow">Live Match Feed</div>
          <div class="hero-title">World Cup score updates with real-time momentum.</div>
          <p class="hero-summary">Follow every fixture from kickoff to final whistle, with match status, live clock, and score momentum in one place.</p>
        </div>
        <div class="hero-pill-row">
          <span class="hero-pill">Live scores</span>
          <span class="hero-pill">Match status</span>
          <span class="hero-pill">Fast refresh</span>
        </div>
      </section>

      <section *ngIf="allMatches$ | async as all" class="stats-row">
        <div class="stat-card">
          <div class="stat-label">TOTAL MATCHES</div>
          <div class="stat-value stat-value-gold">{{ all.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">LIVE</div>
          <div class="stat-value stat-value-gold">{{ all.filter(isLive).length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">COMPLETED</div>
          <div class="stat-value stat-value-gold">{{ all.filter(isFinished).length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">UPCOMING</div>
          <div class="stat-value stat-value-gold">{{ all.filter(isUpcoming).length }}</div>
        </div>
      </section>

      <ng-container *ngIf="status$ | async as status">
        <!-- Live Matches -->
        <section *ngIf="status.live.length > 0" class="section-block">
          <div class="section-head">
            <div class="section-title">Live Now</div>
            <span class="section-badge section-badge-live">
              <span class="pulse-dot"></span> {{ status.live.length }} match{{ status.live.length === 1 ? '' : 'es' }}
            </span>
          </div>
          <div class="matches-grid">
            <div *ngFor="let match of status.live" class="match-card match-card-live" [routerLink]="['/live/match', match.id]" style="cursor:pointer;">
              <div class="match-card-header">
                <div>
                  <div class="match-meta">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
                  <div class="match-title">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
                </div>
                <div class="status-pill status-pill-live">
                  <span class="pulse-dot"></span>
                  LIVE · {{ match.displayClock || match.shortDetail }}
                </div>
              </div>
              <div class="score-section">
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.home.logo" [src]="match.home.logo" [alt]="match.home.abbreviation" />
                    <span *ngIf="!match.home.logo">{{ match.home.abbreviation }}</span>
                  </div>
                  <div class="team-label">{{ match.home.abbreviation }}</div>
                  <div class="team-name">{{ match.home.displayName }}</div>
                </div>
                <div class="score-panel">
                  <div class="score-display">{{ match.home.score }}<span class="score-separator">–</span>{{ match.away.score }}</div>
                  <div class="score-status">{{ match.displayClock || match.shortDetail }}</div>
                </div>
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.away.logo" [src]="match.away.logo" [alt]="match.away.abbreviation" />
                    <span *ngIf="!match.away.logo">{{ match.away.abbreviation }}</span>
                  </div>
                  <div class="team-label">{{ match.away.abbreviation }}</div>
                  <div class="team-name">{{ match.away.displayName }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Completed Matches -->
        <section *ngIf="status.completed.length > 0" class="section-block">
          <div class="section-head">
            <div class="section-title">Completed</div>
            <span class="section-badge">{{ status.completed.length }} match{{ status.completed.length === 1 ? '' : 'es' }}</span>
          </div>
          <div class="matches-grid">
            <div *ngFor="let match of status.completed" class="match-card match-card-completed" [routerLink]="['/live/match', match.id]" style="cursor:pointer;">
              <div class="match-card-header">
                <div>
                  <div class="match-meta">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
                  <div class="match-title">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
                </div>
                <div class="status-pill status-pill-completed">FT</div>
              </div>
              <div class="score-section">
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.home.logo" [src]="match.home.logo" [alt]="match.home.abbreviation" />
                    <span *ngIf="!match.home.logo">{{ match.home.abbreviation }}</span>
                  </div>
                  <div class="team-label">{{ match.home.abbreviation }}</div>
                  <div class="team-name">{{ match.home.displayName }}</div>
                </div>
                <div class="score-panel">
                  <div class="score-display">{{ match.home.score }}<span class="score-separator">–</span>{{ match.away.score }}</div>
                  <div class="score-status">FINAL</div>
                </div>
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.away.logo" [src]="match.away.logo" [alt]="match.away.abbreviation" />
                    <span *ngIf="!match.away.logo">{{ match.away.abbreviation }}</span>
                  </div>
                  <div class="team-label">{{ match.away.abbreviation }}</div>
                  <div class="team-name">{{ match.away.displayName }}</div>
                </div>
              </div>
              <div class="time-info">{{ match.kickoff ? (match.kickoff | date:'short') : '' }}</div>
            </div>
          </div>
        </section>

        <!-- Upcoming Matches -->
        <section *ngIf="status.upcoming.length > 0" class="section-block">
          <div class="section-head">
            <div class="section-title">Upcoming</div>
            <span class="section-badge">{{ status.upcoming.length }} match{{ status.upcoming.length === 1 ? '' : 'es' }}</span>
          </div>
          <div class="matches-grid">
            <div *ngFor="let match of status.upcoming" class="match-card match-card-upcoming" [routerLink]="['/live/match', match.id]" style="cursor:pointer;">
              <div class="match-card-header">
                <div>
                  <div class="match-meta">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
                  <div class="match-title">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
                </div>
                <div class="status-pill status-pill-upcoming">SCHEDULED</div>
              </div>
              <div class="score-section">
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.home.logo" [src]="match.home.logo" [alt]="match.home.abbreviation" />
                    <span *ngIf="!match.home.logo">{{ match.home.abbreviation }}</span>
                  </div>
                  <div class="team-label">{{ match.home.abbreviation }}</div>
                  <div class="team-name">{{ match.home.displayName }}</div>
                </div>
                <div class="score-panel">
                  <div class="score-display score-placeholder">–</div>
                  <div class="score-status">{{ match.kickoff ? (match.kickoff | date:'shortTime') : 'TBD' }}</div>
                </div>
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.away.logo" [src]="match.away.logo" [alt]="match.away.abbreviation" />
                    <span *ngIf="!match.away.logo">{{ match.away.abbreviation }}</span>
                  </div>
                  <div class="team-label">{{ match.away.abbreviation }}</div>
                  <div class="team-name">{{ match.away.displayName }}</div>
                </div>
              </div>
              <div class="time-info">{{ match.kickoff ? (match.kickoff | date:'short') : '' }}</div>
            </div>
          </div>
        </section>

        <!-- Empty State -->
        <div *ngIf="status.live.length === 0 && status.completed.length === 0 && status.upcoming.length === 0" class="empty-state-card">
          <div class="empty-state-copy">No matches are currently available. Check back during tournament days for live score updates.</div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    ".score-panel { text-align: center; }"
  ]
})
export class LiveScoresComponent {
  private readonly espn = inject(EspnMatchService);
  readonly liveMatches$ = this.espn.liveMatches$;
  readonly completedMatches$ = this.espn.completedMatches$;
  readonly upcomingMatches$ = this.espn.upcomingMatches$;

  readonly allMatches$ = this.espn.allMatches$;

  readonly status$ = combineLatest([this.liveMatches$, this.completedMatches$, this.upcomingMatches$]).pipe(
    map(([live, completed, upcoming]) => ({ live, completed, upcoming }))
  );

  readonly isLive = (match: EspnMatch): boolean =>
    ['STATUS_FIRST_HALF', 'STATUS_HALFTIME', 'STATUS_SECOND_HALF', 'STATUS_IN_PROGRESS', 'STATUS_ACTIVE'].includes(match.statusName);

  readonly isFinished = (match: EspnMatch): boolean =>
    match.statusName === 'STATUS_FULL_TIME' || match.statusName === 'STATUS_FINAL';

  readonly isUpcoming = (match: EspnMatch): boolean =>
    match.statusName === 'STATUS_SCHEDULED' || match.statusName === 'STATUS_PRE';
}
