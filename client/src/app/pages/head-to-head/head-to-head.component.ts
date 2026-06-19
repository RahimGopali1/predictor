import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Team } from '../../models/team.model';
import { TeamService } from '../../services/team.service';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-head-to-head',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <header>
        <div>
          <div class="header-eyebrow">Team Comparator</div>
          <h1>Head-to-Head<br><span>Comparison</span></h1>
          <p class="header-sub">Side-by-side comparison of any two World Cup teams using Elo ratings, form, host advantage, and the full DC-corrected Poisson match model.</p>
        </div>
      </header>

      <section class="hero-card">
        <div>
          <div class="hero-eyebrow">Deep-dive analysis</div>
          <div class="hero-title">Compare squad strength, form, and predicted outcomes</div>
          <p class="hero-summary">
            Select two teams below to see a detailed head-to-head breakdown including Elo ratings, recent form, host advantage, expected goals, and match outcome probabilities.
          </p>
        </div>
        <div class="hero-meta">
          <span class="hero-meta-item">Elo ratings</span>
          <span class="hero-meta-item">Form guide</span>
          <span class="hero-meta-item">Expected goals</span>
          <span class="hero-meta-item">Win probability</span>
        </div>
      </section>

      <div class="h2h-intro">
        Pick two teams to compare. The model accounts for Elo rating, host advantage, recent form, squad value, tournament pedigree, and rest days.
      </div>

      <!-- Team Pickers -->
      <div class="h2h-pickers">
        <div class="h2h-picker-col">
          <div class="ctrl-label">Team A</div>
          <div class="team-trigger" [class.open]="showDropdownA()" (click)="toggleDropdown('A')">
            <span>{{ teamAData()?.flag || '🏳️' }} {{ teamAData()?.name || 'Select team' }}</span>
            <span class="trigger-arrow">▾</span>
          </div>
          <div class="team-dropdown" *ngIf="showDropdownA()" (click)="$event.stopPropagation()">
            <input class="team-search team-search-input" [ngModel]="searchA()" (ngModelChange)="searchA.set($event)" placeholder="Search teams..." (keydown)="$event.stopPropagation()" />
            <div class="team-list">
              <div *ngFor="let t of filteredA()" class="team-item" [class.active]="h2hTeamA() === t.id" (click)="selectTeam('A', t.id)">
                <span>{{ t.flag }} {{ t.name }}</span>
                <span class="team-code">{{ t.id }}</span>
              </div>
              <div *ngIf="filteredA().length === 0" class="team-empty">No teams match your search.</div>
            </div>
          </div>
          <div class="stat-label" style="margin-top:6px;text-align:center;">
            {{ teamAData() ? 'Group ' + teamAData()!.group + ' · FIFA #' + teamAData()!.fifaRank : '' }}
          </div>
        </div>

        <div class="h2h-vs-col">
          <button class="h2h-swap-btn" (click)="swapTeams()" title="Swap teams">⇄</button>
          <div class="h2h-vs-text">VS</div>
        </div>

        <div class="h2h-picker-col">
          <div class="ctrl-label">Team B</div>
          <div class="team-trigger" [class.open]="showDropdownB()" (click)="toggleDropdown('B')">
            <span>{{ teamBData()?.flag || '🏳️' }} {{ teamBData()?.name || 'Select team' }}</span>
            <span class="trigger-arrow">▾</span>
          </div>
          <div class="team-dropdown" *ngIf="showDropdownB()" (click)="$event.stopPropagation()">
            <input class="team-search team-search-input" [ngModel]="searchB()" (ngModelChange)="searchB.set($event)" placeholder="Search teams..." (keydown)="$event.stopPropagation()" />
            <div class="team-list">
              <div *ngFor="let t of filteredB()" class="team-item" [class.active]="h2hTeamB() === t.id" (click)="selectTeam('B', t.id)">
                <span>{{ t.flag }} {{ t.name }}</span>
                <span class="team-code">{{ t.id }}</span>
              </div>
              <div *ngIf="filteredB().length === 0" class="team-empty">No teams match your search.</div>
            </div>
          </div>
          <div class="stat-label" style="margin-top:6px;text-align:center;">
            {{ teamBData() ? 'Group ' + teamBData()!.group + ' · FIFA #' + teamBData()!.fifaRank : '' }}
          </div>
        </div>
      </div>

      <!-- Same-team warning -->
      <div *ngIf="teamAData() && teamBData() && h2hTeamA() === h2hTeamB()" class="empty-state-card" style="border-color:rgba(232,184,75,0.3);background:rgba(232,184,75,0.03);">
        <div class="empty-state-copy">⚠️ Both selectors are set to the same team. Pick two different teams for a meaningful comparison.</div>
      </div>

      <!-- Results (only when both teams selected and different) -->
      <ng-container *ngIf="teamAData() && teamBData() && h2hTeamA() !== h2hTeamB()">
        <!-- Hero -->
        <div class="h2h-hero">
          <div class="h2h-hero-team">
            <div class="h2h-hero-flag">{{ teamAData()!.flag }}</div>
            <div class="h2h-hero-name">{{ teamAData()!.name }}</div>
            <div class="h2h-hero-elo">{{ teamAData()!.elo }} Elo</div>
          </div>
          <div class="h2h-hero-center">
            <div class="h2h-hero-score">{{ predictedScore() }}</div>
            <div class="h2h-hero-label">Predicted Score</div>
            <div class="h2h-hero-probs" *ngIf="probsData() as p">
              <div class="h2h-prob-bar">
                <div class="h2h-prob-fill h2h-prob-win" [style.width.%]="p.pw * 100"></div>
                <div class="h2h-prob-fill h2h-prob-draw" [style.width.%]="p.pd * 100"></div>
              </div>
              <div class="h2h-prob-labels">
                <span>{{ (p.pw * 100).toFixed(0) }}% Win</span>
                <span>{{ (p.pd * 100).toFixed(0) }}% Draw</span>
                <span>{{ (p.pl * 100).toFixed(0) }}% Loss</span>
              </div>
            </div>
          </div>
          <div class="h2h-hero-team">
            <div class="h2h-hero-flag">{{ teamBData()!.flag }}</div>
            <div class="h2h-hero-name">{{ teamBData()!.name }}</div>
            <div class="h2h-hero-elo">{{ teamBData()!.elo }} Elo</div>
          </div>
        </div>

        <!-- Stat Rows -->
        <div class="h2h-stats">
          <div class="h2h-stat-row">
            <div class="h2h-stat-val" [style.color]="eloDiffColor(probsData().effA - probsData().effB)">{{ probsData().effA.toFixed(0) }}</div>
            <div class="h2h-stat-label">Effective Rating</div>
            <div class="h2h-stat-val" [style.color]="eloDiffColor(probsData().effB - probsData().effA)">{{ probsData().effB.toFixed(0) }}</div>
          </div>
          <div class="h2h-stat-row">
            <div class="h2h-stat-val">{{ teamAData()!.elo }}</div>
            <div class="h2h-stat-label">Base Elo</div>
            <div class="h2h-stat-val">{{ teamBData()!.elo }}</div>
          </div>
          <div class="h2h-stat-row">
            <div class="h2h-stat-val" [style.color]="probsData().fa >= 0 ? 'var(--green)' : 'var(--red)'">{{ probsData().fa >= 0 ? '+' : '' }}{{ probsData().fa.toFixed(1) }}</div>
            <div class="h2h-stat-label">Form Modifier</div>
            <div class="h2h-stat-val" [style.color]="probsData().fb >= 0 ? 'var(--green)' : 'var(--red)'">{{ probsData().fb >= 0 ? '+' : '' }}{{ probsData().fb.toFixed(1) }}</div>
          </div>
          <div class="h2h-stat-row" *ngIf="probsData().ha > 0 || probsData().hb > 0">
            <div class="h2h-stat-val" style="color:var(--gold)">+{{ probsData().ha }}</div>
            <div class="h2h-stat-label">Host Advantage</div>
            <div class="h2h-stat-val" style="color:var(--gold)">+{{ probsData().hb }}</div>
          </div>
          <div class="h2h-stat-row">
            <div class="h2h-stat-val" [style.color]="eloDiffColor(probsData().gap)">{{ probsData().gap >= 0 ? '+' : '' }}{{ probsData().gap.toFixed(0) }}</div>
            <div class="h2h-stat-label">Rating Gap</div>
            <div class="h2h-stat-val" [style.color]="eloDiffColor(-probsData().gap)">{{ -probsData().gap >= 0 ? '+' : '' }}{{ (-probsData().gap).toFixed(0) }}</div>
          </div>
          <div class="h2h-stat-row">
            <div class="h2h-stat-val">{{ probsData().lA.toFixed(3) }}</div>
            <div class="h2h-stat-label">Expected Goals (λ)</div>
            <div class="h2h-stat-val">{{ probsData().lB.toFixed(3) }}</div>
          </div>
        </div>

        <!-- Math Breakdown -->
        <div class="h2h-math">
          <div class="h2h-math-title">Match Model Parameters</div>
          <div class="h2h-math-grid">
            <div class="h2h-math-item">
              <span class="h2h-math-label">Dixon-Coles ρ</span>
              <span class="h2h-math-val">{{ probsData().rho.toFixed(3) }}</span>
            </div>
            <div class="h2h-math-item">
              <span class="h2h-math-label">Win Probability</span>
              <span class="h2h-math-val">{{ (probsData().pw * 100).toFixed(1) }}%</span>
            </div>
            <div class="h2h-math-item">
              <span class="h2h-math-label">Draw Probability</span>
              <span class="h2h-math-val">{{ (probsData().pd * 100).toFixed(1) }}%</span>
            </div>
            <div class="h2h-math-item">
              <span class="h2h-math-label">Loss Probability</span>
              <span class="h2h-math-val">{{ (probsData().pl * 100).toFixed(1) }}%</span>
            </div>
            <div class="h2h-math-item">
              <span class="h2h-math-label">Team A Attack</span>
              <span class="h2h-math-val">{{ (probsData().effA + probsData().gap * 0.5).toFixed(0) }}</span>
            </div>
            <div class="h2h-math-item">
              <span class="h2h-math-label">Team A Defense</span>
              <span class="h2h-math-val">{{ (probsData().effA - probsData().gap * 0.5).toFixed(0) }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Empty state -->
      <!-- Loading skeleton for initial team load -->
      <div *ngIf="!teamAData() || !teamBData()" class="empty-state-card">
        <div class="empty-state-copy">Select two teams above to see a detailed head-to-head comparison.</div>
      </div>

      <!-- Skeleton while teams are loading -->
      <div *ngIf="teamService.loading() && !teamAData()" class="skeleton-card">
        <div class="skeleton-row">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton skeleton-cell" style="flex:1;"></div>
          <div class="skeleton skeleton-cell-sm"></div>
        </div>
        <div class="skeleton-row" style="justify-content:center;">
          <div class="skeleton skeleton-cell-lg" style="width:120px;"></div>
        </div>
        <div class="skeleton-row">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton skeleton-cell" style="flex:1;"></div>
          <div class="skeleton skeleton-cell-sm"></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    '.h2h-intro { font-size: 13px; color: var(--text2); margin-bottom: 20px; line-height: 1.6; }',
    '.h2h-pickers { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: end; margin-bottom: 24px; }',
    '.h2h-picker-col { min-width: 0; position: relative; }',
    '.h2h-vs-col { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-bottom: 4px; }',
    '.h2h-swap-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border2); background: var(--card2); color: var(--gold); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }',
    '.h2h-swap-btn:hover { border-color: var(--gold); background: var(--gold-dim); transform: rotate(180deg); }',
    '.h2h-vs-text { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 0.1em; }',
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
    '.stat-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 4px; }',
    '.empty-state-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 12px; }',
    '.empty-state-copy { color: var(--text3); font-family: var(--font-mono); font-size: 12px; }',
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
    '.h2h-stats { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; }',
    '.h2h-stat-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; padding: 10px 16px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; }',
    '.h2h-stat-row:first-child { border-color: var(--border2); }',
    '.h2h-stat-val { font-family: var(--font-head); font-size: 20px; letter-spacing: 0.04em; text-align: center; color: var(--text); }',
    '.h2h-stat-label { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; text-align: center; padding: 0 8px; }',
    '.h2h-math { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }',
    '.h2h-math-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }',
    '.h2h-math-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }',
    '.h2h-math-item { display: flex; flex-direction: column; gap: 2px; padding: 8px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; text-align: center; }',
    '.h2h-math-label { font-family: var(--font-mono); font-size: 9px; color: var(--text3); letter-spacing: 0.06em; }',
    '.h2h-math-val { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--gold); }',
    '@media (max-width: 768px) { .h2h-pickers { grid-template-columns: 1fr; } .h2h-vs-col { flex-direction: row; gap: 12px; padding: 8px 0; justify-content: center; } .h2h-hero { grid-template-columns: 1fr; gap: 12px; } .h2h-hero-center { order: -1; } .h2h-hero-flag { font-size: 36px; } .h2h-hero-name { font-size: 18px; } .h2h-hero-score { font-size: 26px; } .h2h-math-grid { grid-template-columns: repeat(2, 1fr); } }',
    '@media (max-width: 480px) { .h2h-hero { padding: 16px; } .h2h-hero-flag { font-size: 28px; } .h2h-hero-name { font-size: 16px; } .h2h-hero-score { font-size: 22px; } .h2h-stat-row { padding: 8px 10px; } .h2h-stat-val { font-size: 16px; } .h2h-math-grid { grid-template-columns: 1fr; } }',
  ]
})
export class HeadToHeadComponent implements OnInit {
  readonly teamService = inject(TeamService);
  private readonly simService = inject(SimulationService);

  readonly h2hTeamA = signal('ARG');
  readonly h2hTeamB = signal('FRA');
  readonly searchA = signal('');
  readonly searchB = signal('');
  readonly showDropdownA = signal(false);
  readonly showDropdownB = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.h2h-picker-col')) {
      this.showDropdownA.set(false);
      this.showDropdownB.set(false);
    }
  }

  ngOnInit(): void {
    // Ensure teams are loaded
    if (this.teamService.teams().length === 0) {
      void this.teamService.loadTeams(false);
    }
  }

  teamAData(): Team | undefined {
    return this.teamService.findTeam(this.h2hTeamA());
  }

  teamBData(): Team | undefined {
    return this.teamService.findTeam(this.h2hTeamB());
  }

  filteredA(): Team[] {
    const q = this.searchA().toLowerCase();
    return this.sortedTeams().filter(t =>
      !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }

  filteredB(): Team[] {
    const q = this.searchB().toLowerCase();
    return this.sortedTeams().filter(t =>
      !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  }

  private sortedTeams(): Team[] {
    return [...this.teamService.teams()].sort((a, b) => a.name.localeCompare(b.name));
  }

  toggleDropdown(side: 'A' | 'B'): void {
    if (side === 'A') {
      this.showDropdownA.update(v => !v);
      if (this.showDropdownA()) this.showDropdownB.set(false);
    } else {
      this.showDropdownB.update(v => !v);
      if (this.showDropdownB()) this.showDropdownA.set(false);
    }
  }

  selectTeam(side: 'A' | 'B', id: string): void {
    if (side === 'A') {
      this.h2hTeamA.set(id);
      this.showDropdownA.set(false);
      this.searchA.set('');
    } else {
      this.h2hTeamB.set(id);
      this.showDropdownB.set(false);
      this.searchB.set('');
    }
  }

  swapTeams(): void {
    const temp = this.h2hTeamA();
    this.h2hTeamA.set(this.h2hTeamB());
    this.h2hTeamB.set(temp);
  }

  probsData() {
    const a = this.teamAData();
    const b = this.teamBData();
    if (!a || !b) {
      return { pw: 0, pd: 0, pl: 0, lA: 0, lB: 0, rho: 0, fa: 0, fb: 0, ha: 0, hb: 0, effA: 0, effB: 0, gap: 0 };
    }
    const fa = this.simService.formMod(a.id, this.teamService.recentMatches());
    const fb = this.simService.formMod(b.id, this.teamService.recentMatches());
    const ha = a.host && !b.host ? 75 : 0;
    const hb = b.host && !a.host ? 75 : 0;
    const effA = a.elo + ha + fa;
    const effB = b.elo + hb + fb;
    const probs = this.simService.winDrawLossProbs(a, b, this.teamService.recentMatches());
    return { ...probs, fa, fb, ha, hb, effA, effB, gap: effA - effB };
  }

  predictedScore(): string {
    const a = this.teamAData();
    const b = this.teamBData();
    if (!a || !b) return '—';
    const { lA, lB } = this.probsData();
    return `${a.flag} ${Math.round(lA)} – ${Math.round(lB)} ${b.flag}`;
  }

  eloDiffColor(diff: number): string {
    if (diff > 0) return 'var(--green)';
    if (diff < 0) return 'var(--red)';
    return 'var(--text2)';
  }
}
