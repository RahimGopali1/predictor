import { Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GroupStandingEntry, UpcomingMatch, TournamentFixture } from '../../models/fixture.model';
import { BracketData, BracketScore, MatchResult, SimResult, Team, UserBracket, UserBracketPick } from '../../models/team.model';
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
  homeScore?: number;
  awayScore?: number;
  winner?: string | null;
  finished?: boolean;
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
    homeScore: 2,
    awayScore: 1,
    winner: 'MEX',
    finished: true,
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
    homeScore: 1,
    awayScore: 1,
    winner: null,
    finished: true,
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
    homeScore: 1,
    awayScore: 0,
    winner: 'CAN',
    finished: true,
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
    homeScore: 0,
    awayScore: 3,
    winner: 'PAR',
    finished: true,
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
    homeScore: 2,
    awayScore: 3,
    winner: 'SUI',
    finished: true,
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
    homeScore: 5,
    awayScore: 0,
    winner: 'AUS',
    finished: true,
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
    homeScore: 3,
    awayScore: 2,
    winner: 'BRA',
    finished: true,
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
    homeScore: 1,
    awayScore: 0,
    winner: 'HAI',
    finished: true,
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
    homeScore: 1,
    awayScore: 1,
    winner: null,
    finished: true,
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
    homeScore: 3,
    awayScore: 1,
    winner: 'NED',
    finished: true,
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
    homeScore: 4,
    awayScore: 1,
    winner: 'CIV',
    finished: true,
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
    homeScore: 1,
    awayScore: 0,
    winner: 'SWE',
    finished: true,
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
    homeScore: 2,
    awayScore: 0,
    winner: 'BEL',
    finished: true,
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
    homeScore: 3,
    awayScore: 1,
    winner: 'IRN',
    finished: true,
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
    homeScore: 0,
    awayScore: 2,
    winner: 'URU',
    finished: true,
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
    homeScore: 3,
    awayScore: 1,
    winner: 'ESP',
    finished: true,
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
    homeScore: 1,
    awayScore: 1,
    winner: null,
    finished: true,
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
    homeScore: 2,
    awayScore: 1,
    winner: 'IRQ',
    finished: true,
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
    homeScore: 5,
    awayScore: 2,
    winner: 'ARG',
    finished: true,
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
    homeScore: 1,
    awayScore: 1,
    winner: null,
    finished: true,
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
    homeScore: 1,
    awayScore: 2,
    winner: 'PAN',
    finished: true,
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
    homeScore: 1,
    awayScore: 1,
    winner: null,
    finished: true,
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
    homeScore: 2,
    awayScore: 2,
    winner: null,
    finished: true,
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
    homeScore: 1,
    awayScore: 2,
    winner: 'COL',
    finished: true,
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

    /* matches grid - use global classes where possible, keep predictor-specific overrides */
    '.matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 16px; }',
    '.match-card.upcoming-match-card { background: rgba(77,159,255,.04); border-color: rgba(77,159,255,.15); }',
    '.match-card.upcoming-counter-card { background: rgba(77, 159, 255, 0.04); border-color: rgba(77, 159, 255, 0.15); }',
    '.match-card.upcoming-counter-card .score-section { flex-direction: column; align-items: flex-start; gap: 4px; padding: 4px 0; }',
    '.upcoming-count { font-family: var(--font-head); font-size: 28px; font-weight: 700; color: var(--blue); }',
    '.upcoming-note { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }',
    '.match-group { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.upcoming-counter-card .score-section { flex-direction: column; align-items: flex-start; gap: 4px; padding: 4px 0; }',

    /* sandbox panel */
    '.sandbox-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }',
    '.sandbox-title { font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: 0.02em; }',
    '.sandbox-sub { font-size: 11px; color: var(--text3); font-family: var(--font-mono); margin-top: 2px; }',
    '.fixture-count { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }',
    '.sandbox-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 12px; align-items: start; }',
    '.sandbox-left { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; display: flex; flex-direction: column; gap: 10px; }',
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
    '.commentary-box { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; display: flex; flex-direction: column; }',
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
    '.team-block.winner .team-avatar { border-color: var(--green); }',

    '.team-block.winner .team-label { color: var(--green); }',
    ".team-name { margin-top: 2px; font-size: 11px; color: var(--text3); text-align: center; max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",

    /* responsive */
    '@media (max-width: 768px) { .sandbox-grid { grid-template-columns: 1fr; } .stats-row { grid-template-columns: repeat(2, 1fr); } .matches-grid { grid-template-columns: 1fr; } }',
    /* responsive */
    '@media (max-width: 768px) { .matches-grid { grid-template-columns: 1fr; gap: 12px; } .match-card { padding: 16px; } .team-avatar { width: 48px; height: 48px; } .score-display { font-size: 30px; } .score-panel { min-width: 90px; } }',
    /* group standings */
    '.standings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }',
    '.group-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }',
    '.group-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 10px; border-bottom: 1px solid var(--border); }',
    '.group-letter { font-family: var(--font-head); font-size: 22px; letter-spacing: 0.06em; color: var(--gold); }',
    '.group-status { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.06em; }',
    '.group-complete { color: var(--green); }',
    '.standings-table { width: 100%; border-collapse: collapse; }',
    '.standings-table th { background: var(--bg3); padding: 8px 6px; font-size: 9px; text-align: center; white-space: nowrap; }',
    '.standings-table td { padding: 8px 6px; font-size: 12px; text-align: center; border-bottom: 1px solid var(--border); }',
    '.standings-table tr:last-child td { border-bottom: none; }',
    '.standings-table tr:hover td { background: var(--hover-bg); }',
    '.standings-table tr.qualified td { background: rgba(45, 206, 110, 0.03); }',
    '.col-pos { width: 32px; }',
    '.col-team { text-align: left !important; min-width: 140px; }',
    '.col-stat { width: 30px; font-family: var(--font-mono); font-size: 11px !important; color: var(--text2); }',
    '.col-pts { width: 40px; }',
    '.col-form { width: 90px; }',
    '.team-name-text { font-weight: 500; color: var(--text); font-size: 12px; }',
    '.pts-value { font-family: var(--font-head); font-size: 20px; letter-spacing: 0.04em; color: var(--gold); }',
    '.gd-pos { color: var(--green) !important; font-weight: 600; }',
    '.gd-neg { color: var(--red) !important; font-weight: 600; }',
    '.form-strip { display: flex; gap: 3px; justify-content: center; flex-wrap: nowrap; }',
    '.form-strip .badge { font-size: 9px; padding: 1px 5px; min-width: 20px; text-align: center; }',
    '.group-empty { padding: 24px 16px; text-align: center; }',
    '.standings-empty { padding: 40px; text-align: center; color: var(--text3); }',
    '.standings-empty p { margin-bottom: 12px; }',
    '.refresh-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }',
    '.refresh-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.06em; }',
    '.legend-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding: 14px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); font-size: 11px; color: var(--text2); font-family: var(--font-mono); }',

    /* responsive */
    '@media (max-width: 768px) { .standings-grid { grid-template-columns: 1fr; } .standings-table { font-size: 11px; } .col-team { min-width: 100px; } }',
    '@media (max-width: 480px) { .standings-table th, .standings-table td { padding: 5px 4px; font-size: 10px; } .pts-value { font-size: 16px; } .group-letter { font-size: 18px; } .legend-bar { font-size: 10px; gap: 8px; } }',

    /* head-to-head comparator */
    '.h2h-intro { font-size: 13px; color: var(--text2); margin-bottom: 20px; line-height: 1.6; }',
    '.h2h-pickers { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: end; margin-bottom: 24px; }',
    '.h2h-picker-col { min-width: 0; }',
    '.h2h-vs-col { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-bottom: 4px; }',
    '.h2h-swap-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border2); background: var(--card2); color: var(--gold); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }',
    '.h2h-swap-btn:hover { border-color: var(--gold); background: var(--gold-dim); transform: rotate(180deg); }',
    '.h2h-vs-text { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.1em; }',

    /* hero */
    '.h2h-hero { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; padding: 24px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 20px; }',
    '.h2h-hero-team { text-align: center; }',
    '.h2h-hero-flag { font-size: 48px; line-height: 1; margin-bottom: 8px; }',
    '.h2h-hero-name { font-family: var(--font-head); font-size: 22px; letter-spacing: 0.04em; color: var(--text); margin-bottom: 4px; }',
    '.h2h-hero-elo { font-family: var(--font-mono); font-size: 13px; color: var(--gold); }',
    '.h2h-hero-center { text-align: center; min-width: 180px; }',
    '.h2h-hero-score { font-family: var(--font-head); font-size: 32px; letter-spacing: 0.06em; color: var(--gold); margin-bottom: 4px; }',
    '.h2h-hero-label { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }',
    '.h2h-hero-probs { width: 100%; }',
    '.h2h-prob-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px; background: var(--bg2); }',
    '.h2h-prob-fill { transition: width 0.3s ease; }',
    '.h2h-prob-win { background: var(--green); }',
    '.h2h-prob-draw { background: var(--blue); }',
    '.h2h-prob-labels { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; font-weight: 600; }',

    /* stat rows */
    '.h2h-stats { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; }',
    '.h2h-stat-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; padding: 10px 16px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; }',
    '.h2h-stat-row:first-child { border-color: var(--border2); }',
    '.h2h-stat-val { font-family: var(--font-head); font-size: 20px; letter-spacing: 0.04em; text-align: center; color: var(--text); }',
    '.h2h-stat-label { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; text-align: center; padding: 0 8px; }',

    /* math breakdown */
    '.h2h-math { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }',
    '.h2h-math-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }',
    '.h2h-math-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }',
    '.h2h-math-item { display: flex; flex-direction: column; gap: 2px; padding: 8px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; text-align: center; }',
    '.h2h-math-label { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.06em; }',
    '.h2h-math-val { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--gold); }',

    /* responsive */
    '@media (max-width: 768px) { .h2h-pickers { grid-template-columns: 1fr; } .h2h-vs-col { flex-direction: row; gap: 12px; padding: 8px 0; justify-content: center; } .h2h-hero { grid-template-columns: 1fr; gap: 12px; } .h2h-hero-center { order: -1; } .h2h-hero-flag { font-size: 36px; } .h2h-hero-name { font-size: 18px; } .h2h-hero-score { font-size: 26px; } .h2h-math-grid { grid-template-columns: repeat(2, 1fr); } }',
    '@media (max-width: 480px) { .h2h-hero { padding: 16px; } .h2h-hero-flag { font-size: 28px; } .h2h-hero-name { font-size: 16px; } .h2h-hero-score { font-size: 22px; } .h2h-stat-row { padding: 8px 10px; } .h2h-stat-val { font-size: 16px; } .h2h-math-grid { grid-template-columns: 1fr; } }',

    /* bracket game */
    '.bracket-start { text-align: center; padding: 40px 0; }',
    '.bracket-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }',
    '.bracket-progress { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text2); }',
    '.bp-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--border2); border: 1px solid var(--border); }',
    '.bp-dot.done { background: var(--green); border-color: var(--green); }',
    '.bp-dot.partial { background: var(--gold); border-color: var(--gold); }',
    '.bracket-rounds { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }',
    '.bracket-round { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); padding: 12px; }',
    '.br-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }',
    '.br-title { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); }',
    '.br-count { font-family: var(--font-mono); font-size: 10px; color: var(--text3); }',
    '.br-match { margin-bottom: 8px; }',
    '.br-match:last-child { margin-bottom: 0; }',
    '.br-match-label { font-size: 9px; color: var(--text3); font-family: var(--font-mono); margin-bottom: 2px; padding-left: 2px; }',
    '.br-team { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 6px; background: var(--card); border: 1px solid var(--border); margin-bottom: 2px; transition: all 0.15s; }',
    '.br-team:last-child { margin-bottom: 0; }',
    '.br-team.winner { border-color: var(--green); background: rgba(45,206,110,0.06); }',
    '.br-team.clickable { cursor: pointer; }',
    '.br-team.clickable:hover { border-color: var(--gold); background: var(--gold-dim); }',
    '.br-team-info { display: flex; align-items: center; gap: 6px; min-width: 0; }',
    '.br-flag { font-size: 16px; flex-shrink: 0; }',
    '.br-name { font-size: 12px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.br-check { font-size: 14px; color: var(--green); flex-shrink: 0; }',
    '.br-empty { padding: 16px; text-align: center; color: var(--text3); font-size: 11px; font-family: var(--font-mono); }',
    '.bracket-champion-box { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 16px; background: var(--gold-dim); border: 1px solid rgba(212,168,67,0.2); border-radius: var(--r); font-size: 14px; color: var(--text); }',
    '.bc-crown { font-size: 24px; }',
    '.bc-team { font-weight: 700; font-size: 16px; }',
    '.bracket-score-card { margin-top: 16px; padding: 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); }',
    '.bsc-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }',
    '.bsc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }',
    '.bsc-stat { text-align: center; padding: 8px; background: var(--card); border-radius: 8px; border: 1px solid var(--border); }',
    '.bsc-val { font-family: var(--font-head); font-size: 22px; font-weight: 700; color: var(--text); }',
    '.bsc-lbl { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px; }',

    /* my bracket tab */
    '.mybracket-content { padding: 8px 0; }',
    '.mybracket-hero { text-align: center; padding: 24px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 20px; }',
    '.mybracket-hero-score { font-family: var(--font-head); font-size: 42px; font-weight: 700; color: var(--gold); letter-spacing: 0.04em; }',
    '.mybracket-hero-lbl { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.12em; text-transform: uppercase; margin: 4px 0 12px; }',
    '.mybracket-hero-bar { height: 6px; background: var(--border2); border-radius: 3px; overflow: hidden; max-width: 300px; margin: 0 auto; }',
    '.mybracket-hero-fill { height: 100%; background: var(--gold); border-radius: 3px; transition: width 0.5s ease; }',
    '.mybracket-breakdown { display: flex; flex-direction: column; gap: 8px; }',
    '.mb-row { display: grid; grid-template-columns: 140px 60px 80px 1fr; gap: 8px; align-items: center; padding: 8px 12px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; }',
    '.mb-stage { font-size: 12px; font-weight: 500; color: var(--text); }',
    '.mb-correct { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text); text-align: center; }',
    '.mb-pts { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }',
    '.mb-bar { height: 6px; background: var(--border2); border-radius: 3px; overflow: hidden; }',
    '.mb-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }',
    '.mb-r32 { background: var(--text3); }',
    '.mb-r16 { background: #b8860b; }',
    '.mb-qf { background: var(--blue); }',
    '.mb-sf { background: var(--green); }',
    '.mb-final { background: var(--gold); }',
    '.mb-champ { background: var(--gold); }',
    '.mb-row-champion { border-color: var(--gold-dim); background: var(--gold-glow); }',
    '.mybracket-champion { margin-top: 20px; padding: 12px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; font-size: 14px; display: flex; align-items: center; gap: 6px; }',

    '@media (max-width: 768px) { .bracket-rounds { grid-template-columns: 1fr; } .bsc-grid { grid-template-columns: 1fr; } .mb-row { grid-template-columns: 1fr 1fr; gap: 4px; } .mb-bar { grid-column: 1 / -1; } }',
    '@media (max-width: 480px) { .mb-row { grid-template-columns: 1fr; } }',
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
  private readonly ngZone = inject(NgZone);

  readonly teams = this.teamService.teams;
  readonly recentMatches = this.teamService.recentMatches;
  readonly loading = this.teamService.loading;
  readonly syncSource = this.teamService.syncSource;
  readonly allMatches$ = this.espnMatchService.allMatches$;
  readonly liveMatches$ = this.espnMatchService.liveMatches$;
  readonly upcomingMatches$ = this.espnMatchService.upcomingMatches$;
  readonly completedMatches$ = this.espnMatchService.completedMatches$;

  currentStep = signal(1);
  subTab = signal<'ratings' | 'form' | 'compare'>('ratings');
  oddsTab = signal<'odds' | 'bracket' | 'compare' | 'matchups' | 'mybracket'>('odds');
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
  private simWorker: Worker | null = null;
  private bracketCounts: Record<string, number> = {};
  readonly Math = Math;

  // Worker-based sim state
  private workerRes: Record<string, SimResult> = {};
  private workerBracket: BracketData | null = null;
  private workerCounts: Record<string, number> = {};

  ngOnInit(): void {
    void Promise.all([
      this.teamService.loadTeams(true),
      this.fixtureService.loadStatus(false),
    ]).then(() => {
      this.initSimState();
      this.restoreSimState();
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
      this.refreshGroupStandings();
    });
  }

  ngOnDestroy(): void {
    if (this.commInterval) clearInterval(this.commInterval);
    this.terminateWorker();
  }

  private terminateWorker(): void {
    if (this.simWorker) {
      this.simWorker.terminate();
      this.simWorker = null;
    }
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

  showSubTab(name: 'ratings' | 'form' | 'compare'): void {
    this.subTab.set(name);
  }

  showTab(name: 'odds' | 'bracket' | 'compare' | 'matchups' | 'mybracket'): void {
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
    // Sandbox fixtures use hardcoded data — don't merge server results
    // (the OPENING_FIXTURES list already has finished: true + scores for Round 1)
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

    // Initialize worker-side result storage
    this.workerRes = this.simService.initSimResults(this.teams());
    this.simRes.set({ ...this.workerRes });
    this.modalBracket.set(null);
    this.progPct.set(0);
    this.workerBracket = null;
    this.workerCounts = {};

    // Terminate any previous worker
    this.terminateWorker();

    // Guard: don't spawn worker with empty data
    const teams = this.teams();
    const recent = this.recentMatches();
    if (!teams || teams.length === 0) {
      console.warn('No teams data available, skipping simulation');
      this.simRunning.set(false);
      return;
    }

    try {
      this.simWorker = new Worker(
        new URL('../../services/simulation.worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (err) {
      console.error('Failed to create Web Worker, falling back to main-thread simulation', err);
      this.runSimsFallback();
      return;
    }

    this.simWorker.onmessage = (e: MessageEvent<{
      type: string;
      simsRun: number;
      simRes: Record<string, { r32: number; r16: number; qf: number; sf: number; fin: number; champ: number }>;
      bracketCounts: Record<string, number>;
      modalBracket: BracketData | null;
      leaderId: string;
      leaderPct: number;
      modalBracketChanged?: boolean;
    }>) => {
      const msg = e.data;

      if (msg.type === 'PROGRESS') {
        // Rebuild simRes from counts + teams
        const teams = this.teams();
        for (const t of teams) {
          const c = msg.simRes[t.id];
          if (c && this.workerRes[t.id]) {
            this.workerRes[t.id].r32 = c.r32;
            this.workerRes[t.id].r16 = c.r16;
            this.workerRes[t.id].qf = c.qf;
            this.workerRes[t.id].sf = c.sf;
            this.workerRes[t.id].fin = c.fin;
            this.workerRes[t.id].champ = c.champ;
          }
        }

        this.workerCounts = msg.bracketCounts;
        this.workerBracket = msg.modalBracket;

        this.simsRun.set(msg.simsRun);
        this.progPct.set(Math.min(100, Math.floor((msg.simsRun / this.simService.TOTAL) * 100)));

        const leaderTeam = this.teamService.findTeam(msg.leaderId);
        if (leaderTeam) {
          this.simLeader.set(`${leaderTeam.flag} ${leaderTeam.name}`);
          this.simPct.set(msg.leaderPct.toFixed(1) + '%');
        }

        this.simRes.set({ ...this.workerRes });
        if (msg.modalBracket || msg.modalBracketChanged) {
          this.modalBracket.set(msg.modalBracket);
        }
      } else if (msg.type === 'DONE') {
        this.ngZone.run(() => this.finishSims(this.workerRes));
        this.terminateWorker();
      }
    };

    this.simWorker.onerror = (err) => {
      console.error('Web Worker error, falling back to main-thread simulation', err);
      this.terminateWorker();
      this.runSimsFallback();
    };

    this.simWorker.postMessage({
      type: 'START',
      teams,
      recentMatches: recent,
      TOTAL: this.simService.TOTAL,
      BATCH: this.simService.BATCH,
    });
  }

  private runSimsFallback(): void {
    // Original main-thread simulation as fallback if Web Worker isn't available
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
      requestAnimationFrame(batch);
    };
    batch();
  }

  private finishSims(simRes: Record<string, SimResult>): void {
    this.simRunning.set(false);
    this.saveSimState();
    void this.predictionService.savePrediction(
      this.predictionService.getUserName(),
      simRes,
      this.simsRun(),
    );
  }

  /** Softmax over ELO with temperature 400 */
  eloChampProb(teamId: string): number {
    const teams = this.teams();
    if (teams.length === 0) return 0;
    const rels = teams.map(t => Math.exp(t.elo / 400));
    const totalRel = rels.reduce((s, v) => s + v, 0);
    const idx = teams.findIndex(t => t.id === teamId);
    return idx === -1 ? 0 : rels[idx] / totalRel;
  }

  /** Pre-simulation ELO-based estimated odds */
  private estimatedOdds(): SimResult[] {
    const teams = this.teams();
    if (teams.length === 0) return [];
    const TOTAL = this.simService.TOTAL;

    return teams.map(t => {
      const champProb = this.eloChampProb(t.id);
      const champ = Math.round(champProb * TOTAL);
      const fin = Math.min(TOTAL, Math.round(champ * 3));
      const sf = Math.min(TOTAL, Math.round(fin * 2.2));
      const qf = Math.min(TOTAL, Math.round(sf * 2));
      const r16 = Math.min(TOTAL, Math.round(qf * 2));
      const r32 = Math.min(TOTAL, Math.round(r16 * 1.5));
      return { team: t, r32, r16, qf, sf, fin, champ };
    }).sort((a, b) => b.champ - a.champ);
  }

  oddsList(): SimResult[] {
    if (this.simsRun() > 0) {
      return Object.values(this.simRes()).sort((a, b) => b.champ - a.champ);
    }
    return this.estimatedOdds();
  }

  pct(item: SimResult, field: keyof SimResult): string {
    const run = this.simsRun();
    const total = run > 0 ? run : this.simService.TOTAL;
    const val = item[field] as number;
    return ((val / total) * 100).toFixed(1) + '%';
  }

  champPct(item: SimResult): number {
    const total = this.simsRun() > 0 ? this.simService.TOTAL : this.simService.TOTAL;
    return (item.champ / total) * 100;
  }

  estimatedChampPct(teamId: string): string {
    const prob = this.eloChampProb(teamId);
    return prob > 0 ? (prob * 100).toFixed(1) : '—';
  }

  champCi(item: SimResult): string {
    const total = this.simsRun() > 0 ? this.simService.TOTAL : this.simService.TOTAL;
    const p = item.champ / total;
    const z = 1.96;
    const ci = z * Math.sqrt((p * (1 - p)) / total) * 100;
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
    let champOdds: number;
    if (this.simsRun() > 0 && this.simRes()[team.id]) {
      champOdds = (this.simRes()[team.id].champ / this.simService.TOTAL) * 100;
    } else {
      champOdds = this.eloChampProb(team.id) * 100;
      if (champOdds <= 0) return '—';
    }
    const cs = this.cosmicScore(team) / 100;
    return (champOdds * 0.85 + champOdds * 0.15 * cs * 1.2).toFixed(1) + '%';
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

  // ── Group Standings ──

  readonly groupStandings = signal<Record<string, GroupStandingEntry[]> | null>(null);

  refreshGroupStandings(): void {
    this.groupStandings.set(this.fixtureService.getGroupStandings(this.teams()));
  }

  // ── Head-to-Head Comparator ──

  h2hTeamA = signal('ARG');
  h2hTeamB = signal('FRA');
  h2hSearchA = signal('');
  h2hSearchB = signal('');
  showH2hDropdownA = signal(false);
  showH2hDropdownB = signal(false);

  h2hTeamAData(): Team | undefined {
    return this.teamService.findTeam(this.h2hTeamA());
  }

  h2hTeamBData(): Team | undefined {
    return this.teamService.findTeam(this.h2hTeamB());
  }

  h2hFilteredTeamsA(): Team[] {
    const q = this.h2hSearchA().toLowerCase();
    return this.sortedTeamsByName().filter(t => 
      !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }

  h2hFilteredTeamsB(): Team[] {
    const q = this.h2hSearchB().toLowerCase();
    return this.sortedTeamsByName().filter(t => 
      !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }

  selectH2hTeamA(id: string): void {
    this.h2hTeamA.set(id);
    this.showH2hDropdownA.set(false);
    this.h2hSearchA.set('');
  }

  selectH2hTeamB(id: string): void {
    this.h2hTeamB.set(id);
    this.showH2hDropdownB.set(false);
    this.h2hSearchB.set('');
  }

  swapH2hTeams(): void {
    const temp = this.h2hTeamA();
    this.h2hTeamA.set(this.h2hTeamB());
    this.h2hTeamB.set(temp);
  }

  h2hProbs() {
    const a = this.h2hTeamAData();
    const b = this.h2hTeamBData();
    if (!a || !b) return { pw: 0, pd: 0, pl: 0, lA: 0, lB: 0, rho: 0, fa: 0, fb: 0, ha: 0, hb: 0, effA: 0, effB: 0, gap: 0 };
    const fa = this.formMod(a.id);
    const fb = this.formMod(b.id);
    const ha = a.host && !b.host ? 75 : 0;
    const hb = b.host && !a.host ? 75 : 0;
    const effA = a.elo + ha + fa;
    const effB = b.elo + hb + fb;
    const probs = this.simService.winDrawLossProbs(a, b, this.recentMatches());
    return {
      ...probs,
      fa,
      fb,
      ha,
      hb,
      effA,
      effB,
      gap: effA - effB
    };
  }

  h2hPredictedScore(): string {
    const a = this.h2hTeamAData();
    const b = this.h2hTeamBData();
    if (!a || !b) return '—';
    const { lA, lB } = this.h2hProbs();
    const gA = Math.round(lA);
    const gB = Math.round(lB);
    return `${a.flag} ${gA} – ${gB} ${b.flag}`;
  }

  h2hEloDiffColor(diff: number): string {
    if (diff > 0) return 'var(--green)';
    if (diff < 0) return 'var(--red)';
    return 'var(--text2)';
  }

  readonly groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  // ── Simulation Persistence ──

  private readonly SIM_STORAGE_KEY = 'wc_sim_state';

  /** Save sim results + modal bracket to localStorage so they survive page refresh */
  private saveSimState(): void {
    try {
      const state: any = {
        simsRun: this.simsRun(),
        counts: {},
        bracket: null,
      };
      for (const [id, sr] of Object.entries(this.simRes())) {
        state.counts[id] = { r32: sr.r32, r16: sr.r16, qf: sr.qf, sf: sr.sf, fin: sr.fin, champ: sr.champ };
      }
      const mb = this.modalBracket();
      if (mb) {
        state.bracket = {
          r32: this.serializeMatches(mb.r32),
          r16: this.serializeMatches(mb.r16),
          qf: this.serializeMatches(mb.qf),
          sf: this.serializeMatches(mb.sf),
          final: this.serializeMatch(mb.final),
        };
      }
      localStorage.setItem(this.SIM_STORAGE_KEY, JSON.stringify(state));
    } catch { /* localStorage may be full or unavailable */ }
  }

  /** Restore sim results + modal bracket from localStorage */
  private restoreSimState(): void {
    try {
      const raw = localStorage.getItem(this.SIM_STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state.simsRun || state.simsRun <= 0) return;

      const teams = this.teams();
      if (teams.length === 0) return;

      const simRes = this.simService.initSimResults(teams);
      for (const t of teams) {
        const c = state.counts?.[t.id];
        if (c && simRes[t.id]) {
          simRes[t.id].r32 = c.r32 ?? 0;
          simRes[t.id].r16 = c.r16 ?? 0;
          simRes[t.id].qf = c.qf ?? 0;
          simRes[t.id].sf = c.sf ?? 0;
          simRes[t.id].fin = c.fin ?? 0;
          simRes[t.id].champ = c.champ ?? 0;
        }
      }

      this.simsRun.set(state.simsRun);
      this.simRes.set(simRes);

      if (state.bracket) {
        this.modalBracket.set({
          r32: this.deserializeMatches(state.bracket.r32 || []),
          r16: this.deserializeMatches(state.bracket.r16 || []),
          qf: this.deserializeMatches(state.bracket.qf || []),
          sf: this.deserializeMatches(state.bracket.sf || []),
          final: this.deserializeMatch(state.bracket.final),
        });
      }
    } catch { /* corrupted data or version mismatch */ }
  }

  private serializeMatches(matches: MatchResult[]): any[] {
    return matches.map(m => this.serializeMatch(m));
  }

  private serializeMatch(m: MatchResult): any {
    return {
      tA: m.tA.id,
      tB: m.tB.id,
      sA: m.sA,
      sB: m.sB,
      et: m.et,
      pens: m.pens,
      pA: m.pA,
      pB: m.pB,
      winner: m.winner?.id ?? null,
    };
  }

  private deserializeMatches(arr: any[]): MatchResult[] {
    return arr.map((m: any) => this.deserializeMatch(m));
  }

  private deserializeMatch(m: any): MatchResult {
    const tA = this.teamService.findTeam(m.tA) || this.teamForMatch(m.tA);
    const tB = this.teamService.findTeam(m.tB) || this.teamForMatch(m.tB);
    return {
      tA,
      tB,
      sA: m.sA,
      sB: m.sB,
      et: m.et,
      pens: m.pens,
      pA: m.pA,
      pB: m.pB,
      winner: m.winner ? (this.teamService.findTeam(m.winner) || tA) : null,
    };
  }

  // ── Bracket Prediction Game ──

  readonly STORAGE_KEY = 'wc_user_bracket';

  userBracket = signal<UserBracket | null>(this.loadBracket());
  bracketEditMode = signal(false);

  bracketStageOrder = ['r32', 'r16', 'qf', 'sf', 'final'] as const;
  bracketStageLabels: Record<string, string> = {
    r32: 'Round of 32',
    r16: 'Round of 16',
    qf: 'Quarter-Final',
    sf: 'Semi-Final',
    final: 'Grand Final'
  };
  bracketStagePoints: Record<string, number> = {
    r32: 1,
    r16: 2,
    qf: 3,
    sf: 5,
    final: 8,
    champion: 12
  };

  loadBracket(): UserBracket | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  saveBracket(bracket: UserBracket): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bracket));
  }

  /** Build bracket structure from allFixtures knockout matches */
  buildBracketTemplate(): UserBracket {
    const fixtures = (this.fixtureStatus()?.allFixtures as TournamentFixture[]) ?? [];
    const koFixtures = fixtures.filter(f =>
      f.stage === 'Round of 32' || f.stage === 'Round of 16' ||
      f.stage === 'Quarter-Final' || f.stage === 'Semi-Final' ||
      f.stage === 'Grand Final'
    );

    const r32: Record<string, UserBracketPick> = {};
    const r16: Record<string, UserBracketPick> = {};
    const qf: Record<string, UserBracketPick> = {};
    const sf: Record<string, UserBracketPick> = {};
    let final: UserBracketPick | null = null;

    koFixtures.forEach(f => {
      const pick: UserBracketPick = {
        matchId: f.id,
        stage: f.stage,
        label: f.label || '',
        home: f.home,
        away: f.away,
        winner: null
      };

      if (f.stage === 'Round of 32') r32[f.label || f.id.toString()] = pick;
      else if (f.stage === 'Round of 16') r16[f.label || f.id.toString()] = pick;
      else if (f.stage === 'Quarter-Final') qf[f.label || f.id.toString()] = pick;
      else if (f.stage === 'Semi-Final') sf[f.label || f.id.toString()] = pick;
      else if (f.stage === 'Grand Final') final = pick;
    });

    return { r32, r16, qf, sf, final, champion: null };
  }

  /** Initialize or reset user bracket */
  initBracket(): void {
    const bracket = this.buildBracketTemplate();
    this.userBracket.set(bracket);
    this.saveBracket(bracket);
    this.bracketEditMode.set(true);
  }

  /** Reset bracket to blank */
  resetBracket(): void {
    this.initBracket();
  }

  /** Pick a winner for a specific match */
  pickWinner(stage: string, label: string, teamId: string): void {
    const bracket = this.userBracket();
    if (!bracket) return;

    const updated = JSON.parse(JSON.stringify(bracket)) as UserBracket;
    const stageMap: Record<string, Record<string, UserBracketPick>> = {
      r32: updated.r32,
      r16: updated.r16,
      qf: updated.qf,
      sf: updated.sf
    };

    if (stage === 'final') {
      if (!updated.final) return;
      updated.final.winner = teamId;
      updated.champion = teamId;
    } else if (stageMap[stage]?.[label]) {
      stageMap[stage][label].winner = teamId;
    } else {
      return;
    }

    // Auto-propagate: advance winner to next round
    this.autoPropagate(updated, stage, label, teamId);

    this.userBracket.set(updated);
    this.saveBracket(updated);
  }

  private autoPropagate(bracket: UserBracket, stage: string, label: string, teamId: string): void {
    // R32 labels 1-16 map to R16 labels 1-8 (two R32 matches feed one R16 match)
    // Correct bracket topology per the server's bracket generation:
    // R32-1 + R32-13 → R16-1, R32-3 + R32-14 → R16-2,
    // R32-5 + R32-15 → R16-3, R32-7 + R32-16 → R16-4,
    // R32-2 + R32-4 → R16-5, R32-6 + R32-8 → R16-6,
    // R32-9 + R32-11 → R16-7, R32-10 + R32-12 → R16-8
    const r32PairLabels: Record<string, { nextKey: string; slot: 'home' | 'away' }> = {
      'R32-1': { nextKey: 'R16-1', slot: 'home' },
      'R32-13': { nextKey: 'R16-1', slot: 'away' },
      'R32-3': { nextKey: 'R16-2', slot: 'home' },
      'R32-14': { nextKey: 'R16-2', slot: 'away' },
      'R32-5': { nextKey: 'R16-3', slot: 'home' },
      'R32-15': { nextKey: 'R16-3', slot: 'away' },
      'R32-7': { nextKey: 'R16-4', slot: 'home' },
      'R32-16': { nextKey: 'R16-4', slot: 'away' },
      'R32-2': { nextKey: 'R16-5', slot: 'home' },
      'R32-4': { nextKey: 'R16-5', slot: 'away' },
      'R32-6': { nextKey: 'R16-6', slot: 'home' },
      'R32-8': { nextKey: 'R16-6', slot: 'away' },
      'R32-9': { nextKey: 'R16-7', slot: 'home' },
      'R32-11': { nextKey: 'R16-7', slot: 'away' },
      'R32-10': { nextKey: 'R16-8', slot: 'home' },
      'R32-12': { nextKey: 'R16-8', slot: 'away' }
    };
    const r16PairLabels: Record<string, { nextKey: string; slot: 'home' | 'away' }> = {
      'R16-1': { nextKey: 'QF-1', slot: 'home' },
      'R16-2': { nextKey: 'QF-2', slot: 'home' },
      'R16-3': { nextKey: 'QF-3', slot: 'home' },
      'R16-4': { nextKey: 'QF-4', slot: 'home' },
      'R16-5': { nextKey: 'QF-1', slot: 'away' },
      'R16-6': { nextKey: 'QF-2', slot: 'away' },
      'R16-7': { nextKey: 'QF-3', slot: 'away' },
      'R16-8': { nextKey: 'QF-4', slot: 'away' }
    };
    const qfPairLabels: Record<string, { nextKey: string; slot: 'home' | 'away' }> = {
      'QF-1': { nextKey: 'SF-1', slot: 'home' },
      'QF-2': { nextKey: 'SF-1', slot: 'away' },
      'QF-3': { nextKey: 'SF-2', slot: 'home' },
      'QF-4': { nextKey: 'SF-2', slot: 'away' }
    };
    const sfPairLabels: Record<string, 'home' | 'away'> = {
      'SF-1': 'home',
      'SF-2': 'away'
    };

    // R32 → R16
    if (stage === 'r32' && r32PairLabels[label]) {
      const nxt = r32PairLabels[label];
      const nm = bracket.r16[nxt.nextKey];
      if (nm) nm[nxt.slot] = teamId;
    }

    // R16 → QF
    if (stage === 'r16' && r16PairLabels[label]) {
      const nxt = r16PairLabels[label];
      const nm = bracket.qf[nxt.nextKey];
      if (nm) nm[nxt.slot] = teamId;
    }

    // QF → SF
    if (stage === 'qf' && qfPairLabels[label]) {
      const nxt = qfPairLabels[label];
      const nm = bracket.sf[nxt.nextKey];
      if (nm) nm[nxt.slot] = teamId;
    }

    // SF → Final
    if (stage === 'sf' && sfPairLabels[label]) {
      if (bracket.final) {
        bracket.final[sfPairLabels[label]] = teamId;
      }
    }
  }

  /** Get the team that won a specific match in the user's bracket */
  bracketWinner(stage: string, label: string): string | null {
    const userB = this.userBracket();
    if (!userB) return null;
    const stageData = (userB as any)?.[stage];
    if (!stageData) return null;
    return stageData?.[label]?.winner ?? null;
  }

  /** Get all bracket picks for a stage */
  bracketStagePicks(stage: string): UserBracketPick[] {
    const b = this.userBracket();
    if (!b) return [];
    const s = b[stage as keyof UserBracket];
    if (!s || typeof s !== 'object') return [];
    return Object.values(s as Record<string, UserBracketPick>);
  }

  /** Get the championship pick */
  bracketChampion(): string | null {
    return this.userBracket()?.champion ?? null;
  }

  /** Get team display info for a team ID (used in bracket) */
  bracketTeamInfo(id: string): { flag: string; name: string } {
    const t = this.teamService.findTeam(id);
    return t ? { flag: t.flag, name: t.name } : { flag: '🏳️', name: id };
  }

  /** Check if a team won in the user bracket for a match */
  isBracketWinner(stage: string, label: string, teamId: string): boolean {
    return this.bracketWinner(stage, label) === teamId;
  }

  /** Count how many picks have been made in a stage */
  bracketStageProgress(stage: string): { done: number; total: number } {
    const picks = this.bracketStagePicks(stage);
    const total = picks.length;
    const done = picks.filter(p => p.winner !== null).length;
    return { done, total };
  }

  /** Check if the entire bracket is filled */
  get bracketComplete(): boolean {
    const b = this.userBracket();
    if (!b || !b.final?.winner) return false;
    return true;
  }

  /** Score the user's bracket against the actual tournament results */
  scoreBracket(): BracketScore | null {
    const bracket = this.userBracket();
    if (!bracket) return null;

    const fixtures = (this.fixtureStatus()?.allFixtures as TournamentFixture[]) ?? [];
    const actualChampion = this.fixtureStatus()?.champion;

    let r32Correct = 0;
    let r16Correct = 0;
    let qfCorrect = 0;
    let sfCorrect = 0;
    let finalCorrect = 0;
    let championCorrect = false;

    const getActualWinner = (matchId: number): string | null => {
      const f = fixtures.find(fx => fx.id === matchId);
      if (!f || !f.finished) return null;
      if (f.homeScore == null || f.awayScore == null) return null;
      if (f.homeScore > f.awayScore) return f.home;
      if (f.awayScore > f.homeScore) return f.away;
      return null;
    };

    const stageConfigs = [
      { key: 'r32', stats: { correct: () => r32Correct, set: (v: number) => { r32Correct = v; } }, total: Object.keys(bracket.r32).length },
      { key: 'r16', stats: { correct: () => r16Correct, set: (v: number) => { r16Correct = v; } }, total: Object.keys(bracket.r16).length },
      { key: 'qf', stats: { correct: () => qfCorrect, set: (v: number) => { qfCorrect = v; } }, total: Object.keys(bracket.qf).length },
      { key: 'sf', stats: { correct: () => sfCorrect, set: (v: number) => { sfCorrect = v; } }, total: Object.keys(bracket.sf).length },
    ] as const;

    // Score each stage
    stageConfigs.forEach(({ key }) => {
      const picks = Object.values(bracket[key] as Record<string, UserBracketPick>);
      let correct = 0;
      picks.forEach(pick => {
        const actual = getActualWinner(pick.matchId);
        if (actual && pick.winner === actual) correct++;
      });
      if (key === 'r32') r32Correct = correct;
      else if (key === 'r16') r16Correct = correct;
      else if (key === 'qf') qfCorrect = correct;
      else if (key === 'sf') sfCorrect = correct;
    });

    // Score final
    if (bracket.final) {
      const actual = getActualWinner(bracket.final.matchId);
      if (actual && bracket.final.winner === actual) finalCorrect = 1;
    }

    // Score champion
    championCorrect = bracket.champion === actualChampion;

    const totalPossible = Object.keys(bracket.r32).length + Object.keys(bracket.r16).length +
      Object.keys(bracket.qf).length + Object.keys(bracket.sf).length + 1;
    const totalCorrect = r32Correct + r16Correct + qfCorrect + sfCorrect + finalCorrect;

    const pts = this.bracketStagePoints;
    const score = r32Correct * pts['r32'] +
      r16Correct * pts['r16'] +
      qfCorrect * pts['qf'] +
      sfCorrect * pts['sf'] +
      finalCorrect * pts['final'] +
      (championCorrect ? pts['champion'] : 0);

    const maxScore = totalPossible * pts['champion'];

    return {
      r32Correct, r16Correct, qfCorrect, sfCorrect, finalCorrect,
      championCorrect, totalCorrect, totalPossible, score, maxScore
    };
  }

  formBadgeClass(letter: string): string {
    if (letter === 'W') return 'badge badge-green';
    if (letter === 'D') return 'badge badge-blue';
    return 'badge badge-red';
  }

  /**
   * Determine qualification zone color for a group position.
   * In 2026 format: top 2 auto-qualify, best 8 thirds also qualify.
   * For simplicity: pos 1-2 = green (qualifying), pos 3 = amber (maybe), pos 4 = red.
   */
  positionBadge(pos: number, group: string, allStandings: Record<string, GroupStandingEntry[]>): string {
    if (pos <= 2) return 'badge badge-green';
    if (pos === 3) {
      // Check if this third-place team would be among the best 8
      const allThirds = Object.values(allStandings)
        .map(g => g[2])
        .filter(Boolean)
        .sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });
      const rank = allThirds.findIndex(t => t && t.group === group) + 1;
      if (rank > 0 && rank <= 8) return 'badge badge-blue';
      return 'badge badge-amber';
    }
    return 'badge badge-red';
  }
}
