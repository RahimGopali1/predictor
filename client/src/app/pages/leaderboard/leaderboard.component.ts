import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LeaderboardResponse, PredictionService } from '../../services/prediction.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wrap leaderboard-wrap">
      <header>
        <div>
          <div class="header-eyebrow">Prediction Accuracy</div>
          <h1>LEADER<br><span>BOARD</span></h1>
          <p class="header-sub">
            Users ranked by prediction accuracy against actual tournament results.
            <ng-container *ngIf="championName()">
              Champion: <strong>{{ championFlag() }} {{ championName() }}</strong>
            </ng-container>
          </p>
        </div>
        <div class="header-controls">
          <a routerLink="/" class="btn-sm" style="text-decoration:none;">← PREDICTOR</a>
          <button class="btn-sm" (click)="load()" [disabled]="loading()">↻ {{ loading() ? 'LOADING...' : 'REFRESH' }}</button>
        </div>
      </header>

      <!-- Champion badge -->
      <div class="champion-banner" *ngIf="championName()">
        <span class="champion-trophy">🏆</span>
        <span class="champion-label">2026 WORLD CHAMPION</span>
        <span class="champion-team">{{ championFlag() }} {{ championName() }}</span>
      </div>

      <!-- Summary stats -->
      <div class="stats-row" *ngIf="!loading() && data() as d">
        <div class="stat-pill">
          <span class="stat-pill-val">{{ d.totalUsers }}</span>
          <span class="stat-pill-lbl">Participants</span>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-val" [style.color]="'var(--green)'">{{ correctCount() }}</span>
          <span class="stat-pill-lbl">Correct Champion Picks</span>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-val" [style.color]="'var(--gold)'">{{ avgScore() }}</span>
          <span class="stat-pill-lbl">Avg Score</span>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div class="card" *ngIf="loading() && entries().length === 0">
        <div class="skeleton skeleton-cell-lg" style="width:140px;margin-bottom:12px;"></div>
        <div class="skeleton skeleton-cell" style="width:60%;margin-bottom:20px;"></div>
        <div *ngFor="let _ of [1,2,3,4,5]" class="skeleton-row">
          <div class="skeleton skeleton-cell-sm"></div>
          <div class="skeleton skeleton-cell" style="flex:1;"></div>
          <div class="skeleton skeleton-flag"></div>
          <div class="skeleton skeleton-cell-sm"></div>
          <div class="skeleton skeleton-cell-sm"></div>
        </div>
      </div>

      <!-- Error state -->
      <div class="card" *ngIf="error() && !loading()">
        <div class="card-title">Unable to load leaderboard</div>
        <p class="card-sub">{{ error() }}</p>
        <button class="btn-primary" (click)="load()">RETRY</button>
      </div>

      <!-- Leaderboard table -->
      <div class="card" *ngIf="entries().length > 0">
        <div class="card-title">Rankings</div>
        <p class="card-sub">
          Scores based on champion pick (50 pts for correct) + top 5 picks (points per furthest stage reached).
        </p>

        <!-- Legend -->
        <div class="legend-bar">
          <span class="legend-dot" style="background:var(--gold);"></span>
          <span>Champion (50pts)</span>
          <span class="legend-dot" style="background:var(--green);"></span>
          <span>Final (30)</span>
          <span class="legend-dot" style="background:var(--blue);"></span>
          <span>SF (20)</span>
          <span class="legend-dot" style="background:var(--text3);"></span>
          <span>QF (10)</span>
          <span class="legend-dot" style="background:var(--badge-amber-bg, #b8860b);"></span>
          <span>R16 (5)</span>
          <span class="legend-dot" style="background:var(--badge-red-bg, #8b0000);"></span>
          <span>Group/R32 (1-3)</span>
        </div>

        <div class="tbl-wrap">
          <table class="lb-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-user">User</th>
                <th class="col-champ">Champion Pick</th>
                <th class="col-top5">Top 5 Performance</th>
                <th class="col-score">Score</th>
                <th class="col-sims">Sims</th>
                <th class="col-date">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of entries(); let i = index"
                  [class.top3]="i < 3"
                  [class.me]="e.userName === myUsername()">
                <td class="col-rank">
                  <span class="rank-badge" [class.rank-1]="e.rank === 1" [class.rank-2]="e.rank === 2" [class.rank-3]="e.rank === 3">
                    {{ e.rank <= 3 ? medalIcon(e.rank) : e.rank }}
                  </span>
                </td>
                <td class="col-user">
                  <div class="user-cell">
                    <span class="user-name">{{ e.userName }}</span>
                    <span class="user-tag" *ngIf="e.userName === myUsername()">YOU</span>
                  </div>
                </td>
                <td class="col-champ">
                  <div class="champ-cell" [class.correct]="e.championCorrect" [class.wrong]="!e.championCorrect">
                    <span class="flag">{{ e.championFlag }}</span>
                    <span>{{ e.championName }}</span>
                    <span class="result-badge" *ngIf="e.championCorrect" style="color:var(--green);font-size:11px;">✓</span>
                    <span class="result-badge" *ngIf="!e.championCorrect" style="color:var(--red);font-size:11px;">✗</span>
                  </div>
                </td>
                <td class="col-top5">
                  <div class="top5-strip">
                    <span *ngFor="let d of e.pickDetails"
                          class="stage-dot"
                          [title]="d.name + ': ' + d.stage + ' (' + d.pts + 'pts)'"
                          [style.background]="stageColor(d.stage)">
                    </span>
                  </div>
                </td>
                <td class="col-score">
                  <div class="score-cell">
                    <span class="score-val">{{ e.totalScore }}</span>
                    <span class="score-breakdown">({{ e.championPts }}+{{ e.topPicksPts }})</span>
                  </div>
                </td>
                <td class="col-sims">{{ e.simsRun.toLocaleString() }}</td>
                <td class="col-date">{{ e.createdAt | date:'MMM d, yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty state -->
      <div class="card" *ngIf="!loading() && entries().length === 0 && !error()">
        <div class="card-title">No predictions yet</div>
        <p class="card-sub">Run simulations on the predictor to see where you rank.</p>
        <a routerLink="/" class="btn-primary" style="display:inline-block;text-decoration:none;width:auto;">GO TO PREDICTOR</a>
      </div>
    </div>

    <footer>
      <div class="wrap">2026 FIFA WORLD CUP PREDICTOR · LEADERBOARD</div>
    </footer>
  `,
  styles: [`
    .leaderboard-wrap { max-width: 1100px; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .header-controls { display: flex; gap: 8px; flex-shrink: 0; }

    .champion-banner {
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.05));
      border: 1px solid rgba(255,215,0,0.25);
      border-radius: 12px; padding: 14px 20px;
      margin-bottom: 16px;
    }
    .champion-trophy { font-size: 28px; }
    .champion-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; }
    .champion-team { font-size: 18px; font-weight: 700; color: var(--text); margin-left: auto; }

    .stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .stat-pill {
      background: var(--card2); border: 1px solid var(--border2);
      border-radius: 10px; padding: 12px 20px;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .stat-pill-val { font-size: 26px; font-weight: 700; font-family: var(--font-mono); color: var(--text); }
    .stat-pill-lbl { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }

    .legend-bar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 10px 0 14px; font-size: 11px; color: var(--text3);
      border-bottom: 1px solid var(--border2); margin-bottom: 10px;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

    .lb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .lb-table th {
      text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 1px; color: var(--text3);
      border-bottom: 1px solid var(--border2); white-space: nowrap;
    }
    .lb-table td { padding: 10px 10px; border-bottom: 1px solid var(--border3); vertical-align: middle; }
    .lb-table tbody tr:hover { background: rgba(255,255,255,0.03); }
    .lb-table tbody tr.top3 { background: rgba(255,215,0,0.03); }
    .lb-table tbody tr.me { background: rgba(77,159,255,0.06); border-left: 3px solid var(--blue); }
    .lb-table tbody tr.me td:first-child { padding-left: 7px; }

    .col-rank { width: 48px; text-align: center; }
    .col-user { min-width: 120px; }
    .col-champ { min-width: 130px; }
    .col-top5 { min-width: 100px; }
    .col-score { min-width: 100px; }
    .col-sims { width: 80px; font-family: var(--font-mono); font-size: 12px; color: var(--text2); }
    .col-date { width: 110px; font-size: 11px; color: var(--text3); font-family: var(--font-mono); }

    .rank-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      font-weight: 700; font-size: 13px; color: var(--text2);
      background: var(--card2); border: 1px solid var(--border2);
    }
    .rank-1 { background: rgba(255,215,0,0.2); border-color: var(--gold); color: var(--gold); font-size: 16px; }
    .rank-2 { background: rgba(192,192,192,0.2); border-color: #c0c0c0; color: #c0c0c0; }
    .rank-3 { background: rgba(205,127,50,0.2); border-color: #cd7f32; color: #cd7f32; }

    .user-cell { display: flex; align-items: center; gap: 6px; }
    .user-name { font-weight: 600; color: var(--text); }
    .user-tag {
      font-size: 9px; font-weight: 700; letter-spacing: 1px; padding: 1px 6px;
      border-radius: 4px; background: var(--blue); color: #fff;
    }

    .champ-cell { display: flex; align-items: center; gap: 6px; font-weight: 500; }
    .champ-cell .flag { font-size: 18px; }
    .champ-cell.correct .flag { filter: drop-shadow(0 0 4px rgba(0,200,0,0.3)); }
    .result-badge { margin-left: auto; }

    .top5-strip { display: flex; gap: 4px; align-items: center; }
    .stage-dot { width: 16px; height: 16px; border-radius: 4px; display: inline-block; border: 1px solid rgba(255,255,255,0.1); }

    .score-cell { display: flex; align-items: baseline; gap: 4px; }
    .score-val { font-size: 16px; font-weight: 700; font-family: var(--font-mono); color: var(--text); }
    .score-breakdown { font-size: 11px; color: var(--text3); font-family: var(--font-mono); }

    .loading-state { display: flex; align-items: center; justify-content: center; padding: 60px 0; flex-direction: column; gap: 16px; color: var(--text3); }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--border2);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: lb-spin 0.8s linear infinite;
    }
    @keyframes lb-spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .col-sims, .col-date { display: none; }
      .champion-banner { flex-wrap: wrap; }
      .champion-team { margin-left: 0; }
      .stats-row { justify-content: center; }
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  private readonly predictionService = inject(PredictionService);

  data = signal<LeaderboardResponse | null>(null);
  loading = signal(false);
  error = signal('');
  myUsername = signal(this.predictionService.getUserName());

  entries = computed(() => this.data()?.leaderboard || []);
  championName = computed(() => this.data()?.championName || null);
  championFlag = computed(() => this.data()?.championFlag || '');
  correctCount = computed(() => this.data()?.leaderboard.filter(e => e.championCorrect).length || 0);
  avgScore = computed(() => {
    const d = this.data();
    if (!d || d.leaderboard.length === 0) return '—';
    const avg = d.leaderboard.reduce((s, e) => s + e.totalScore, 0) / d.leaderboard.length;
    return avg.toFixed(1);
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.predictionService.getLeaderboard();
      this.data.set(result);
    } catch (e) {
      this.error.set('Failed to load leaderboard. Make sure the API server is running.');
    } finally {
      this.loading.set(false);
    }
  }

  medalIcon(rank: number): string {
    return ['🥇', '🥈', '🥉'][rank - 1] || '';
  }

  stageColor(stage: string): string {
    switch (stage) {
      case 'Champion': return 'var(--gold)';
      case 'Final': return 'var(--green, #22c55e)';
      case '3rd': return 'var(--blue)';
      case 'SF': return 'var(--blue, #3b82f6)';
      case 'QF': return 'var(--text3, #888)';
      case 'R16': return '#b8860b';
      case 'R32': return 'var(--badge-red-bg, #8b0000)';
      default: return 'var(--text3, #666)';
    }
  }
}
