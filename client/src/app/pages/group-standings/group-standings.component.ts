import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FixtureService } from '../../services/fixture.service';
import { TeamService } from '../../services/team.service';
import { GroupStandingEntry } from '../../models/fixture.model';

@Component({
  selector: 'app-group-standings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <header>
        <div>
          <div class="header-eyebrow">2026 World Cup</div>
          <h1>Group<br><span>Standings</span></h1>
          <p class="header-sub">Live group standings computed from all finished fixtures. Auto-refreshes every 30 seconds.</p>
        </div>
      </header>

      <section class="hero-card">
        <div>
          <div class="hero-eyebrow">Live table</div>
          <div class="hero-title">Group-stage standings with qualification tracking</div>
          <p class="hero-summary">
            Each group's current table, sorted by points. Top two auto-qualify for the knockout stage; the best eight third-place teams also advance.
          </p>
        </div>
        <div class="hero-meta">
          <span class="hero-meta-item">Real-time</span>
          <span class="hero-meta-item">Auto-refresh</span>
          <span class="hero-meta-item">Form guide</span>
          <span class="hero-meta-item">Goal difference</span>
        </div>
      </section>

      <!-- Loading State - Skeleton -->
      <div *ngIf="loading()" class="standings-grid" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px;display:grid;">
        <div *ngFor="let _ of [1,2,3,4]" class="skeleton-card">
          <div class="skeleton-row" style="border-bottom:1px solid var(--border);margin-bottom:12px;">
            <div class="skeleton skeleton-cell-lg" style="width:80px;"></div>
            <div class="skeleton skeleton-cell-sm" style="margin-left:auto;"></div>
          </div>
          <div *ngFor="let _ of [1,2,3,4]" class="skeleton-row">
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-flag"></div>
            <div class="skeleton skeleton-cell" style="flex:1;"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-cell-sm"></div>
            <div class="skeleton skeleton-badge"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="empty-state-card">
        <div class="empty-state-copy">Unable to load standings. Please try again later.</div>
      </div>

      <!-- Standings Grid -->
      <ng-container *ngIf="!loading() && standings() as groups">
        <!-- Refresh Bar -->
        <div class="refresh-bar">
          <span class="refresh-label">
            <span *ngIf="refreshing()" class="pulse-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px;"></span>
            {{ refreshing() ? 'Refreshing…' : 'Last updated: ' + lastUpdated() }}
          </span>
          <button class="btn-sm" (click)="refresh()" [disabled]="refreshing()">⟳ Refresh</button>
        </div>

        <!-- Legend -->
        <div class="legend-bar">
          <span><span class="badge badge-green" style="padding:0 6px;">●</span> Top 2 — auto qualify</span>
          <span><span class="badge badge-blue" style="padding:0 6px;">●</span> 3rd — best 8 advance</span>
          <span><span class="badge badge-amber" style="padding:0 6px;">●</span> 3rd — eliminated</span>
          <span><span class="badge badge-red" style="padding:0 6px;">●</span> 4th — eliminated</span>
        </div>

        <!-- Empty State -->
        <div *ngIf="groupKeys().length === 0" class="standings-empty">
          <p>No group standings data available yet.</p>
          <p class="text-muted">Standings will appear once fixture results are loaded.</p>
        </div>

        <!-- Group Cards -->
        <div class="standings-grid">
          <div *ngFor="let gk of groupKeys()" class="group-card">
            <div class="group-header">
              <div class="group-letter">Group {{ gk }}</div>
              <div class="group-status" [class.group-complete]="isGroupComplete(groups[gk])">
                {{ groupStatusLabel(groups[gk]) }}
              </div>
            </div>
            <table class="standings-table">
              <thead>
                <tr>
                  <th class="col-pos">#</th>
                  <th class="col-team">Team</th>
                  <th class="col-stat">Pld</th>
                  <th class="col-stat">W</th>
                  <th class="col-stat">D</th>
                  <th class="col-stat">L</th>
                  <th class="col-stat">GF</th>
                  <th class="col-stat">GA</th>
                  <th class="col-stat">GD</th>
                  <th class="col-pts">Pts</th>
                  <th class="col-form">Form</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let entry of groups[gk]" [class.qualified]="entry.position <= 2">
                  <td class="col-pos">
                    <span [class]="positionBadge(entry.position, gk, groups)">{{ entry.position }}</span>
                  </td>
                  <td class="col-team">
                    <span class="team-name-text">{{ entry.teamFlag }} {{ entry.teamName }}</span>
                  </td>
                  <td class="col-stat">{{ entry.gp }}</td>
                  <td class="col-stat">{{ entry.w }}</td>
                  <td class="col-stat">{{ entry.d }}</td>
                  <td class="col-stat">{{ entry.l }}</td>
                  <td class="col-stat">{{ entry.gf }}</td>
                  <td class="col-stat">{{ entry.ga }}</td>
                  <td class="col-stat" [class.gd-pos]="entry.gd > 0" [class.gd-neg]="entry.gd < 0">
                    {{ entry.gd > 0 ? '+' : '' }}{{ entry.gd }}
                  </td>
                  <td class="col-pts"><span class="pts-value">{{ entry.pts }}</span></td>
                  <td class="col-form">
                    <div class="form-strip">
                      <span *ngFor="let letter of entry.form.split('').slice(-5)" [class]="formBadgeClass(letter)" class="badge">{{ letter }}</span>
                      <span *ngIf="!entry.form" class="text-muted" style="font-size:10px;">—</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    '.empty-state-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 12px; }',
    '.empty-state-copy { color: var(--text3); font-family: var(--font-mono); font-size: 12px; }',
    '.refresh-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }',
    '.refresh-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.06em; }',
    '.legend-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 0; margin-bottom: 16px; padding: 14px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); font-size: 11px; color: var(--text2); font-family: var(--font-mono); }',
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
    '.standings-empty { padding: 40px; text-align: center; color: var(--text3); }',
    '.standings-empty p { margin-bottom: 12px; }',
    '.text-muted { color: var(--text3); }',
    '@media (max-width: 768px) { .standings-grid { grid-template-columns: 1fr; } .standings-table { font-size: 11px; } .col-team { min-width: 100px; } }',
    '@media (max-width: 480px) { .standings-table th, .standings-table td { padding: 5px 4px; font-size: 10px; } .pts-value { font-size: 16px; } .group-letter { font-size: 18px; } .legend-bar { font-size: 10px; gap: 8px; } }',
  ]
})
export class GroupStandingsComponent implements OnInit, OnDestroy {
  private readonly fixtureService = inject(FixtureService);
  private readonly teamService = inject(TeamService);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal('—');
  readonly standings = signal<Record<string, GroupStandingEntry[]> | null>(null);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadData();
    // Auto-refresh every 30 seconds
    this.refreshTimer = setInterval(() => this.refresh(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      // Ensure teams are loaded
      if (this.teamService.teams().length === 0) {
        await this.teamService.loadTeams(false);
      }
      // Load fixture status
      await this.fixtureService.loadStatus(false);
      this.computeStandings();
    } catch (err) {
      console.error('Failed to load standings data', err);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      await this.fixtureService.loadStatus(false);
      this.computeStandings();
    } catch (err) {
      console.error('Failed to refresh standings', err);
    } finally {
      this.refreshing.set(false);
    }
  }

  private computeStandings(): void {
    const teams = this.teamService.teams();
    const result = this.fixtureService.getGroupStandings(teams);
    this.standings.set(result);
    this.lastUpdated.set(new Date().toLocaleTimeString());
  }

  readonly groupKeys = computed(() => {
    const s = this.standings();
    return s ? Object.keys(s).sort() : [];
  });

  isGroupComplete(entries: GroupStandingEntry[] | undefined): boolean {
    return !!entries && entries.length > 0 && entries.every(e => e.gp >= 3);
  }

  groupStatusLabel(entries: GroupStandingEntry[] | undefined): string {
    if (!entries || entries.length === 0) return 'No data';
    const active = entries.filter(e => e.gp > 0).length;
    if (active === 0) return 'No matches yet';
    if (entries.every(e => e.gp >= 3)) return 'Complete';
    return active + '/4 active';
  }

  formBadgeClass(letter: string): string {
    if (letter === 'W') return 'badge badge-green';
    if (letter === 'D') return 'badge badge-blue';
    return 'badge badge-red';
  }

  positionBadge(pos: number, group: string, allStandings: Record<string, GroupStandingEntry[]>): string {
    if (pos <= 2) return 'badge badge-green';
    if (pos === 3) {
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
