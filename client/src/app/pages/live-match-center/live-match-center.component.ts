import { AsyncPipe, CommonModule, NgForOf, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EspnMatchService, EspnMatch } from '../../services/espn-match.service';
import { FixtureService } from '../../services/fixture.service';
import { TeamService } from '../../services/team.service';
import { TournamentFixture } from '../../models/fixture.model';
import { ActivatedRoute } from '@angular/router';
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
  imports: [CommonModule, NgIf, NgForOf, AsyncPipe],
  template: `
    <div class="wrap">
      <header>
        <div>
          <div class="header-eyebrow">Live Match Center</div>
          <h1>LIVE<br><span>SCORES</span></h1>
          <p class="header-sub">Live scores, stats, odds, and event timelines from ESPN's unofficial World Cup API — refreshed every minute.</p>
        </div>
      </header>

      <section class="hero-card">
        <div>
          <div class="hero-eyebrow">Live match coverage</div>
          <div class="hero-title">Premium World Cup tracking with expert-grade match visuals</div>
          <p class="hero-summary">Follow every stadium moment, possession swing, market line, and scoring event with a cleaner page layout built for world-class sport updates.</p>
        </div>
        <div class="hero-meta">
          <span class="hero-meta-item">Minute refresh</span>
          <span class="hero-meta-item">Event ticker</span>
          <span class="hero-meta-item">Market odds</span>
          <span class="hero-meta-item">Possession flow</span>
        </div>
      </section>

      <!-- ESPN Data Sections (when available) -->
      <ng-container *ngIf="showEspn$ | async">
        <section class="card">
          <div class="overview-head">
            <div>
              <div class="match-meta">Snapshot</div>
              <div class="card-title" style="font-size:1.3rem;">Match volume</div>
            </div>
            <p class="card-sub" style="margin-bottom:0;">Real-time distribution of live, completed, and upcoming World Cup fixtures.</p>
          </div>
          <div class="stats-row">
            <ng-container *ngIf="liveMatches$ | async as liveMatches">
              <div class="stat-card">
                <div class="stat-label">LIVE MATCHES</div>
                <div class="stat-value stat-value-gold">{{ liveMatches.length }}</div>
              </div>
            </ng-container>
            <ng-container *ngIf="completedMatches$ | async as completedMatches">
              <div class="stat-card">
                <div class="stat-label">COMPLETED</div>
                <div class="stat-value stat-value-gold">{{ completedMatches.length }}</div>
              </div>
            </ng-container>
            <ng-container *ngIf="upcomingMatches$ | async as upcomingMatches">
              <div class="stat-card">
                <div class="stat-label">UPCOMING</div>
                <div class="stat-value stat-value-gold">{{ upcomingMatches.length }}</div>
              </div>
            </ng-container>
          </div>
        </section>

        <ng-container *ngIf="selectedMatch$ | async as selected">
          <section class="card">
            <div class="card-title">Match Detail: {{ selected.name }}</div>
            <div class="match-list">
              <article class="match-card match-card-live">
                <div class="match-card-header">
                  <div>
                    <div class="match-meta">{{ selected.groupLabel || selected.seasonSlug }}</div>
                    <div class="match-title">{{ selected.name }}</div>
                    <div class="match-meta">{{ selected.venue }}</div>
                  </div>
                  <div class="status-pill status-pill-live">
                    <span class="pulse-dot"></span>
                    LIVE · {{ selected.displayClock || selected.shortDetail }}
                  </div>
                </div>
                <div class="match-grid">
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="selected.home.logo" [src]="selected.home.logo" [alt]="selected.home.abbreviation" class="team-logo" />
                      <div>
                        <div class="match-meta">{{ selected.home.displayName }}</div>
                        <div class="team-score">{{ selected.home.score }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="selected.away.logo" [src]="selected.away.logo" [alt]="selected.away.abbreviation" class="team-logo" />
                      <div>
                        <div class="match-meta">{{ selected.away.displayName }}</div>
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
              <div class="card-title" style="font-size:1.3rem;">Live Matches</div>
              <p class="card-sub">Current games in progress with live clock, recent event ticker, and up-to-the-minute odds.</p>
            </div>
            <div class="match-list">
              <article *ngFor="let match of liveMatches" class="match-card match-card-live">
                <div class="match-card-header">
                  <div>
                    <div class="match-meta">{{ match.groupLabel || match.seasonSlug }}</div>
                    <div class="match-title">{{ match.name }}</div>
                    <div class="match-meta">{{ match.venue }}</div>
                  </div>
                  <div class="status-pill status-pill-live">
                    <span class="pulse-dot"></span>
                    LIVE · {{ match.displayClock || match.shortDetail }}
                  </div>
                </div>
                <div class="match-grid">
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="match.home.logo" [src]="match.home.logo" [alt]="match.home.abbreviation" class="team-logo" />
                      <div>
                        <div class="match-meta">{{ match.home.displayName }}</div>
                        <div class="team-score">{{ match.home.score }}</div>
                      </div>
                    </div>
                    <div class="stat-label">Form: <span [innerHTML]="renderForm(match.home.form)"></span></div>
                  </div>
                  <div class="team-panel">
                    <div class="team-card">
                      <img *ngIf="match.away.logo" [src]="match.away.logo" [alt]="match.away.abbreviation" class="team-logo" />
                      <div>
                        <div class="match-meta">{{ match.away.displayName }}</div>
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
              <div class="card-title" style="font-size:1.3rem;">Completed Matches</div>
              <p class="card-sub">Finished matches, final stats, recap headlines, and venue details.</p>
            </div>
            <div class="match-list">
              <article *ngFor="let match of completedMatches" class="match-card match-card-completed">
                <div class="match-card-header">
                  <div>
                    <div class="match-meta">{{ match.groupLabel || match.seasonSlug }}</div>
                    <div class="match-title">{{ match.name }}</div>
                    <div class="match-meta">{{ match.venue }}</div>
                  </div>
                  <div class="status-pill status-pill-completed">
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
              <div class="card-title" style="font-size:1.3rem;">Upcoming Matches</div>
              <p class="card-sub">Kickoff times, broadcast channels, odds, venue, and team form for the next fixtures.</p>
            </div>
            <div class="match-list">
              <article *ngFor="let match of upcomingMatches" class="match-card match-card-upcoming">
                <div class="match-card-header">
                  <div>
                    <div class="match-meta">{{ match.groupLabel || match.seasonSlug }}</div>
                    <div class="match-title">{{ match.name }}</div>
                    <div class="match-meta">{{ match.venue }}</div>
                  </div>
                  <div class="status-pill status-pill-upcoming">Kickoff: {{ formatKickoff(match.kickoffIso) }}</div>
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
                    <div class="match-meta">Home form</div>
                    <div class="form-badges" [innerHTML]="renderFormBadges(match.home.form)"></div>
                  </div>
                  <div class="stats-card">
                    <div class="match-meta">Away form</div>
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
        <section *ngIf="tournamentPast$ | async as past" class="card">
          <div class="overview-head">
            <div>
              <div class="match-meta">Tournament Data</div>
              <div class="card-title" style="font-size:1.3rem;">Match Results</div>
            </div>
            <p class="card-sub" style="margin-bottom:0;">
              {{ past.totalFinished }} of {{ past.totalMatches }} matches finished
              <span *ngIf="past.champion"> · Champion: <strong>{{ past.champion }}</strong> 🏆</span>
            </p>
          </div>
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-label">FINISHED</div>
              <div class="stat-value stat-value-gold">{{ past.totalFinished }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">UPCOMING</div>
              <div class="stat-value stat-value-gold">{{ past.totalMatches - past.totalFinished }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">STAGES</div>
              <div class="stat-value stat-value-gold">{{ past.stages }}</div>
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
            <div *ngFor="let match of recent" class="match-card match-card-completed">
              <div class="match-card-header">
                <div>
                  <div class="match-meta">{{ match.stage }}{{ match.group ? ' · Group ' + match.group : '' }}</div>
                  <div class="match-title">{{ match.homeName }} vs {{ match.awayName }}</div>
                </div>
                <div class="status-pill status-pill-completed" *ngIf="match.finished">FT</div>
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
              <div *ngFor="let match of upcoming" class="match-card match-card-upcoming">
                <div class="match-card-header">
                  <div>
                    <div class="match-meta">{{ match.stage }}{{ match.group ? ' · Group ' + match.group : '' }}</div>
                    <div class="match-title">{{ match.homeName }} vs {{ match.awayName }}</div>
                  </div>
                  <div class="status-pill status-pill-upcoming">SCHEDULED</div>
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
    // Component-specific overrides for standardized layout
    ".overview-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 18px; }",
    ".overview-head .card-title { margin-bottom: 6px; }",
    ".match-card-header > div { min-width: 0; }",
    ".match-grid { display: grid; gap: 20px; margin-top: 24px; }",
    "@media (min-width: 900px) { .match-grid { grid-template-columns: 1fr 1fr 1.25fr; } }",
    ".team-panel { display: grid; gap: 14px; }",
    ".team-card { display: flex; gap: 16px; align-items: center; background: var(--card2); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; }",
    ".team-logo { width: 56px; height: 56px; border-radius: 18px; object-fit: contain; background: var(--bg2); padding: 10px; }",
    ".team-score { font-size: 3rem; font-weight: 800; color: var(--gold); }",
    ".event-panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 22px; }",
    ".event-header { display: flex; justify-content: space-between; gap: 12px; font-size: 0.82rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 18px; }",
    ".event-list { display: grid; gap: 12px; }",
    ".event-item { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }",
    ".event-headline { display: flex; justify-content: space-between; gap: 12px; align-items: start; font-weight: 700; color: var(--text); }",
    ".event-text { margin-top: 8px; color: var(--text2); font-size: 0.95rem; line-height: 1.6; }",
    ".stats-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; }",
    ".stat-text { margin-top: 10px; color: var(--text2); font-size: 0.95rem; }",
    ".possession-bar { background: var(--bg3); border-radius: 6px; height: 12px; overflow: hidden; margin-top: 12px; }",
    ".possession-fill { height: 100%; background: var(--gold); border-radius: 2px; }",
    ".completed-grid { display: grid; gap: 20px; margin-top: 22px; }",
    "@media (min-width: 900px) { .completed-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
    ".upcoming-grid { display: grid; gap: 20px; margin-top: 22px; }",
    "@media (min-width: 900px) { .upcoming-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
    ".team-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }",
    ".team-label { font-weight: 700; color: var(--text); }",
    ".broadcast-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }",
    ".form-grid { display: grid; gap: 20px; margin-top: 20px; }",
    "@media (min-width: 900px) { .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }",
    ".meta-label { color: var(--text3); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }",
    ".score-panel { text-align: center; }",
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
