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

interface CommEvent {
  min: number | string;
  type: string;
  side?: string;
  txt?: string;
}

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
  oddsTab = signal<'odds' | 'bracket' | 'compare'>('odds');
  teamSearch = '';

  selectedTeam = 'USA';
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
      this.fixtureService.loadStatus(true)
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
    if (n === 3) void this.fixtureService.loadStatus(true).then(() => this.onTeamSelect());
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

  showTab(name: 'odds' | 'bracket' | 'compare'): void {
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
    const match = this.fixtureService.getUpcomingMatch(this.selectedTeam);
    const next = this.fixtureService.getTeamNext(this.selectedTeam);
    this.upcomingMatch = match;
    this.teamNextStatus = next?.status ?? null;
    this.statusMessage = next?.message ?? null;

    if (match?.fixture) {
      this.sbTeamA = match.fixture.home;
      this.sbTeamB = match.fixture.away;
      this.updateMath();
    } else {
      this.sbNameA = this.selectedTeamObj()?.name ?? '—';
      this.sbNameB = '—';
      this.sbFlagA = this.selectedTeamObj()?.flag ?? '🏳️';
      this.sbFlagB = '🏳️';
    }
  }

  async syncFixtures(): Promise<void> {
    await this.fixtureService.loadStatus(true);
    this.onTeamSelect();
  }

  isTeamSelectable(t: Team): boolean {
    const next = this.fixtureService.getTeamNext(t.id);
    return next?.status !== 'eliminated' && next?.status !== 'champion';
  }

  teamOptionLabel(t: Team): string {
    const next = this.fixtureService.getTeamNext(t.id);
    if (next?.status === 'eliminated') return `${t.flag} ${t.name} — ELIMINATED`;
    if (next?.status === 'champion') return `${t.flag} ${t.name} — CHAMPION 🏆`;
    if (next?.status === 'waiting') return `${t.flag} ${t.name} — awaiting draw`;
    return `${t.flag} ${t.name} (Group ${t.group})`;
  }

  canSimulate(): boolean {
    return !!this.upcomingMatch?.fixture && this.teamNextStatus === 'active' && !this.playDisabled;
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
    if (!a || !b) return;
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

  teamForMatch(id: string): Team {
    return this.teamService.findTeam(id) || { id, name: id, flag: '', group: '', elo: 0, fifaRank: 0, star: '', starDOB: '', value: '', penRate: 0.7, host: false, climate: '' };
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
}
