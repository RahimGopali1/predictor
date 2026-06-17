import { AsyncPipe, CommonModule, NgForOf, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EspnMatchService, EspnMatch } from '../../services/espn-match.service';
import { FixtureService } from '../../services/fixture.service';
import { TeamService } from '../../services/team.service';
import { TournamentFixture } from '../../models/fixture.model';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { combineLatest, map, from, shareReplay } from 'rxjs';

interface TournamentDisplayMatch {
  id: number;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
  stage: string;
  group?: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  finished: boolean;
}

@Component({
  selector: 'app-live-match-center',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIf, NgForOf, AsyncPipe],
  template: `
    <div class="wrap">
      <header>
        <div>
          <div class="header-eyebrow">Live Match Center</div>
          <h1>2026 World Cup Live Tracker</h1>
          <p class="header-sub">Live scores, stats, odds, and event timelines from ESPN's unofficial World Cup API — refreshed every minute.</p>
        </div>
        <div class="header-controls">
          <a routerLink="/" class="btn-sm">← Back to Predictor</a>
        </div>
      </header>

      <section class="hero-panel card">
        <div class="hero-copy">
          <div class="hero-eyebrow">Live match coverage</div>
          <div class="hero-title">Premium World Cup tracking with expert-grade match visuals</div>
          <p class="hero-summary">Follow every stadium moment, possession swing, market line, and scoring event with a cleaner page layout built for world-class sport updates.</p>
        </div>
        <div class="hero-pill-row">
          <span class="hero-pill">Minute refresh</span>
          <span class="hero-pill">Event ticker</span>
          <span class="hero-pill">Market odds</span>
          <span class="hero-pill">Possession flow</span>
        </div>
      </section>

      <!-- ESPN Data Sections (when available) -->
      <ng-container *ngIf="showEspn$ | async">
        <section class="card overview-card">
          <div class="overview-head">
            <div>
              <div class="meta-label">Snapshot</div>
              <div class="card-title">Match volume</div>
            </div>
            <p class="card-sub">Real-time distribution of live, completed, and upcoming World Cup fixtures.</p>
          </div>
          <div class="stats-row">
            <ng-container *ngIf="liveMatches$ | async as liveMatches">
              <div class="stat-card">
                <div class="stat-label">LIVE MATCHES</div>
                <div class="stat-value">{{ liveMatches.length }}</div>
              </div>
            </ng-container>
            <ng-container *ngIf="completedMatches$ | async as completedMatches">
              <div class="stat-card">
                <div class="stat-label">COMPLETED</div>
                <div class="stat-value">{{ completedMatches.length }}</div>
              </div>
            </ng-container>
            <ng-container *ngIf="upcomingMatches$ | async as upcomingMatches">
              <div class="stat-card">
                <div class="stat-label">UPCOMING</div>
                <div class="stat-value">{{ upcomingMatches.length }}</div>
              </div>
            </ng-container>
          </div>
        </section>

        <ng-container *ngIf="selectedMatch$ | async as selected">
          <section class="card">
            <div class="card-title">Match Detail: {{ selected.name }}</div>
            <div class="match-list">
              <article class="match-card match-live">
                <div class="match-card-header">
                  <div>
                    <div class="meta-label">{{ selected.groupLabel || selected.seasonSlug }}</div>
                    <div class="match-title">{{ selected.name }}</div>
                    <div class="meta-label">{{ selected.venue }}</div>
                  </div>
                  <div class="status-pill status-live">
                    <span class="pulse-dot"></span>
                    LIVE · {{ selected.displayClock || selected.shortDetail }}
                  </div>
                </div>
                <div class="match-grid">
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="selected.home.logo" [src]="selected.home.logo" [alt]="selected.home.abbreviation" class="team-logo" />
                      <div>
                        <div class="meta-label">{{ selected.home.displayName }}</div>
                        <div class="team-score">{{ selected.home.score }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="selected.away.logo" [src]="selected.away.logo" [alt]="selected.away.abbreviation" class="team-logo" />
                      <div>
                        <div class="meta-label">{{ selected.away.displayName }}</div>
                        <div class="team-score">{{ selected.away.score }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="event-panel">
                    <div class="event-header">
                      <span>Live event ticker</span>
                      <span>Last 3 events</span>
                    </div>
                    <div class="event-list">
                      <div *ngFor="let event of getLiveEventTicker(selected)" class="event-item">
                        <div class="event-headline">
                          <span>{{ event.playerName || event.teamAbbreviation || event.teamName }}</span>
                          <span class="meta-label">{{ event.minute }}</span>
                        </div>
                        <div class="event-text">{{ event.text }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </ng-container>

        <section *ngIf="liveMatches$ | async as liveMatches">
          <div *ngIf="liveMatches.length > 0">
            <div class="card">
              <div class="card-title">Live Matches</div>
              <p class="card-sub">Current games in progress with live clock, recent event ticker, and up-to-the-minute odds.</p>
            </div>
            <div class="match-list">
              <article *ngFor="let match of liveMatches" class="match-card match-live">
                <div class="match-card-header">
                  <div>
                    <div class="meta-label">{{ match.groupLabel || match.seasonSlug }}</div>
                    <div class="match-title">{{ match.name }}</div>
                    <div class="meta-label">{{ match.venue }}</div>
                  </div>
                  <div class="status-pill status-live">
                    <span class="pulse-dot"></span>
                    LIVE · {{ match.displayClock || match.shortDetail }}
                  </div>
                </div>
                <div class="match-grid">
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="match.home.logo" [src]="match.home.logo" [alt]="match.home.abbreviation" class="team-logo" />
                      <div>
                        <div class="meta-label">{{ match.home.displayName }}</div>
                        <div class="team-score">{{ match.home.score }}</div>
                      </div>
                    </div>
                    <div class="stat-label">Form: <span [innerHTML]="renderForm(match.home.form)"></span></div>
                  </div>
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="match.away.logo" [src]="match.away.logo" [alt]="match.away.abbreviation" class="team-logo" />
                      <div>
                        <div class="meta-label">{{ match.away.displayName }}</div>
                        <div class="team-score">{{ match.away.score }}</div>
                      </div>
                    </div>
                    <div class="stat-label">Form: <span [innerHTML]="renderForm(match.away.form)"></span></div>
                  </div>
                  <div class="event-panel">
                    <div class="event-header">
                      <span>Live event ticker</span>
                      <span>Last 3 events</span>
                    </div>
                    <div class="event-list">
                      <div *ngFor="let event of getLiveEventTicker(match)" class="event-item">
                        <div class="event-headline">
                          <span>{{ event.playerName || event.teamAbbreviation || event.teamName }}</span>
                          <span class="meta-label">{{ event.minute }}</span>
                        </div>
                        <div class="event-text">{{ event.text }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="stats-grid">
                  <div class="stats-card">
                    <div class="meta-label">Possession</div>
                    <div class="stat-value">{{ match.home.statistics.possessionPct || 0 }}% vs {{ match.away.statistics.possessionPct || 0 }}%</div>
                    <div class="possession-bar">
                      <div class="possession-fill" [style.width.%]="getPossessionWidth(match.home.statistics.possessionPct, match.away.statistics.possessionPct)"></div>
                    </div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Shots on target</div>
                    <div class="stat-value">{{ match.home.statistics.shotsOnTarget || 0 }} - {{ match.away.statistics.shotsOnTarget || 0 }}</div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Odds</div>
                    <div class="stat-text">Home: {{ match.odds?.homeMoneyline || 'N/A' }}</div>
                    <div class="stat-text">Draw: {{ match.odds?.drawMoneyline || match.odds?.drawOddsBackup || 'N/A' }}</div>
                    <div class="stat-text">Away: {{ match.odds?.awayMoneyline || 'N/A' }}</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section *ngIf="completedMatches$ | async as completedMatches">
          <div *ngIf="completedMatches.length > 0">
            <div class="card">
              <div class="card-title">Completed Matches</div>
              <p class="card-sub">Finished matches, final stats, recap headlines, and venue details.</p>
            </div>
            <div class="match-list">
              <article *ngFor="let match of completedMatches" class="match-card match-completed">
                <div class="match-card-header">
                  <div>
                    <div class="meta-label">{{ match.groupLabel || match.seasonSlug }}</div>
                    <div class="match-title">{{ match.name }}</div>
                    <div class="meta-label">{{ match.venue }}</div>
                  </div>
                  <div class="status-pill">
                    FT · {{ match.home.score }} – {{ match.away.score }}
                  </div>
                </div>
                <div class="completed-grid">
                  <div class="stats-card">
                    <div class="meta-label">Goals</div>
                    <div class="stat-value">{{ match.home.score }} – {{ match.away.score }}</div>
                    <div class="stat-text">{{ buildScorerText(match, match.home.teamId) }}</div>
                    <div class="stat-text">{{ buildScorerText(match, match.away.teamId) }}</div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Cards</div>
                    <div class="stat-value">🟨 {{ countCards(match, 'yellow') }} · 🟥 {{ countCards(match, 'red') }}</div>
                    <div class="stat-text">{{ match.recapHeadline || match.recapShortHeadline || 'No recap available.' }}</div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Match stats</div>
                    <div class="stat-text">Possession: {{ match.home.statistics.possessionPct || 0 }} / {{ match.away.statistics.possessionPct || 0 }}%</div>
                    <div class="stat-text">Shots: {{ match.home.statistics.totalShots || 0 }} / {{ match.away.statistics.totalShots || 0 }}</div>
                    <div class="stat-text">SOT: {{ match.home.statistics.shotsOnTarget || 0 }} / {{ match.away.statistics.shotsOnTarget || 0 }}</div>
                    <div class="stat-text">Corners: {{ match.home.statistics.wonCorners || 0 }} / {{ match.away.statistics.wonCorners || 0 }}</div>
                    <div class="stat-text">Fouls: {{ match.home.statistics.foulsCommitted || 0 }} / {{ match.away.statistics.foulsCommitted || 0 }}</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section *ngIf="upcomingMatches$ | async as upcomingMatches">
          <div *ngIf="upcomingMatches.length > 0">
            <div class="card mt-3">
              <div class="card-title">Upcoming Matches</div>
              <p class="card-sub">Kickoff times, broadcast channels, odds, venue, and team form for the next fixtures.</p>
            </div>
            <div class="match-list">
              <article *ngFor="let match of upcomingMatches" class="match-card match-upcoming">
                <div class="match-card-header">
                  <div>
                    <div class="meta-label">{{ match.groupLabel || match.seasonSlug }}</div>
                    <div class="match-title">{{ match.name }}</div>
                    <div class="meta-label">{{ match.venue }}</div>
                  </div>
                  <div class="status-pill">Kickoff: {{ formatKickoff(match.kickoffIso) }}</div>
                </div>
                <div class="upcoming-grid">
                  <div class="stats-card">
                    <div class="meta-label">Teams</div>
                    <div class="team-row">
                      <div>
                        <div class="team-label">{{ match.home.displayName }}</div>
                        <div class="stat-text">{{ match.home.record }}</div>
                      </div>
                      <div>
                        <div class="team-label">{{ match.away.displayName }}</div>
                        <div class="stat-text">{{ match.away.record }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Odds</div>
                    <div class="stat-text">Home: {{ match.odds?.homeMoneyline || 'N/A' }}</div>
                    <div class="stat-text">Draw: {{ match.odds?.drawMoneyline || match.odds?.drawOddsBackup || 'N/A' }}</div>
                    <div class="stat-text">Away: {{ match.odds?.awayMoneyline || 'N/A' }}</div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Broadcasts</div>
                    <div class="broadcast-list">
                      <span *ngFor="let channel of match.broadcasts" class="badge-light">{{ channel }}</span>
                    </div>
                  </div>
                </div>
                <div class="form-grid">
                  <div class="stats-card">
                    <div class="meta-label">Home form</div>
                    <div class="form-badges" [innerHTML]="renderFormBadges(match.home.form)"></div>
                  </div>
                  <div class="stats-card">
                    <div class="meta-label">Away form</div>
                    <div class="form-badges" [innerHTML]="renderFormBadges(match.away.form)"></div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </ng-container>

      <!-- Tournament Data Fallback (when ESPN has no data) -->
      <ng-container *ngIf="!(showEspn$ | async)">
        <!-- Tournament Results (completed matches) -->
        <section *ngIf="tournamentPast$ | async as past" class="card overview-card">
          <div class="overview-head">
            <div>
              <div class="meta-label">Tournament Data</div>
              <div class="card-title">Match Results</div>
            </div>
            <p class="card-sub">
              {{ past.totalFinished }} of {{ past.totalMatches }} matches finished
              <span *ngIf="past.champion"> · Champion: <strong>{{ past.champion }}</strong> 🏆</span>
            </p>
          </div>
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-label">FINISHED</div>
              <div class="stat-value">{{ past.totalFinished }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">UPCOMING</div>
              <div class="stat-value">{{ past.totalMatches - past.totalFinished }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">STAGES</div>
              <div class="stat-value">{{ past.stages }}</div>
            </div>
          </div>
        </section>

        <!-- Recent Completed Matches -->
        <section *ngIf="tournamentRecent$ | async as recent" class="section-block">
          <div class="section-head">
            <div class="section-title">Recent Results</div>
            <span class="section-badge">{{ recent.length }} match{{ recent.length === 1 ? '' : 'es' }}</span>
          </div>
          <div class="matches-grid">
            <div *ngFor="let match of recent" class="match-card match-completed-card">
              <div class="match-card-header">
                <div>
                  <div class="meta-label">{{ match.stage }}{{ match.group ? ' · Group ' + match.group : '' }}</div>
                  <div class="match-title">{{ match.homeName }} vs {{ match.awayName }}</div>
                </div>
                <div class="status-pill status-completed" *ngIf="match.finished">FT</div>
              </div>
              <div class="score-section">
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.homeFlag" [src]="match.homeFlag" [alt]="match.homeId" />
                    <span *ngIf="!match.homeFlag">{{ match.homeId }}</span>
                  </div>
                  <div class="team-label">{{ match.homeId }}</div>
                  <div class="team-name">{{ match.homeName }}</div>
                </div>
                <div class="score-panel">
                  <div class="score-display">{{ match.homeScore }}<span class="score-separator">–</span>{{ match.awayScore }}</div>
                  <div class="score-status">FINAL</div>
                </div>
                <div class="team-block">
                  <div class="team-avatar">
                    <img *ngIf="match.awayFlag" [src]="match.awayFlag" [alt]="match.awayId" />
                    <span *ngIf="!match.awayFlag">{{ match.awayId }}</span>
                  </div>
                  <div class="team-label">{{ match.awayId }}</div>
                  <div class="team-name">{{ match.awayName }}</div>
                </div>
              </div>
              <div class="time-info">{{ match.date }} · {{ match.time }} · {{ match.venue }}, {{ match.city }}</div>
            </div>
          </div>
        </section>

        <!-- Upcoming Matches (if any remain) -->
        <section *ngIf="tournamentUpcoming$ | async as upcoming" class="section-block">
          <div *ngIf="upcoming.length > 0">
            <div class="section-head">
              <div class="section-title">Upcoming Matches</div>
              <span class="section-badge">{{ upcoming.length }} match{{ upcoming.length === 1 ? '' : 'es' }}</span>
            </div>
            <div class="matches-grid">
              <div *ngFor="let match of upcoming" class="match-card match-upcoming-card">
                <div class="match-card-header">
                  <div>
                    <div class="meta-label">{{ match.stage }}{{ match.group ? ' · Group ' + match.group : '' }}</div>
                    <div class="match-title">{{ match.homeName }} vs {{ match.awayName }}</div>
                  </div>
                  <div class="status-pill status-upcoming">SCHEDULED</div>
                </div>
                <div class="score-section">
                  <div class="team-block">
                    <div class="team-avatar">
                      <img *ngIf="match.homeFlag" [src]="match.homeFlag" [alt]="match.homeId" />
                      <span *ngIf="!match.homeFlag">{{ match.homeId }}</span>
                    </div>
                    <div class="team-label">{{ match.homeId }}</div>
                    <div class="team-name">{{ match.homeName }}</div>
                  </div>
                  <div class="score-panel">
                    <div class="score-display score-placeholder">–</div>
                    <div class="score-status">{{ match.date }} · {{ match.time }}</div>
                  </div>
                  <div class="team-block">
                    <div class="team-avatar">
                      <img *ngIf="match.awayFlag" [src]="match.awayFlag" [alt]="match.awayId" />
                      <span *ngIf="!match.awayFlag">{{ match.awayId }}</span>
                    </div>
                    <div class="team-label">{{ match.awayId }}</div>
                    <div class="team-name">{{ match.awayName }}</div>
                  </div>
                </div>
                <div class="time-info">{{ match.venue }}, {{ match.city }}</div>
              </div>
            </div>
          </div>
        </section>
      </ng-container>
    </div>
  `,
  styles: [
    ".hero-panel { display: grid; gap: 18px; padding: 30px 28px; margin-bottom: 24px; background: var(--hero-gradient); border: 1px solid rgba(232,184,75,0.16); box-shadow: 0 28px 70px rgba(0, 0, 0, 0.35); }",
    ".hero-copy { display: grid; gap: 14px; }",
    ".hero-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }",
    ".hero-title { font-family: var(--font-head); font-size: clamp(2rem, 2.6vw, 3rem); color: var(--text); line-height: 1.05; margin: 0; }",
    ".hero-summary { color: var(--text2); max-width: 720px; line-height: 1.75; font-size: 0.98rem; }",
    ".hero-pill-row { display: flex; flex-wrap: wrap; gap: 10px; }",
    ".hero-pill { display: inline-flex; align-items: center; justify-content: center; padding: 11px 16px; border-radius: 999px; background: var(--badge-light-bg); border: 1px solid rgba(77,159,255,0.18); color: var(--text); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }",
    ".overview-card { padding: 28px 26px; margin-bottom: 24px; background: var(--card2); border: 1px solid var(--border); box-shadow: 0 22px 48px rgba(0, 0, 0, 0.32); }",
    ".overview-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 18px; }",
    ".overview-head .card-title { margin-bottom: 6px; }",
    ".stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 22px; }",
    ".stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 20px 22px; text-align: center; }",
    ".stat-label { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text2); margin-bottom: 10px; }",
    ".stat-value { font-size: 2.8rem; font-weight: 800; color: var(--gold); }",
    ".section-block { margin-bottom: 32px; }",
    ".section-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }",
    ".section-title { font-family: var(--font-head); font-size: 1.3rem; color: var(--text); }",
    ".section-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px; background: var(--card2); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; }",
    ".matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }",
    ".match-card { position: relative; overflow: hidden; background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 28px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35); transition: transform 0.25s ease, box-shadow 0.25s ease; }",
    ".match-card::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, var(--hover-bg), transparent 35%); opacity: 0; transition: opacity 0.25s ease; }",
    ".match-card:hover { transform: translateY(-3px); box-shadow: 0 32px 90px rgba(0, 0, 0, 0.45); }",
    ".match-card:hover::before { opacity: 1; }",
    ".match-card.match-live { border-color: rgba(45,206,110,0.25); }",
    ".match-card.match-completed { border-color: rgba(148,163,184,0.25); }",
    ".match-card.match-upcoming { border-color: rgba(77,159,255,0.25); }",
    ".match-card-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 18px; align-items: flex-start; }",
    ".match-card-header > div { min-width: 0; }",
    ".match-title { font-family: var(--font-head); font-size: 1.4rem; color: var(--text); margin: 8px 0 4px; }",
    ".status-pill { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--border); background: var(--badge-light-bg); color: var(--text2); font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; }",
    ".status-live { color: var(--green); border-color: rgba(45,206,110,0.35); background: rgba(45,206,110,0.12); }",
    ".status-completed { color: var(--text2); border-color: rgba(148,163,184,0.2); }",
    ".status-upcoming { color: var(--blue); border-color: rgba(77, 159, 255, 0.2); background: rgba(77, 159, 255, 0.08); }",
    ".pulse-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--green); display: inline-block; box-shadow: 0 0 0 4px rgba(45,206,110,0.14); }",
    ".match-completed-card { border-color: rgba(148, 163, 184, 0.2); }",
    ".match-upcoming-card { border-color: rgba(77, 159, 255, 0.2); background: linear-gradient(180deg, rgba(77, 159, 255, 0.03), transparent); }",
    ".match-grid { display: grid; gap: 20px; margin-top: 24px; }",
    "@media (min-width: 900px) { .match-grid { grid-template-columns: 1fr 1fr 1.25fr; } }",
    ".team-panel { display: grid; gap: 14px; }",
    ".team-card { display: flex; gap: 16px; align-items: center; background: var(--card2); border: 1px solid var(--border); border-radius: 18px; padding: 18px; }",
    ".team-logo { width: 56px; height: 56px; border-radius: 18px; object-fit: contain; background: var(--bg2); padding: 10px; }",
    ".team-score { font-size: 3rem; font-weight: 800; color: var(--gold); }",
    ".event-panel { background: var(--card); border: 1px solid var(--border); border-radius: 22px; padding: 22px; }",
    ".event-header { display: flex; justify-content: space-between; gap: 12px; font-size: 0.82rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 18px; }",
    ".event-list { display: grid; gap: 12px; }",
    ".event-item { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }",
    ".event-headline { display: flex; justify-content: space-between; gap: 12px; align-items: start; font-weight: 700; color: var(--text); }",
    ".event-text { margin-top: 8px; color: var(--text2); font-size: 0.95rem; line-height: 1.6; }",
    ".stats-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; }",
    ".stat-text { margin-top: 10px; color: var(--text2); font-size: 0.95rem; }",
    ".possession-bar { background: var(--possession-bar-bg); border-radius: 999px; height: 12px; overflow: hidden; margin-top: 12px; }",
    ".possession-fill { height: 100%; background: linear-gradient(90deg, rgba(45,206,110,0.82), rgba(232,184,75,0.82)); border-radius: 999px; }",
    ".completed-grid { display: grid; gap: 20px; margin-top: 22px; }",
    "@media (min-width: 900px) { .completed-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
    ".upcoming-grid { display: grid; gap: 20px; margin-top: 22px; }",
    "@media (min-width: 900px) { .upcoming-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
    ".team-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }",
    ".team-label { font-weight: 700; color: var(--text); }",
    ".broadcast-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }",
    ".badge-light { display: inline-flex; align-items: center; padding: 10px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--badge-light-bg); color: var(--gold); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }",
    ".form-grid { display: grid; gap: 20px; margin-top: 20px; }",
    "@media (min-width: 900px) { .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }",
    ".form-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }",
    ".form-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 8px 12px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-right: 6px; margin-bottom: 6px; }",
    ".form-badge-win { background: rgba(45,206,110,0.16); color: var(--green); }",
    ".form-badge-draw { background: rgba(148,163,184,0.16); color: var(--text2); }",
    ".form-badge-loss { background: var(--red-dim); color: var(--red); }",
    ".form-badge-neutral { background: rgba(247,247,251,0.95); color: var(--text2); }",
    // Fallback match card styles
    ".score-section { display: grid; gap: 16px; margin-bottom: 18px; }",
    "@media (min-width: 900px) { .score-section { grid-template-columns: 1fr auto 1fr; align-items: center; } }",
    ".team-block { display: flex; flex-direction: column; align-items: center; gap: 10px; }",
    ".team-avatar { width: 58px; height: 58px; border-radius: 16px; background: var(--bg3); border: 1px solid var(--border); display: grid; place-items: center; }",
    ".team-avatar img { width: 36px; height: 36px; object-fit: contain; }",
    ".team-name { font-size: 0.95rem; color: var(--text2); text-align: center; }",
    ".score-panel { text-align: center; }",
    ".score-display { font-family: var(--font-head); font-size: 3rem; color: var(--gold); line-height: 1; }",
    ".score-placeholder { color: var(--text3); font-size: 2.4rem; }",
    ".score-separator { color: var(--text3); margin: 0 10px; }",
    ".score-status { margin-top: 8px; color: var(--text3); font-family: var(--font-mono); font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; }",
    ".time-info { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 12px; text-align: center; font-family: var(--font-mono); color: var(--text2); font-size: 0.9rem; }",
    ".meta-label { color: var(--text3); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }",
    ".card-title { font-family: var(--font-head); font-size: 1.3rem; color: var(--text); margin-bottom: 4px; }",
    ".card-sub { color: var(--text2); font-size: 0.9rem; line-height: 1.5; }"
  ]
})
export class LiveMatchCenterComponent {
  private readonly espnMatchService = inject(EspnMatchService);
  private readonly fixtureService = inject(FixtureService);
  private readonly teamService = inject(TeamService);
  private readonly route = inject(ActivatedRoute);

  // ESPN data
  readonly liveMatches$ = this.espnMatchService.liveMatches$;
  readonly completedMatches$ = this.espnMatchService.completedMatches$;
  readonly upcomingMatches$ = this.espnMatchService.upcomingMatches$;

  // Show ESPN sections only when there's data
  readonly showEspn$ = combineLatest([this.liveMatches$, this.completedMatches$, this.upcomingMatches$]).pipe(
    map(([live, completed, upcoming]) => live.length > 0 || completed.length > 0 || upcoming.length > 0)
  );

  // ESPN selected match
  readonly selectedMatch$ = combineLatest([this.liveMatches$, this.completedMatches$, this.upcomingMatches$, this.route.paramMap]).pipe(
    map(([live, completed, upcoming, params]) => {
      const id = params.get('id');
      if (!id) return null;
      const all = [...live, ...completed, ...upcoming];
      return all.find(m => m.id === id) ?? null;
    })
  );

  // Tournament fallback data
  readonly tournamentStatus$ = from(this.fixtureService.loadStatus()).pipe(
    shareReplay(1)
  );

  readonly tournamentPast$ = this.tournamentStatus$.pipe(
    map(status => {
      const fixtures = (status.allFixtures || []) as TournamentFixture[];
      const totalFinished = fixtures.filter(f => f.finished).length;
      const stages = new Set(fixtures.filter(f => f.finished).map(f => f.stage).filter(Boolean)).size;
      return {
        totalFinished,
        totalMatches: fixtures.length,
        stages,
        champion: status.champion ? this.teamService.findTeam(status.champion)?.name || status.champion : null
      };
    })
  );

  readonly tournamentRecent$ = this.tournamentStatus$.pipe(
    map(status => {
      const fixtures = (status.allFixtures || []) as TournamentFixture[];
      const finished = fixtures.filter(f => f.finished).sort((a, b) => b.id - a.id).slice(0, 12);
      return this.mapFixtures(finished);
    })
  );

  readonly tournamentUpcoming$ = this.tournamentStatus$.pipe(
    map(status => {
      const fixtures = (status.allFixtures || []) as TournamentFixture[];
      const upcoming = fixtures.filter(f => !f.finished && f.home !== 'TBD' && f.away !== 'TBD').slice(0, 8);
      return this.mapFixtures(upcoming);
    })
  );

  private mapFixtures(fixtures: TournamentFixture[]): TournamentDisplayMatch[] {
    return fixtures.map(f => {
      const home = this.teamService.findTeam(f.home);
      const away = this.teamService.findTeam(f.away);
      return {
        id: f.id,
        homeId: f.home,
        awayId: f.away,
        homeName: home?.name || f.homeTeam || f.home,
        awayName: away?.name || f.awayTeam || f.away,
        homeFlag: home?.flag || '',
        awayFlag: away?.flag || '',
        homeScore: f.homeScore ?? null,
        awayScore: f.awayScore ?? null,
        stage: f.stage,
        group: f.group,
        date: f.date,
        time: f.time,
        venue: f.venue,
        city: f.city,
        finished: f.finished
      };
    });
  }

  // ---- ESPN helper methods (unchanged) ----

  getLiveEventTicker(match: EspnMatch) {
    return this.espnMatchService.getLiveEventTicker(match);
  }

  renderForm(form: string): string {
    if (!form) return 'N/A';
    return form.split('').map((letter) => {
      const className = letter === 'W' ? 'form-badge form-badge-win' : letter === 'D' ? 'form-badge form-badge-draw' : 'form-badge form-badge-loss';
      return `<span class="${className}">${letter}</span>`;
    }).join(' ');
  }

  renderFormBadges(form: string): string {
    if (!form) return '<span class="form-badge form-badge-neutral">No form</span>';
    return form.split('').map((letter) => {
      const className = letter === 'W' ? 'form-badge form-badge-win' : letter === 'D' ? 'form-badge form-badge-draw' : 'form-badge form-badge-loss';
      return `<span class="${className}">${letter}</span>`;
    }).join(' ');
  }

  formatKickoff(kickoffIso: string): string {
    if (!kickoffIso) return 'TBD';
    const date = new Date(kickoffIso);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  getPossessionWidth(homePct?: number, awayPct?: number): number {
    const home = homePct || 0;
    const away = awayPct || 0;
    const total = home + away;
    return total === 0 ? 50 : Math.round((home / total) * 100);
  }

  buildScorerText(match: EspnMatch, teamId: string): string {
    const items = match.details.filter((event) => event.teamId === teamId && event.text?.toLowerCase().includes('goal'));
    if (!items.length) return 'No scorers';
    return items.map((event) => `${event.playerName || event.teamAbbreviation} ${event.minute}`).join(', ');
  }

  countCards(match: EspnMatch, type: 'yellow' | 'red'): number {
    return match.details.filter((event) => {
      if (type === 'yellow') return event.yellowCard;
      return event.redCard;
    }).length;
  }
}
