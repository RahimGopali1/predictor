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
  { id: 1, date: 'Jun 12, 2026', time: '3:00 PM ET', group: 'A', home: 'MEX', away: 'RSA', venue: 'Estadio Azteca', city: 'Mexico City' },
  { id: 2, date: 'Jun 12, 2026', time: '10:00 PM ET', group: 'A', home: 'KOR', away: 'CZE', venue: 'Estadio Akron', city: 'Guadalajara' },
  { id: 3, date: 'Jun 13, 2026', time: '3:00 PM ET', group: 'B', home: 'CAN', away: 'BIH', venue: 'BMO Field', city: 'Toronto' },
  { id: 4, date: 'Jun 13, 2026', time: '9:00 PM ET', group: 'D', home: 'USA', away: 'PAR', venue: 'SoFi Stadium', city: 'Los Angeles' },
  { id: 5, date: 'Jun 14, 2026', time: '9:00 PM ET', group: 'B', home: 'QAT', away: 'SUI', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
  { id: 6, date: 'Jun 15, 2026', time: '12:00 AM ET', group: 'D', home: 'AUS', away: 'TUR', venue: 'BC Place', city: 'Vancouver' },
  { id: 7, date: 'Jun 14, 2026', time: '6:00 PM ET', group: 'C', home: 'BRA', away: 'MAR', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  { id: 8, date: 'Jun 14, 2026', time: '3:00 PM ET', group: 'C', home: 'HAI', away: 'SCO', venue: 'Gillette Stadium', city: 'Boston' },
  { id: 9, date: 'Jun 15, 2026', time: '7:00 PM ET', group: 'E', home: 'GER', away: 'CUW', venue: 'NRG Stadium', city: 'Houston' },
  { id: 10, date: 'Jun 15, 2026', time: '1:00 PM ET', group: 'F', home: 'NED', away: 'JPN', venue: 'AT&T Stadium', city: 'Dallas' },
  { id: 11, date: 'Jun 15, 2026', time: '4:00 PM ET', group: 'E', home: 'CIV', away: 'ECU', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
  { id: 12, date: 'Jun 15, 2026', time: '10:00 PM ET', group: 'F', home: 'SWE', away: 'TUN', venue: 'Estadio BBVA', city: 'Monterrey' },
  { id: 13, date: 'Jun 15, 2026', time: '3:00 PM ET', group: 'G', home: 'BEL', away: 'EGY', venue: 'Lumen Field', city: 'Seattle' },
  { id: 14, date: 'Jun 15, 2026', time: '12:00 PM ET', group: 'G', home: 'IRN', away: 'NZL', venue: 'SoFi Stadium', city: 'Los Angeles' },
  { id: 15, date: 'Jun 15, 2026', time: '9:00 PM ET', group: 'H', home: 'KSA', away: 'URU', venue: 'Hard Rock Stadium', city: 'Miami' },
  { id: 16, date: 'Jun 15, 2026', time: '6:00 PM ET', group: 'H', home: 'ESP', away: 'CPV', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { id: 17, date: 'Jun 16, 2026', time: '3:00 PM ET', group: 'I', home: 'FRA', away: 'SEN', venue: 'MetLife Stadium', city: 'New York/New Jersey' },
  { id: 18, date: 'Jun 16, 2026', time: '6:00 PM ET', group: 'I', home: 'IRQ', away: 'NOR', venue: 'Gillette Stadium', city: 'Boston' },
  { id: 19, date: 'Jun 16, 2026', time: '9:00 PM ET', group: 'J', home: 'ARG', away: 'ALG', venue: 'Arrowhead Stadium', city: 'Kansas City' },
  { id: 20, date: 'Jun 17, 2026', time: '12:00 AM ET', group: 'J', home: 'AUT', away: 'JOR', venue: "Levi's Stadium", city: 'San Francisco Bay Area' },
  { id: 21, date: 'Jun 17, 2026', time: '7:00 PM ET', group: 'L', home: 'GHA', away: 'PAN', venue: 'BMO Field', city: 'Toronto' },
  { id: 22, date: 'Jun 17, 2026', time: '4:00 PM ET', group: 'L', home: 'ENG', away: 'CRO', venue: 'AT&T Stadium', city: 'Dallas' },
  { id: 23, date: 'Jun 17, 2026', time: '1:00 PM ET', group: 'K', home: 'POR', away: 'COD', venue: 'NRG Stadium', city: 'Houston' },
  { id: 24, date: 'Jun 17, 2026', time: '10:00 PM ET', group: 'K', home: 'UZB', away: 'COL', venue: 'Estadio Azteca', city: 'Mexico City' }
];

@Component({
  selector: 'app-predictor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './predictor.component.html'
})
export class PredictorComponent implements OnInit, OnDestroy {
  private readonly teamService = inject(TeamService);
  private readonly fixtureService = inject(FixtureService);
  private readonly simService = inject(SimulationService);
  private readonly astroService = inject(AstroService);
  private readonly predictionService = inject(PredictionService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly teams = this.teamService.teams;
  readonly recentMatches = this.teamService.recentMatches;
  readonly loading = this.teamService.loading;
  readonly syncSource = this.teamService.syncSource;

  currentStep = signal(1);
  guidesVisible = signal(true);
  seniorMode = signal(false);
  subTab = signal<'ratings' | 'form'>('ratings');
  oddsTab = signal<'odds' | 'bracket' | 'compare' | 'matchups'>('odds');
  teamSearch = '';

  selectedTeam = 'USA';
  selectedSandboxRound: 1 | 2 | 3 = 1;
  sbTeamA = 'USA';
  sbTeamB = 'PAR';
  upcomingMatch: UpcomingMatch | null = null;
  teamNextStatus: UpcomingMatch['teamStatus'] | null = null;
  statusMessage: string | null = null;
  readonly fixtureStatus = this.fixtureService.status;
  readonly fixtureSyncing = this.fixtureService.syncing;
  math = { eloA: '—', eloB: '—', hostA: '—', hostB: '—', formA: '—', formB: '—', gap: '—', la: '—', lb: '—', rho: '—', odds: '—' };
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
      this.fixtureService.loadStatus(false)
    ]).then(() => {
      this.initSimState();
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

  goStep(n: number): void {
    this.currentStep.set(n);
    if (n === 3) void this.fixtureService.loadStatus(false).then(() => this.onTeamSelect());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleGuides(): void {
    this.guidesVisible.update(v => !v);
  }

  toggleSenior(): void {
    this.seniorMode.update(v => !v);
    document.body.style.fontSize = this.seniorMode() ? '18px' : '';
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
      .filter(t => !q || t.name.toLowerCase().includes(q));
  }

  sortedTeamsByName(): Team[] {
    return [...this.teams()].sort((a, b) => a.name.localeCompare(b.name));
  }

  onTeamSelect(): void {
    let match = this.getSandboxFixtureMatch(this.selectedTeam, this.selectedSandboxRound);
    const next = this.fixtureService.getTeamNext(this.selectedTeam);
    if (!match) {
      match = this.fixtureService.getUpcomingMatch(this.selectedTeam);
    }
    if (!match && next?.match && next.match.home && next.match.away && next.match.home !== 'TBD' && next.match.away !== 'TBD') {
      const isHome = next.match.home === this.selectedTeam;
      const opponentId = isHome ? next.match.away : next.match.home;
      match = {
        fixture: next.match,
        selectedId: this.selectedTeam,
        opponentId,
        isHome,
        teamStatus: next.status,
        statusMessage: next.message
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
      this.upcomingMatch = match;
      this.resetSandboxMatch();
      this.sbTeamA = match.fixture.home;
      this.sbTeamB = match.fixture.away;
      this.sbNameA = this.teamService.findTeam(this.sbTeamA)?.name ?? this.sbTeamA ?? 'TBD';
      this.sbFlagA = this.teamService.findTeam(this.sbTeamA)?.flag ?? '🏳️';
      this.sbNameB = this.teamService.findTeam(this.sbTeamB)?.name ?? this.sbTeamB ?? 'TBD';
      this.sbFlagB = this.teamService.findTeam(this.sbTeamB)?.flag ?? '🏳️';
      this.updateMath();
    } else {
      this.sbNameA = this.selectedTeamObj()?.name ?? '—';
      this.sbNameB = this.teamNextStatus === 'champion'
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
    const fixture = this.getGroupRoundFixtures().find(f =>
      f.matchday === round && (f.home === teamId || f.away === teamId)
    );
    if (!fixture) return null;

    const isHome = fixture.home === teamId;
    const opponentId = isHome ? fixture.away : fixture.home;

    return {
      fixture: {
        ...fixture,
        stage: 'Group',
        label: `Group ${fixture.group}`,
        isHome
      },
      selectedId: teamId,
      opponentId,
      isHome,
      teamStatus: 'active',
      statusMessage: `Group round ${round} fixture`
    };
  }

  private withNepalTime(match: UpcomingMatch): UpcomingMatch {
    const nepalTime = this.toNepalTime(match.fixture.date, match.fixture.time);
    return {
      ...match,
      fixture: {
        ...match.fixture,
        date: nepalTime.date,
        time: nepalTime.time
      }
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
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
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
      timeZone: 'UTC'
    }).format(nepal);
    const fmtTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }).format(nepal);

    return { date: fmtDate, time: `${fmtTime} NPT` };
  }

  private getGroupRoundFixtures(): Array<SandboxFixture & { matchday: 1 | 2 | 3 }> {
    const fixtures: Array<SandboxFixture & { matchday: 1 | 2 | 3 }> = OPENING_FIXTURES.map(f => ({
      ...f,
      matchday: 1
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
      { venue: 'Estadio Akron', city: 'Guadalajara' }
    ];

    let matchId = 25;
    let venueIndex = 0;
    for (const group of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      const md1 = OPENING_FIXTURES.filter(f => f.group === group);
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
        { id: matchId++, date: 'Jun 19, 2026', time: '6:00 PM ET', group, home: t1, away: t3, venue: v1.venue, city: v1.city, matchday: 2 },
        { id: matchId++, date: 'Jun 20, 2026', time: '9:00 PM ET', group, home: t2, away: t4, venue: v2.venue, city: v2.city, matchday: 2 },
        { id: matchId++, date: 'Jun 24, 2026', time: '4:00 PM ET', group, home: t1, away: t4, venue: v3.venue, city: v3.city, matchday: 3 },
        { id: matchId++, date: 'Jun 25, 2026', time: '8:00 PM ET', group, home: t2, away: t3, venue: v4.venue, city: v4.city, matchday: 3 }
      );
    }

    return fixtures;
  }

  private resetSandboxMatch(): void {
    if (this.commInterval) {
      clearInterval(this.commInterval);
      this.commInterval = null;
    }
    this.playDisabled = false;
    this.sbScoreA = 0;
    this.sbScoreB = 0;
    this.commLines = [];
  }

  isTeamSelectable(t: Team): boolean {
    return true;
  }

  teamOptionLabel(t: Team): string {
    return `${t.flag} ${t.name} (Group ${t.group})`;
  }

  canSimulate(): boolean {
    return !!this.upcomingMatch?.fixture && !this.playDisabled;
  }

  opponentTeam(): Team | undefined {
    if (!this.upcomingMatch) return undefined;
    return this.teamService.findTeam(this.upcomingMatch.opponentId);
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
      gap: ((effA - effB) >= 0 ? '+' : '') + (effA - effB).toFixed(0),
      la: probs.lA.toFixed(3),
      lb: probs.lB.toFixed(3),
      rho: probs.rho.toFixed(3),
      odds: `${(probs.pw * 100).toFixed(0)}% / ${(probs.pd * 100).toFixed(0)}% / ${(probs.pl * 100).toFixed(0)}%`
    };
    this.sbNameA = a.name;
    this.sbNameB = b.name;
    this.sbFlagA = a.flag;
    this.sbFlagB = b.flag;
  }

  startMatch(): void {
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
    for (let i = 0; i < fgA; i++) evs.push({ min: Math.floor(Math.random() * 88) + 1, type: 'goal', side: 'A' });
    for (let i = 0; i < fgB; i++) evs.push({ min: Math.floor(Math.random() * 88) + 1, type: 'goal', side: 'B' });
    const fillers = ['dominates possession', 'fires a shot over the bar', 'earns a corner', 'picks up a yellow card', 'makes a crucial block', 'plays a precise through-ball', 'tests the goalkeeper'];
    for (let i = 0; i < 4; i++) evs.push({ min: Math.floor(Math.random() * 88) + 1, type: 'filler', side: Math.random() < 0.5 ? 'A' : 'B', txt: fillers[Math.floor(Math.random() * fillers.length)] });
    evs.sort((x, y) => (x.min as number) - (y.min as number));
    evs.unshift({ min: 0, type: 'start' });
    evs.push({ min: 90, type: 'end' });

    let idx = 0, cA = 0, cB = 0;
    const addLine = (min: string, html: string, cls = '') => {
      this.commLines = [...this.commLines, { min, html: this.sanitizer.bypassSecurityTrustHtml(html), cls }];
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
          cA++; this.sbScoreA = cA;
          addLine(String(ev.min), `⚽ <strong>GOAL! ${a.name}</strong> — ${a.star} finds the net! (${cA}–${cB})`, 'ev-goal');
        } else {
          cB++; this.sbScoreB = cB;
          addLine(String(ev.min), `⚽ <strong>GOAL! ${b.name}</strong> — The keeper is beaten! (${cA}–${cB})`, 'ev-goal');
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
        const topId = Object.keys(this.bracketCounts).reduce((a, k) =>
          this.bracketCounts[a] > this.bracketCounts[k] ? a : k, cId);
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
      this.progPct.set(Math.min(100, Math.floor(run / this.simService.TOTAL * 100)));
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
      this.simsRun()
    );
  }

  oddsList(): SimResult[] {
    const has = this.simsRun() > 0;
    if (has) return Object.values(this.simRes()).sort((a, b) => b.champ - a.champ);
    return [...this.teams()].map(t => ({ team: t, r32: 0, r16: 0, qf: 0, sf: 0, fin: 0, champ: 0 }))
      .sort((a, b) => b.team.elo - a.team.elo);
  }

  pct(item: SimResult, field: keyof SimResult): string {
    if (this.simsRun() <= 0) return '—';
    const val = item[field] as number;
    return (val / this.simService.TOTAL * 100).toFixed(1) + '%';
  }

  champPct(item: SimResult): number {
    return this.simsRun() > 0 ? (item.champ / this.simService.TOTAL * 100) : 0;
  }

  champCi(item: SimResult): string {
    if (this.simsRun() <= 0) return '—';
    const p = item.champ / this.simService.TOTAL;
    const z = 1.96;
    const ci = z * Math.sqrt(p * (1 - p) / this.simService.TOTAL) * 100;
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
    const statOdds = this.simRes()[team.id].champ / this.simService.TOTAL * 100;
    const cs = this.cosmicScore(team) / 100;
    return (statOdds * 0.85 + statOdds * 0.15 * cs * 1.2).toFixed(1) + '%';
  }

  teamForMatch(id: string | undefined): Team {
    if (!id) {
      return { id: 'TBD', name: 'TBD', flag: '🏳️', group: '', elo: 0, fifaRank: 0, star: '', starDOB: '', value: '', penRate: 0.7, host: false, climate: '' };
    }
    return this.teamService.findTeam(id) || { id, name: id, flag: '🏳️', group: '', elo: 0, fifaRank: 0, star: '', starDOB: '', value: '', penRate: 0.7, host: false, climate: '' };
  }

  isWinner(m: MatchResult, isA: boolean): boolean {
    return m.winner?.id === (isA ? m.tA.id : m.tB.id);
  }

  readonly bracketRounds = [
    { key: 'r32' as const, title: 'Round of 32' },
    { key: 'r16' as const, title: 'Round of 16' },
    { key: 'qf' as const, title: 'Quarter-Final' },
    { key: 'sf' as const, title: 'Semi-Final' }
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
    await Promise.all([
      this.teamService.loadTeams(true),
      this.fixtureService.loadStatus(true)
    ]);
    this.initSimState();
    this.onTeamSelect();
  }

  getUpcomingMatchups(): MatchupCard[] {
    const status = this.fixtureStatus();
    if (!status) return [];

    const matchups: MatchupCard[] = [];
    const seenFixtures = new Set<string>();

    for (const teamId in status.nextMatches) {
      const next = status.nextMatches[teamId];
      if (next?.match && next.status === 'active') {
        const fixtureKey = `${next.match.id}`;
        if (!seenFixtures.has(fixtureKey)) {
          seenFixtures.add(fixtureKey);
          const teamA = this.teamService.findTeam(next.match.home);
          const teamB = this.teamService.findTeam(next.match.away);
          if (teamA && teamB) {
            const probs = this.simService.winDrawLossProbs(teamA, teamB, this.recentMatches());
            matchups.push({
              fixture: next.match,
              teamA,
              teamB,
              pw: probs.pw,
              pd: probs.pd,
              pl: probs.pl
            });
          }
        }
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
    this.getUpcomingMatchups().forEach(matchup => {
      const key1 = matchup.teamA.id;
      const key2 = matchup.teamB.id;
      if (!byTeam[key1]) byTeam[key1] = [];
      if (!byTeam[key2]) byTeam[key2] = [];
      byTeam[key1].push(matchup);
      byTeam[key2].push(matchup);
    });
    return byTeam;
  }

  getQualifiedTeams(): Team[] {
    return [...this.teams()].filter(t => {
      const next = this.fixtureService.getTeamNext(t.id);
      return next?.status === 'active';
    }).sort((a, b) => b.elo - a.elo);
  }
}
