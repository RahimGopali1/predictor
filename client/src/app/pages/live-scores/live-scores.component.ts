import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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

      <section class="card hero-card">
        <div class="hero-content">
          <div>
            <div class="hero-eyebrow">Live Match Feed</div>
            <div class="hero-title">World Cup score updates with real-time momentum.</div>
            <p class="hero-copy">Follow every fixture from kickoff to final whistle, with match status, live clock, and score momentum in one place.</p>
          </div>
          <div class="hero-pill-row">
            <span class="hero-pill">Live scores</span>
            <span class="hero-pill">Match status</span>
            <span class="hero-pill">Fast refresh</span>
          </div>
        </div>
      </section>

      <section *ngIf="liveMatches$ | async as matches" class="stats-row">
        <div class="stat-card">
          <div class="stat-label">TOTAL MATCHES</div>
          <div class="stat-value">{{ matches.length || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">MATCHES LIVE</div>
          <div class="stat-value">{{ matches.filter(isLive).length || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">MATCHES FINISHED</div>
          <div class="stat-value">{{ matches.filter(isFinished).length || 0 }}</div>
        </div>
      </section>

      <div *ngIf="!(liveMatches$ | async)?.length" class="empty-state-card">
        <div class="empty-state-copy">No matches are currently available. Check back during tournament days for live score updates.</div>
      </div>

      <div *ngIf="liveMatches$ | async as matches" class="matches-grid">
        <div *ngFor="let match of matches" class="match-card" [routerLink]="['/live/match', match.id]" style="cursor:pointer;">
          <div class="match-card-header">
            <div>
              <div class="meta-label">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
              <div class="match-title">{{ match.home.displayName }} vs {{ match.away.displayName }}</div>
            </div>
            <div [ngClass]="isLive(match) ? 'status-pill status-live' : 'status-pill status-other'">
              <span *ngIf="isLive(match)" class="pulse-dot"></span>
              {{ isLive(match) ? 'LIVE' : (isFinished(match) ? 'FT' : 'SCHEDULED') }}
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
              <div class="score-status">{{ isLive(match) ? match.displayClock : (isFinished(match) ? 'FINAL' : (match.kickoff ? (match.kickoff | date:'shortTime') : 'TBD')) }}</div>
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
    </div>
  `,
  styles: [
    ".hero-card { padding: 28px; margin-bottom: 28px; }",
    ".hero-content { display: grid; gap: 18px; }",
    "@media (min-width: 900px) { .hero-content { grid-template-columns: 1fr auto; align-items: center; } }",
    ".hero-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }",
    ".hero-title { font-family: var(--font-head); font-size: 2rem; color: var(--text); margin-bottom: 14px; }",
    ".hero-copy { color: var(--text2); line-height: 1.75; max-width: 620px; }",
    ".hero-pill-row { display: flex; flex-wrap: wrap; gap: 12px; }",
    ".hero-pill { display: inline-flex; align-items: center; padding: 10px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }",
    ".stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }",
    ".stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; }",
    ".stat-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; }",
    ".stat-value { font-family: var(--font-head); font-size: 2.2rem; color: var(--text); }",
    ".empty-state-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px 24px; text-align: center; margin-bottom: 24px; }",
    ".empty-state-copy { color: var(--text2); font-size: 0.95rem; }",
    ".matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }",
    ".match-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; transition: all 0.2s ease; }",
    ".match-card:hover { transform: translateY(-3px); border-color: var(--gold); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.16); }",
    ".match-card-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }",
    ".meta-label { color: var(--text3); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }",
    ".match-title { font-family: var(--font-head); font-size: 1.1rem; line-height: 1.2; color: var(--text); }",
    ".status-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; color: var(--text2); background: var(--card2); }",
    ".status-live { color: var(--green); border-color: rgba(45, 206, 110, 0.2); }",
    ".status-other { color: var(--text3); border-color: rgba(141, 168, 144, 0.2); }",
    ".pulse-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--green); display: inline-block; }",
    ".score-section { display: grid; gap: 16px; margin-bottom: 18px; }",
    "@media (min-width: 900px) { .score-section { grid-template-columns: 1fr auto 1fr; align-items: center; } }",
    ".team-block { display: flex; flex-direction: column; align-items: center; gap: 10px; }",
    ".team-avatar { width: 58px; height: 58px; border-radius: 16px; background: var(--bg3); border: 1px solid var(--border); display: grid; place-items: center; }",
    ".team-avatar img { width: 36px; height: 36px; object-fit: contain; }",
    ".team-label { font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text3); }",
    ".team-name { font-size: 0.95rem; color: var(--text2); text-align: center; }",
    ".score-panel { text-align: center; }",
    ".score-display { font-family: var(--font-head); font-size: 3rem; color: var(--gold); line-height: 1; }",
    ".score-separator { color: var(--text3); margin: 0 10px; }",
    ".score-status { margin-top: 8px; color: var(--text3); font-family: var(--font-mono); font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; }",
    ".time-info { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 12px; text-align: center; font-family: var(--font-mono); color: var(--text2); font-size: 0.9rem; }"
  ]
})
export class LiveScoresComponent {
  private readonly espn = inject(EspnMatchService);
  readonly liveMatches$ = this.espn.liveMatches$;
  readonly isLive = (match: EspnMatch): boolean => ['STATUS_FIRST_HALF', 'STATUS_HALFTIME', 'STATUS_SECOND_HALF', 'STATUS_IN_PROGRESS', 'STATUS_ACTIVE'].includes(match.statusName);
  readonly isFinished = (match: EspnMatch): boolean => match.statusName === 'STATUS_FULL_TIME' || match.statusName === 'STATUS_FINAL';
}
