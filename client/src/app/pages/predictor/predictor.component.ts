import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UpcomingMatch } from '../../models/fixture.model';
import { BracketData, MatchResult, SimResult, Team } from '../../models/team.model';
import { AstroService } from '../../services/astro.service';
import { FixtureService } from '../../services/fixture.service';
import { PredictionService } from '../../services/prediction.service';
import { SimulationService } from '../../services/simulation.service';
import { TeamService } from '../../services/team.service';
import { EspnMatchService, EspnMatch } from '../../services/espn-match.service';

interface SandboxFixture {
  id: number;
  date: string;
  time: string;
  group: string;
  home: string;
  away: string;
  venue: string;
  city: string;
}

interface CommEvent {
  min: number | string;
  type: string;
  side?: string;
  txt?: string;
}

interface MatchupCard {
  fixture: any;
  teamA: Team;
  teamB: Team;
  pw: number;
  pd: number;
  pl: number;
}

const OPENING_FIXTURES: SandboxFixture[] = [
  {
    id: 1,
    date: 'Jun 12, 2026',
    time: '3:00 PM ET',
    group: 'A',
    home: 'MEX',
    away: 'RSA',
    venue: 'Estadio Azteca',
    city: 'Mexico City',
  },
  {
    id: 2,
    date: 'Jun 12, 2026',
    time: '10:00 PM ET',
    group: 'A',
    home: 'KOR',
    away: 'CZE',
    venue: 'Estadio Akron',
    city: 'Guadalajara',
  },
  {
    id: 3,
    date: 'Jun 13, 2026',
    time: '3:00 PM ET',
    group: 'B',
    home: 'CAN',
    away: 'BIH',
    venue: 'BMO Field',
    city: 'Toronto',
  },
  {
    id: 4,
    date: 'Jun 13, 2026',
    time: '9:00 PM ET',
    group: 'D',
    home: 'USA',
    away: 'PAR',
    venue: 'SoFi Stadium',
    city: 'Los Angeles',
  },
  {
    id: 5,
    date: 'Jun 14, 2026',
    time: '9:00 PM ET',
    group: 'B',
    home: 'QAT',
    away: 'SUI',
    venue: "Levi's Stadium",
    city: 'San Francisco Bay Area',
  },
  {
    id: 6,
    date: 'Jun 15, 2026',
    time: '12:00 AM ET',
    group: 'D',
    home: 'AUS',
    away: 'TUR',
    venue: 'BC Place',
    city: 'Vancouver',
  },
  {
    id: 7,
    date: 'Jun 14, 2026',
    time: '6:00 PM ET',
    group: 'C',
    home: 'BRA',
    away: 'MAR',
    venue: 'MetLife Stadium',
    city: 'New York/New Jersey',
  },
  {
    id: 8,
    date: 'Jun 14, 2026',
    time: '3:00 PM ET',
    group: 'C',
    home: 'HAI',
    away: 'SCO',
    venue: 'Gillette Stadium',
    city: 'Boston',
  },
  {
    id: 9,
    date: 'Jun 15, 2026',
    time: '7:00 PM ET',
    group: 'E',
    home: 'GER',
    away: 'CUW',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    id: 10,
    date: 'Jun 15, 2026',
    time: '1:00 PM ET',
    group: 'F',
    home: 'NED',
    away: 'JPN',
    venue: 'AT&T Stadium',
    city: 'Dallas',
  },
  {
    id: 11,
    date: 'Jun 15, 2026',
    time: '4:00 PM ET',
    group: 'E',
    home: 'CIV',
    away: 'ECU',
    venue: 'Lincoln Financial Field',
    city: 'Philadelphia',
  },
  {
    id: 12,
    date: 'Jun 15, 2026',
    time: '10:00 PM ET',
    group: 'F',
    home: 'SWE',
    away: 'TUN',
    venue: 'Estadio BBVA',
    city: 'Monterrey',
  },
  {
    id: 13,
    date: 'Jun 15, 2026',
    time: '3:00 PM ET',
    group: 'G',
    home: 'BEL',
    away: 'EGY',
    venue: 'Lumen Field',
    city: 'Seattle',
  },
  {
    id: 14,
    date: 'Jun 15, 2026',
    time: '12:00 PM ET',
    group: 'G',
    home: 'IRN',
    away: 'NZL',
    venue: 'SoFi Stadium',
    city: 'Los Angeles',
  },
  {
    id: 15,
    date: 'Jun 15, 2026',
    time: '9:00 PM ET',
    group: 'H',
    home: 'KSA',
    away: 'URU',
    venue: 'Hard Rock Stadium',
    city: 'Miami',
  },
  {
    id: 16,
    date: 'Jun 15, 2026',
    time: '6:00 PM ET',
    group: 'H',
    home: 'ESP',
    away: 'CPV',
    venue: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
  },
  {
    id: 17,
    date: 'Jun 16, 2026',
    time: '3:00 PM ET',
    group: 'I',
    home: 'FRA',
    away: 'SEN',
    venue: 'MetLife Stadium',
    city: 'New York/New Jersey',
  },
  {
    id: 18,
    date: 'Jun 16, 2026',
    time: '6:00 PM ET',
    group: 'I',
    home: 'IRQ',
    away: 'NOR',
    venue: 'Gillette Stadium',
    city: 'Boston',
  },
  {
    id: 19,
    date: 'Jun 16, 2026',
    time: '9:00 PM ET',
    group: 'J',
    home: 'ARG',
    away: 'ALG',
    venue: 'Arrowhead Stadium',
    city: 'Kansas City',
  },
  {
    id: 20,
    date: 'Jun 17, 2026',
    time: '12:00 AM ET',
    group: 'J',
    home: 'AUT',
    away: 'JOR',
    venue: "Levi's Stadium",
    city: 'San Francisco Bay Area',
  },
  {
    id: 21,
    date: 'Jun 17, 2026',
    time: '7:00 PM ET',
    group: 'L',
    home: 'GHA',
    away: 'PAN',
    venue: 'BMO Field',
    city: 'Toronto',
  },
  {
    id: 22,
    date: 'Jun 17, 2026',
    time: '4:00 PM ET',
    group: 'L',
    home: 'ENG',
    away: 'CRO',
    venue: 'AT&T Stadium',
    city: 'Dallas',
  },
  {
    id: 23,
    date: 'Jun 17, 2026',
    time: '1:00 PM ET',
    group: 'K',
    home: 'POR',
    away: 'COD',
    venue: 'NRG Stadium',
    city: 'Houston',
  },
  {
    id: 24,
    date: 'Jun 17, 2026',
    time: '10:00 PM ET',
    group: 'K',
    home: 'UZB',
    away: 'COL',
    venue: 'Estadio Azteca',
    city: 'Mexico City',
  },
];

@Component({
  selector: 'app-predictor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './predictor.component.html',
  styles: [
    '.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }',
    '.stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; text-align: center; }',
    '.stat-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 4px; }',
    '.stat-value { font-family: var(--font-mono); font-size: 20px; font-weight: 600; color: var(--text); }',
    '.stat-live { color: var(--green); }',
    '.empty-state-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 12px; }',
    '.empty-state-copy { color: var(--text3); font-family: var(--font-mono); font-size: 12px; }',

    /* matches grid */
    '.matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 16px; }',
    '.match-card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 18px; cursor: pointer; overflow: hidden; transition: all .25s ease; }',
    ".match-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, var(--overlay-subtle), transparent); pointer-events: none; }",
    '.match-card:hover { transform: translateY(-4px); border-color: var(--gold); box-shadow: 0 10px 30px rgba(0,0,0,.25); }',
    '.match-card.upcoming-match-card { background: linear-gradient(135deg, rgba(77,159,255,.08), rgba(77,159,255,.02)); border-color: rgba(77,159,255,.25); }',
    '.match-card.upcoming-counter-card { background: rgba(77, 159, 255, 0.06); border-color: rgba(77, 159, 255, 0.3); }',
    '.match-card.upcoming-counter-card .score-section { flex-direction: column; align-items: flex-start; gap: 4px; padding: 4px 0; }',
    '.upcoming-count { font-family: var(--font-head); font-size: 28px; font-weight: 700; color: var(--blue); }',
    '.upcoming-note { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }',

    /* card header */
    '.match-card-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 18px; }',

    '.match-group { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',

    '.meta-label { display: none; }',
    '.match-title { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; }',

    /* status badges */
    '.status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .08em; flex-shrink: 0; }',

    '.status-live { background: var(--red-dim); color: var(--red); border: 1px solid var(--red-dim); }',

    '.status-other { background: var(--overlay-subtle); color: var(--text3); border: 1px solid var(--border); }',

    '.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); display: inline-block; animation: livePulse 1.2s infinite; }',

    '@keyframes livePulse { 0% { transform: scale(1); opacity: 1; } 70% { transform: scale(2); opacity: 0; } 100% { transform: scale(2); opacity: 0; } }',

    /* score layout */
    '.score-section { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin-bottom: 14px; }',
    '.score-team { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }',
    '.score-sep { font-family: var(--font-mono); font-size: 11px; color: var(--text3); padding: 0 8px; }',
    '.team-block { display: flex; flex-direction: column; align-items: center; justify-content: center; }',
    '.team-avatar { width: 56px; height: 56px; border-radius: 14px; background: var(--bg2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden; transition: all .2s ease; }',
    '.match-card:hover .team-avatar { border-color: rgba(255,255,255,.15); }',
    '.team-avatar img { width: 75%; height: 75%; object-fit: contain; }',
    '.team-label { margin-top: 8px; font-size: 13px; font-weight: 700; color: var(--text); }',
    '.team-name { display: none; }',
    '.score-panel { min-width: 120px; text-align: center; }',
    '.score-display { font-size: 36px; font-weight: 800; color: var(--text); line-height: 1; }',
    '.score-separator { margin: 0 6px; color: var(--text3); opacity: .6; }',
    '.score-status { margin-top: 8px; font-size: 11px; font-weight: 600; color: var(--gold); letter-spacing: .08em; text-transform: uppercase; }',
    '.time-info { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); text-align: center; font-size: 12px; color: var(--text3); }',

    /* sandbox panel */
    '.sandbox-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }',
    '.sandbox-title { font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: 0.02em; }',
    '.sandbox-sub { font-size: 11px; color: var(--text3); font-family: var(--font-mono); margin-top: 2px; }',
    '.fixture-count { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }',
    '.sandbox-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 12px; align-items: start; }',
    '.sandbox-left { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }',
    '.sandbox-right { display: flex; flex-direction: column; }',

    /* controls */
    '.ctrl-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }',
    '.team-trigger { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 13px; color: var(--text2); cursor: pointer; transition: border-color 0.15s, background 0.15s; }',
    '.team-trigger:hover, .team-trigger.open { border-color: var(--gold); background: var(--card2); }',
    '.trigger-arrow { font-size: 9px; color: var(--text3); transition: transform 0.2s; }',
    '.team-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--card2); border: 1px solid var(--border); border-radius: 6px; margin-top: 4px; z-index: 10; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }',
    '.team-search { width: 100%; padding: 7px 10px; background: var(--bg3); border: none; border-bottom: 1px solid var(--border); border-radius: 6px 6px 0 0; font-size: 12px; color: var(--text); font-family: var(--font-body); outline: none; }',
    '.team-list { max-height: 160px; overflow-y: auto; }',
    '.team-item { padding: 7px 10px; font-size: 12px; color: var(--text2); cursor: pointer; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; transition: background 0.1s; }',
    '.team-item:hover, .team-item.active { background: var(--gold-dim); color: var(--text); }',
    '.team-code { font-family: var(--font-mono); font-size: 10px; color: var(--text3); }',
    '.team-empty { padding: 12px; text-align: center; font-size: 12px; color: var(--text3); }',
    '.round-btns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }',
    '.btn-round { padding: 6px 0; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text2); cursor: pointer; transition: all 0.15s; text-align: center; }',
    '.btn-round:hover, .btn-round.active { border-color: var(--gold); background: var(--gold-dim); color: var(--gold); }',
    '.btn-simulate { width: 100%; padding: 9px 0; background: var(--gold); color: #0a0d0a; border: none; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.1em; cursor: pointer; transition: opacity 0.15s; margin-top: auto; }',
    '.btn-simulate:disabled { opacity: 0.35; cursor: not-allowed; }',
    '.btn-simulate:not(:disabled):hover { opacity: 0.88; }',
    '.waiting-notice { padding: 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; }',
    '.waiting-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }',
    '.waiting-msg { font-size: 12px; color: var(--text2); }',
    '.math-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }',

    /* commentary */
    '.commentary-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }',
    '.commentary-score { background: var(--card); border-bottom: 1px solid var(--border); padding: 16px 18px 12px; display: flex; align-items: center; justify-content: center; position: relative; }',
    '.match-status-wrap { position: absolute; top: 10px; right: 10px; }',
    '.status-badge { font-family: var(--font-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px; }',
    '.badge-live { background: var(--green-dim); color: var(--green); border: 1px solid rgba(45, 206, 110, 0.25); }',
    '.badge-ft { background: var(--bg3); color: var(--text2); border: 1px solid var(--border2); }',
    '.badge-upcoming { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(232, 184, 75, 0.25); }',
    '.score-flag { font-size: 28px; line-height: 1; }',
    '.score-side { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.08em; margin-top: 2px; opacity: 0.7; }',
    '.score-num { font-family: var(--font-mono); font-size: 32px; font-weight: 600; color: var(--gold); margin-top: 4px; line-height: 1; }',
    '.fixture-meta { padding: 7px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 11px; color: var(--text2); font-family: var(--font-mono); }',
    '.team-pill { padding: 5px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: 500; color: var(--text); background: var(--gold-dim); font-family: var(--font-mono); letter-spacing: 0.04em; }',
    '.commentary-feed { flex: 1; max-height: 200px; overflow-y: auto; padding: 6px 0; }',
    '.comm-empty { padding: 24px; text-align: center; color: var(--text3); font-size: 12px; font-family: var(--font-mono); }',
    '.ev-line { display: flex; gap: 8px; padding: 5px 14px; font-size: 12px; color: var(--text2); border-bottom: 1px solid var(--border); animation: slideIn 0.25s ease; }',
    '.ev-line:last-child { border-bottom: none; }',
    '.ev-goal { background: var(--gold-dim); color: var(--text); border-left: 2px solid var(--gold); }',
    '.ev-end { background: var(--green-dim); }',
    '.ev-min { font-family: var(--font-mono); font-size: 10px; color: var(--gold); min-width: 28px; padding-top: 1px; }',
    '@keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }',
    '.action-strip { padding: 8px 14px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; background: var(--card); }',
    '.btn-reset { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; background: none; border: 1px solid var(--border2); border-radius: 6px; color: var(--text2); padding: 5px 12px; cursor: pointer; transition: all 0.15s; }',
    '.btn-reset:hover { border-color: var(--gold); color: var(--gold); }',

    /* live section */
    '.live-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }',
    '.live-section-header { margin-bottom: 12px; }',
    /* winner highlight */
    '.team-block.winner .team-avatar { border-color: var(--green); box-shadow: 0 0 16px var(--green-dim); }',

    '.team-block.winner .team-label { color: var(--green); }',
    ".team-name { margin-top: 2px; font-size: 11px; color: var(--text3); text-align: center; max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",

    /* responsive */
    '@media (max-width: 768px) { .sandbox-grid { grid-template-columns: 1fr; } .stats-row { grid-template-columns: repeat(2, 1fr); } .matches-grid { grid-template-columns: 1fr; } }',
    /* responsive */
    '@media (max-width: 768px) { .matches-grid { grid-template-columns: 1fr; gap: 12px; } .match-card { padding: 16px; } .team-avatar { width: 48px; height: 48px; } .score-display { font-size: 30px; } .score-panel { min-width: 90px; } }',
  ],
})
export class PredictorComponent implements OnInit, OnDestroy {
  private readonly teamService = inject(TeamService);
  private readonly fixtureService = inject(FixtureService);
  private readonly simService = inject(SimulationService);
  private readonly astroService = inject(AstroService);
  private readonly predictionService = inject(PredictionService);
  private readonly espnMatchService = inject(EspnMatchService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly teams = this.teamService.teams;
  readonly recentMatches = this.teamService.recentMatches;
  readonly loading = this.teamService.loading;
  readonly syncSource = this.teamService.syncSource;
  readonly allMatches$ = this.espnMatchService.allMatches$;
  readonly liveMatches$ = this.espnMatchService.liveMatches$;
  readonly upcomingMatches$ = this.espnMatchService.upcomingMatches$;
  readonly completedMatches$ = this.espnMatchService.completedMatches$;

  currentStep = signal(1);
  subTab = signal<'ratings' | 'form'>('ratings');
  oddsTab = signal<'odds' | 'bracket' | 'compare' | 'matchups'>('odds');
  teamSearch = '';
  teamSearchInput = signal('');
  showTeamDropdown = signal(false);
  showMathBox = signal(false);

  selectedTeam = 'USA';
  selectedSandboxRound: 1 | 2 | 3 = 1;
  sbTeamA = 'USA';
  sbTeamB = 'PAR';
  upcomingMatch: UpcomingMatch | null = null;
  teamNextStatus: UpcomingMatch['teamStatus'] | null = null;
  statusMessage: string | null = null;
  readonly fixtureStatus = this.fixtureService.status;
  readonly fixtureSyncing = this.fixtureService.syncing;
  math = {
    eloA: '—',
    eloB: '—',
    hostA: '—',
    hostB: '—',
    formA: '—',
    formB: '—',
    gap: '—',
    la: '—',
    lb: '—',
    rho: '—',
    odds: '—',
  };
  sbNameA = '—';
  sbNameB = '—';
  sbFlagA = '🏳️';
  sbFlagB = '🏳️';
  sbScoreA = 0;
  sbScoreB = 0;
  commLines: { min: string; html: SafeHtml; cls: string }[] = [];
  playDisabled = false;

  simRunning = signal(false);
  simsRun = signal(0);
  simRes = signal<Record<string, SimResult>>({});
  modalBracket = signal<BracketData | null>(null);
  progPct = signal(0);
  simLeader = signal('—');
  simPct = signal('—');

  private commInterval: ReturnType<typeof setInterval> | null = null;
  private animFrame = 0;
  private bracketCounts: Record<string, number> = {};
  readonly Math = Math;

  ngOnInit(): void {
    void Promise.all([
      this.teamService.loadTeams(true),
      this.fixtureService.loadStatus(false),
    ]).then(() => {
      this.initSimState();
      // Set selectedTeam to the first upcoming match's home team
      const allTeams = this.teams();
      if (allTeams.length > 0) {
        const status = this.fixtureService.status();
        const upcomingFixture = status?.allFixtures?.find(
          (f: any) => !f.finished && f.home && f.home !== 'TBD' && f.away && f.away !== 'TBD',
        );
        if (upcomingFixture && upcomingFixture.home) {
          this.selectedTeam = upcomingFixture.home;
        } else if (allTeams.length > 0) {
          this.selectedTeam = allTeams[0].id;
        }
      }
      this.onTeamSelect();
    });
  }

  ngOnDestroy(): void {
    if (this.commInterval) clearInterval(this.commInterval);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  initSimState(): void {
    this.simRes.set(this.simService.initSimResults(this.teams()));
  }

  toggleTeamDropdown(): void {
    const isOpening = !this.showTeamDropdown();
    this.showTeamDropdown.set(isOpening);
    if (isOpening) {
      setTimeout(() => {
        const searchInput = document.querySelector('.team-search-input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }, 0);
    }
  }

  goStep(n: number): void {
    this.currentStep.set(n);
    if (n === 3) void this.fixtureService.loadStatus(false).then(() => this.onTeamSelect());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showSubTab(name: 'ratings' | 'form'): void {
    this.subTab.set(name);
  }

  showTab(name: 'odds' | 'bracket' | 'compare' | 'matchups'): void {
    this.oddsTab.set(name);
  }

  filteredTeams(): Team[] {
    const q = this.teamSearch.toLowerCase();
    return [...this.teams()]
      .sort((a, b) => b.elo - a.elo)
      .filter((t) => !q || t.name.toLowerCase().includes(q));
  }

  sortedTeamsByName(): Team[] {
    return [...this.teams()].sort((a, b) => a.name.localeCompare(b.name));
  }

  searchFilteredTeams(): Team[] {
    const q = this.teamSearchInput().toLowerCase();
    return this.sortedTeamsByName().filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
    );
  }

  onTeamSelect(): void {
    let match = this.getSandboxFixtureMatch(this.selectedTeam, this.selectedSandboxRound);
    const next = this.fixtureService.getTeamNext(this.selectedTeam);
    if (!match) {
      match = this.fixtureService.getUpcomingMatch(this.selectedTeam);
    }
    if (
      !match &&
      next?.match &&
      next.match.home &&
      next.match.away &&
      next.match.home !== 'TBD' &&
      next.match.away !== 'TBD'
    ) {
      const isHome = next.match.home === this.selectedTeam;
      const opponentId = isHome ? next.match.away : next.match.home;
      match = {
        fixture: next.match,
        selectedId: this.selectedTeam,
        opponentId,
        isHome,
        teamStatus: next.status,
        statusMessage: next.message,
      };
    }
    if (!match) {
      match = this.getOpeningFixtureMatch(this.selectedTeam);
    }

    this.upcomingMatch = match;
    this.teamNextStatus = match ? 'active' : (next?.status ?? null);
    this.statusMessage = match?.statusMessage ?? next?.message ?? null;

    if (match?.fixture) {
      match = this.withNepalTime(match);
      match = this.mergeStatusFixture(match);
      this.upcomingMatch = match;
      this.resetSandboxMatch();
      this.sbTeamA = match.fixture.home;
      this.sbTeamB = match.fixture.away;
      this.sbNameA = this.teamService.findTeam(this.sbTeamA)?.name ?? this.sbTeamA ?? 'TBD';
      this.sbFlagA = this.teamService.findTeam(this.sbTeamA)?.flag ?? '🏳️';
      this.sbNameB = this.teamService.findTeam(this.sbTeamB)?.name ?? this.sbTeamB ?? 'TBD';
      this.sbFlagB = this.teamService.findTeam(this.sbTeamB)?.flag ?? '🏳️';
      if (match.fixture.finished) {
        this.statusMessage = `Final score ${match.fixture.homeScore ?? 0}–${match.fixture.awayScore ?? 0}`;
      }
      this.updateMath();
    } else {
      this.sbNameA = this.selectedTeamObj()?.name ?? '—';
      this.sbNameB =
        this.teamNextStatus === 'champion'
          ? 'Champion'
          : this.teamNextStatus === 'eliminated'
            ? 'No fixture'
            : 'Awaiting opponent';
      this.sbFlagA = this.selectedTeamObj()?.flag ?? '🏳️';
      this.sbFlagB = '🏳️';
      if (!this.statusMessage) {
        this.statusMessage = 'No upcoming fixture is available yet.';
      }
    }
  }

  selectSandboxRound(round: 1 | 2 | 3): void {
    this.selectedSandboxRound = round;
    this.onTeamSelect();
  }

  resetCurrentSandbox(): void {
    this.resetSandboxMatch();
    this.updateMath();
  }

  private getOpeningFixtureMatch(teamId: string): UpcomingMatch | null {
    return this.getSandboxFixtureMatch(teamId, 1);
  }

  private getSandboxFixtureMatch(teamId: string, round: 1 | 2 | 3): UpcomingMatch | null {
    const fixture = this.getGroupRoundFixtures().find(
      (f) => f.matchday === round && (f.home === teamId || f.away === teamId),
    );
    if (!fixture) return null;

    const isHome = fixture.home === teamId;
    const opponentId = isHome ? fixture.away : fixture.home;

    return {
      fixture: {
        ...fixture,
        stage: 'Group',
        label: `Group ${fixture.group}`,
        isHome,
      },
      selectedId: teamId,
      opponentId,
      isHome,
      teamStatus: 'active',
      statusMessage: `Group round ${round} fixture`,
      isSandbox: true,
    };
  }

  private withNepalTime(match: UpcomingMatch): UpcomingMatch {
    const nepalTime = this.toNepalTime(match.fixture.date, match.fixture.time);
    return {
      ...match,
      fixture: {
        ...match.fixture,
        date: nepalTime.date,
        time: nepalTime.time,
      },
    };
  }

  private toNepalTime(dateText: string, timeText: string): { date: string; time: string } {
    if (!timeText.includes('ET')) {
      return { date: dateText, time: timeText };
    }

    const parsed = /([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/.exec(dateText);
    const time = /(\d{1,2}):(\d{2})\s+(AM|PM)/.exec(timeText);
    if (!parsed || !time) {
      return { date: dateText, time: timeText };
    }

    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = months[parsed[1]];
    if (month === undefined) {
      return { date: dateText, time: timeText };
    }

    let hour = Number(time[1]);
    const minute = Number(time[2]);
    if (time[3] === 'PM' && hour !== 12) hour += 12;
    if (time[3] === 'AM' && hour === 12) hour = 0;

    const easternAsUtc = Date.UTC(Number(parsed[3]), month, Number(parsed[2]), hour + 4, minute);
    const nepal = new Date(easternAsUtc + (5 * 60 + 45) * 60 * 1000);
    const fmtDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(nepal);
    const fmtTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    }).format(nepal);

    return { date: fmtDate, time: `${fmtTime} NPT` };
  }

  private mergeStatusFixture(match: UpcomingMatch): UpcomingMatch {
    if (match.isSandbox) {
      return match;
    }

    const actual = this.fixtureService.getFixtureById(match.fixture.id);
    if (!actual?.finished) {
      return match;
    }

    return {
      ...match,
      fixture: {
        ...match.fixture,
        ...actual,
      },
    };
  }

  private getGroupRoundFixtures(): Array<SandboxFixture & { matchday: 1 | 2 | 3 }> {
    const fixtures: Array<SandboxFixture & { matchday: 1 | 2 | 3 }> = OPENING_FIXTURES.map((f) => ({
      ...f,
      matchday: 1,
    }));

    const venues = [
      { venue: 'MetLife Stadium', city: 'New York/New Jersey' },
      { venue: 'SoFi Stadium', city: 'Los Angeles' },
      { venue: 'AT&T Stadium', city: 'Dallas' },
      { venue: 'Estadio Azteca', city: 'Mexico City' },
      { venue: 'NRG Stadium', city: 'Houston' },
      { venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
      { venue: 'Lumen Field', city: 'Seattle' },
      { venue: 'Gillette Stadium', city: 'Boston' },
      { venue: 'Lincoln Financial Field', city: 'Philadelphia' },
      { venue: 'Hard Rock Stadium', city: 'Miami' },
      { venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
      { venue: 'Arrowhead Stadium', city: 'Kansas City' },
      { venue: 'BMO Field', city: 'Toronto' },
      { venue: 'BC Place', city: 'Vancouver' },
      { venue: 'Estadio BBVA', city: 'Monterrey' },
      { venue: 'Estadio Akron', city: 'Guadalajara' },
    ];

    let matchId = 25;
    let venueIndex = 0;
    for (const group of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      const md1 = OPENING_FIXTURES.filter((f) => f.group === group);
      if (md1.length < 2) continue;

      const [first, second] = md1;
      const t1 = first.home;
      const t2 = first.away;
      const t3 = second.home;
      const t4 = second.away;
      const v1 = venues[venueIndex++ % venues.length];
      const v2 = venues[venueIndex++ % venues.length];
      const v3 = venues[venueIndex++ % venues.length];
      const v4 = venues[venueIndex++ % venues.length];

      fixtures.push(
        {
          id: matchId++,
          date: 'Jun 19, 2026',
          time: '6:00 PM ET',
          group,
          home: t1,
          away: t3,
          venue: v1.venue,
          city: v1.city,
          matchday: 2,
        },
        {
          id: matchId++,
          date: 'Jun 20, 2026',
          time: '9:00 PM ET',
          group,
          home: t2,
          away: t4,
          venue: v2.venue,
          city: v2.city,
          matchday: 2,
        },
        {
          id: matchId++,
          date: 'Jun 24, 2026',
          time: '4:00 PM ET',
          group,
          home: t1,
          away: t4,
          venue: v3.venue,
          city: v3.city,
          matchday: 3,
        },
        {
          id: matchId++,
          date: 'Jun 25, 2026',
          time: '8:00 PM ET',
          group,
          home: t2,
          away: t3,
          venue: v4.venue,
          city: v4.city,
          matchday: 3,
        },
      );
    }

    return fixtures;
  }

  private resetSandboxMatch(): void {
    if (this.commInterval) {
      clearInterval(this.commInterval);
      this.commInterval = null;
    }
    if (this.upcomingMatch?.fixture.finished) {
      this.playDisabled = true;
      this.sbScoreA = this.upcomingMatch.fixture.homeScore ?? 0;
      this.sbScoreB = this.upcomingMatch.fixture.awayScore ?? 0;
    } else {
      this.playDisabled = false;
      this.sbScoreA = 0;
      this.sbScoreB = 0;
    }
    this.commLines = [];
  }

  isTeamSelectable(t: Team): boolean {
    return true;
  }

  teamOptionLabel(t: Team): string {
    return `${t.flag} ${t.name} (Group ${t.group})`;
  }

  canSimulate(): boolean {
    return (
      !!this.upcomingMatch?.fixture && !this.playDisabled && !this.upcomingMatch.fixture.finished
    );
  }

  opponentTeam(): Team | undefined {
    if (!this.upcomingMatch) return undefined;
    return this.teamService.findTeam(this.upcomingMatch.opponentId);
  }

  getSandboxMatchState(): 'LIVE' | 'FINISHED' | 'UPCOMING' {
    // If interval is running, match is LIVE
    if (this.commInterval) return 'LIVE';
    // If there are commentary lines but no interval, match is FINISHED
    if (this.commLines.length > 0) return 'FINISHED';
    // Otherwise, match is UPCOMING
    return 'UPCOMING';
  }

  selectedTeamObj(): Team | undefined {
    return this.teamService.findTeam(this.selectedTeam);
  }

  formMod(id: string): number {
    return this.simService.formMod(id, this.recentMatches());
  }

  updateMath(): void {
    const a = this.teamService.findTeam(this.sbTeamA);
    const b = this.teamService.findTeam(this.sbTeamB);
    if (!a || !b) {
      this.sbNameA = a?.name ?? this.sbTeamA ?? 'TBD';
      this.sbFlagA = a?.flag ?? '🏳️';
      this.sbNameB = b?.name ?? this.sbTeamB ?? 'TBD';
      this.sbFlagB = b?.flag ?? '🏳️';
      return;
    }
    const hA = a.host && !b.host ? 75 : 0;
    const hB = b.host && !a.host ? 75 : 0;
    const fA = this.formMod(a.id);
    const fB = this.formMod(b.id);
    const effA = a.elo + hA + fA;
    const effB = b.elo + hB + fB;
    const probs = this.simService.winDrawLossProbs(a, b, this.recentMatches());

    this.math = {
      eloA: String(a.elo),
      eloB: String(b.elo),
      hostA: hA > 0 ? '+' + hA : '0',
      hostB: hB > 0 ? '+' + hB : '0',
      formA: (fA >= 0 ? '+' : '') + fA.toFixed(1),
      formB: (fB >= 0 ? '+' : '') + fB.toFixed(1),
      gap: (effA - effB >= 0 ? '+' : '') + (effA - effB).toFixed(0),
      la: probs.lA.toFixed(3),
      lb: probs.lB.toFixed(3),
      rho: probs.rho.toFixed(3),
      odds: `${(probs.pw * 100).toFixed(0)}% / ${(probs.pd * 100).toFixed(0)}% / ${(probs.pl * 100).toFixed(0)}%`,
    };
    this.sbNameA = a.name;
    this.sbNameB = b.name;
    this.sbFlagA = a.flag;
    this.sbFlagB = b.flag;
  }

  startMatch(): void {
    if (this.upcomingMatch?.fixture.finished) return;
    const a = this.teamService.findTeam(this.sbTeamA);
    const b = this.teamService.findTeam(this.sbTeamB);
    if (!a || !b) return;
    if (this.commInterval) clearInterval(this.commInterval);

    this.commLines = [];
    this.sbScoreA = 0;
    this.sbScoreB = 0;
    this.playDisabled = true;

    const { lA, lB } = this.simService.xGoals(a, b, this.recentMatches(), {}, false);
    const fgA = this.simService.poissonGoals(lA);
    const fgB = this.simService.poissonGoals(lB);
    const evs: CommEvent[] = [];
    for (let i = 0; i < fgA; i++)
      evs.push({ min: Math.floor(Math.random() * 88) + 1, type: 'goal', side: 'A' });
    for (let i = 0; i < fgB; i++)
      evs.push({ min: Math.floor(Math.random() * 88) + 1, type: 'goal', side: 'B' });
    const fillers = [
      'dominates possession',
      'fires a shot over the bar',
      'earns a corner',
      'picks up a yellow card',
      'makes a crucial block',
      'plays a precise through-ball',
      'tests the goalkeeper',
    ];
    for (let i = 0; i < 4; i++)
      evs.push({
        min: Math.floor(Math.random() * 88) + 1,
        type: 'filler',
        side: Math.random() < 0.5 ? 'A' : 'B',
        txt: fillers[Math.floor(Math.random() * fillers.length)],
      });
    evs.sort((x, y) => (x.min as number) - (y.min as number));
    evs.unshift({ min: 0, type: 'start' });
    evs.push({ min: 90, type: 'end' });

    let idx = 0,
      cA = 0,
      cB = 0;
    const addLine = (min: string, html: string, cls = '') => {
      this.commLines = [
        ...this.commLines,
        { min, html: this.sanitizer.bypassSecurityTrustHtml(html), cls },
      ];
    };

    this.commInterval = setInterval(() => {
      if (idx >= evs.length) {
        if (this.commInterval) clearInterval(this.commInterval);
        this.playDisabled = false;
        return;
      }
      const ev = evs[idx++];
      if (ev.type === 'start') addLine('0', '⚽ Kick off! Match underway.');
      else if (ev.type === 'end') {
        let res = 'Full time! ';
        if (cA > cB) res += `<strong>${a.name} win!</strong>`;
        else if (cB > cA) res += `<strong>${b.name} win!</strong>`;
        else res += 'The match ends in a draw.';
        res += ` Final score: <strong>${cA}–${cB}</strong>`;
        addLine('90', res, 'ev-end');
        void this.predictionService.saveSandboxSim(this.sbTeamA, this.sbTeamB, cA, cB);
      } else if (ev.type === 'goal') {
        if (ev.side === 'A') {
          cA++;
          this.sbScoreA = cA;
          addLine(
            String(ev.min),
            `⚽ <strong>GOAL! ${a.name}</strong> — ${a.star} finds the net! (${cA}–${cB})`,
            'ev-goal',
          );
        } else {
          cB++;
          this.sbScoreB = cB;
          addLine(
            String(ev.min),
            `⚽ <strong>GOAL! ${b.name}</strong> — The keeper is beaten! (${cA}–${cB})`,
            'ev-goal',
          );
        }
      } else {
        const team = ev.side === 'A' ? a : b;
        addLine(String(ev.min), `${team.flag} ${team.name} ${ev.txt}.`);
      }
    }, 420);
  }

  runSims(): void {
    if (this.simRunning()) return;
    this.simRunning.set(true);
    this.simsRun.set(0);
    this.bracketCounts = {};
    const simRes = this.simService.initSimResults(this.teams());
    this.simRes.set(simRes);
    this.modalBracket.set(null);
    this.progPct.set(0);

    const batch = () => {
      let run = this.simsRun();
      if (run >= this.simService.TOTAL) {
        this.finishSims(simRes);
        return;
      }
      for (let b = 0; b < this.simService.BATCH && run < this.simService.TOTAL; b++) {
        const r = this.simService.runTournament(this.teams(), this.recentMatches());
        run++;
        const cId = r.champion.id;
        this.bracketCounts[cId] = (this.bracketCounts[cId] || 0) + 1;
        const topId = Object.keys(this.bracketCounts).reduce(
          (a, k) => (this.bracketCounts[a] > this.bracketCounts[k] ? a : k),
          cId,
        );
        if (!this.modalBracket() || this.bracketCounts[cId] > (this.bracketCounts[topId] || 0)) {
          this.modalBracket.set(r.bracket);
        }
        for (const id in r.stage) {
          const v = r.stage[id];
          const tgt = simRes[id];
          if (!tgt) continue;
          if (v >= 1) tgt.r32++;
          if (v >= 2) tgt.r16++;
          if (v >= 3) tgt.qf++;
          if (v >= 4) tgt.sf++;
          if (v >= 5) tgt.fin++;
          if (v >= 6) tgt.champ++;
        }
      }
      this.simsRun.set(run);
      this.progPct.set(Math.min(100, Math.floor((run / this.simService.TOTAL) * 100)));
      const sorted = Object.values(simRes).sort((a, b) => b.champ - a.champ);
      const lead = sorted[0];
      if (lead) {
        this.simLeader.set(`${lead.team.flag} ${lead.team.name}`);
        this.simPct.set(((lead.champ / run) * 100).toFixed(1) + '%');
      }
      this.simRes.set({ ...simRes });
      this.animFrame = requestAnimationFrame(batch);
    };
    batch();
  }

  private finishSims(simRes: Record<string, SimResult>): void {
    this.simRunning.set(false);
    void this.predictionService.savePrediction(
      this.predictionService.getUserName(),
      simRes,
      this.simsRun(),
    );
  }

  oddsList(): SimResult[] {
    const has = this.simsRun() > 0;
    if (has) return Object.values(this.simRes()).sort((a, b) => b.champ - a.champ);
    return [...this.teams()]
      .map((t) => ({ team: t, r32: 0, r16: 0, qf: 0, sf: 0, fin: 0, champ: 0 }))
      .sort((a, b) => b.team.elo - a.team.elo);
  }

  pct(item: SimResult, field: keyof SimResult): string {
    if (this.simsRun() <= 0) return '—';
    const val = item[field] as number;
    return ((val / this.simService.TOTAL) * 100).toFixed(1) + '%';
  }

  champPct(item: SimResult): number {
    return this.simsRun() > 0 ? (item.champ / this.simService.TOTAL) * 100 : 0;
  }

  champCi(item: SimResult): string {
    if (this.simsRun() <= 0) return '—';
    const p = item.champ / this.simService.TOTAL;
    const z = 1.96;
    const ci = z * Math.sqrt((p * (1 - p)) / this.simService.TOTAL) * 100;
    return '±' + ci.toFixed(2) + '%';
  }

  benchFor(id: string) {
    return this.simService.bench[id] || { opta: 0.1, market: 0.1 };
  }

  topAstroTeams(): Team[] {
    return [...this.teams()].sort((a, b) => b.elo - a.elo).slice(0, 16);
  }

  topAstroTable(): Team[] {
    return [...this.teams()].sort((a, b) => b.elo - a.elo).slice(0, 20);
  }

  zodiac(team: Team) {
    return this.astroService.getZodiac(team.starDOB);
  }

  cosmicScore(team: Team): number {
    return this.astroService.getCosmicScore(team);
  }

  cosmicColor(score: number): string {
    return this.astroService.cosmicBarColor(score);
  }

  planetMod(sign: string): number {
    return this.astroService.getPlanetMod(sign);
  }

  blendedOdds(team: Team): string {
    if (this.simsRun() <= 0) return '—';
    const statOdds = (this.simRes()[team.id].champ / this.simService.TOTAL) * 100;
    const cs = this.cosmicScore(team) / 100;
    return (statOdds * 0.85 + statOdds * 0.15 * cs * 1.2).toFixed(1) + '%';
  }

  teamForMatch(id: string | undefined): Team {
    if (!id) {
      return {
        id: 'TBD',
        name: 'TBD',
        flag: '🏳️',
        group: '',
        elo: 0,
        fifaRank: 0,
        star: '',
        starDOB: '',
        value: '',
        penRate: 0.7,
        host: false,
        climate: '',
      };
    }
    return (
      this.teamService.findTeam(id) || {
        id,
        name: id,
        flag: '🏳️',
        group: '',
        elo: 0,
        fifaRank: 0,
        star: '',
        starDOB: '',
        value: '',
        penRate: 0.7,
        host: false,
        climate: '',
      }
    );
  }

  isWinner(m: MatchResult, isA: boolean): boolean {
    return m.winner?.id === (isA ? m.tA.id : m.tB.id);
  }

  readonly bracketRounds = [
    { key: 'r32' as const, title: 'Round of 32' },
    { key: 'r16' as const, title: 'Round of 16' },
    { key: 'qf' as const, title: 'Quarter-Final' },
    { key: 'sf' as const, title: 'Semi-Final' },
  ];

  bracketRoundMatches(key: 'r32' | 'r16' | 'qf' | 'sf'): MatchResult[] {
    return this.modalBracket()?.[key] || [];
  }

  scoreDisplay(m: MatchResult, isA: boolean): string {
    const score = isA ? m.sA : m.sB;
    const team = isA ? m.tA : m.tB;
    const isWin = m.winner?.id === team.id;
    return m.pens && isWin ? `${score} (P)` : String(score);
  }

  async refreshTeams(): Promise<void> {
    await Promise.all([this.teamService.loadTeams(true), this.fixtureService.loadStatus(true)]);
    this.initSimState();
    this.onTeamSelect();
  }

  getUpcomingMatchups(): MatchupCard[] {
    const status = this.fixtureStatus();
    if (!status) return [];

    const matchups: MatchupCard[] = [];
    const seenFixtures = new Set<string>();

    const fixtures = (status as any).allFixtures || [];
    for (const f of fixtures) {
      if (f.finished) continue;
      if (!f.home || !f.away || f.home === 'TBD' || f.away === 'TBD') continue;
      const fixtureKey = `${f.id}`;
      if (seenFixtures.has(fixtureKey)) continue;
      seenFixtures.add(fixtureKey);
      const teamA = this.teamService.findTeam(f.home);
      const teamB = this.teamService.findTeam(f.away);
      if (teamA && teamB) {
        const probs = this.simService.winDrawLossProbs(teamA, teamB, this.recentMatches());
        matchups.push({ fixture: f, teamA, teamB, pw: probs.pw, pd: probs.pd, pl: probs.pl });
      }
    }

    return matchups.sort((a, b) => {
      const dateA = new Date(a.fixture.date).getTime();
      const dateB = new Date(b.fixture.date).getTime();
      return dateA - dateB;
    });
  }

  getMatchupsByTeam(): { [key: string]: MatchupCard[] } {
    const byTeam: { [key: string]: MatchupCard[] } = {};
    this.getUpcomingMatchups().forEach((matchup) => {
      const key1 = matchup.teamA.id;
      const key2 = matchup.teamB.id;
      if (!byTeam[key1]) byTeam[key1] = [];
      if (!byTeam[key2]) byTeam[key2] = [];
      byTeam[key1].push(matchup);
      byTeam[key2].push(matchup);
    });
    return byTeam;
  }

  getAllFixturesMatchups(): MatchupCard[] {
    const status = this.fixtureStatus();
    if (!status) return [];
    const fixtures = (status as any).allFixtures || [];
    const matchups: MatchupCard[] = [];
    for (const f of fixtures) {
      if (!f.home || !f.away || f.home === 'TBD' || f.away === 'TBD') continue;
      const teamA = this.teamService.findTeam(f.home) || this.teamForMatch(f.home);
      const teamB = this.teamService.findTeam(f.away) || this.teamForMatch(f.away);
      const probs =
        teamA && teamB
          ? this.simService.winDrawLossProbs(teamA, teamB, this.recentMatches())
          : { pw: 0, pd: 0, pl: 0 };
      matchups.push({ fixture: f, teamA, teamB, pw: probs.pw, pd: probs.pd, pl: probs.pl });
    }
    return matchups.sort(
      (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
    );
  }

  getMatchupsToShow(): MatchupCard[] {
    const upcoming = this.getUpcomingMatchups();
    if (upcoming.length > 0) return upcoming;
    return this.getAllFixturesMatchups();
  }

  getQualifiedTeams(): Team[] {
    return [...this.teams()]
      .filter((t) => {
        const next = this.fixtureService.getTeamNext(t.id);
        return next?.status === 'active';
      })
      .sort((a, b) => b.elo - a.elo);
  }

  isLive = (match: EspnMatch): boolean =>
    [
      'STATUS_FIRST_HALF',
      'STATUS_HALFTIME',
      'STATUS_SECOND_HALF',
      'STATUS_IN_PROGRESS',
      'STATUS_ACTIVE',
    ].includes(match.statusName);
  isFinished = (match: EspnMatch): boolean =>
    match.statusName === 'STATUS_FULL_TIME' || match.statusName === 'STATUS_FINAL';
}
