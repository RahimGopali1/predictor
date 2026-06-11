import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AdminStats, PredictionService } from '../../services/prediction.service';
import { UserPrediction } from '../../models/team.model';

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements AfterViewInit, OnDestroy {
  private readonly predictionService = inject(PredictionService);

  @ViewChild('championChart') championChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sandboxChart') sandboxChartRef!: ElementRef<HTMLCanvasElement>;

  adminKey = localStorage.getItem('wc_admin_key') || '';
  authenticated = signal(false);
  loading = signal(false);
  error = signal('');
  stats = signal<AdminStats | null>(null);
  predictions = signal<UserPrediction[]>([]);

  private championChart: Chart | null = null;
  private sandboxChart: Chart | null = null;

  ngAfterViewInit(): void {
    if (this.adminKey) void this.login();
  }

  ngOnDestroy(): void {
    this.championChart?.destroy();
    this.sandboxChart?.destroy();
  }

  async login(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    localStorage.setItem('wc_admin_key', this.adminKey);
    try {
      const [stats, predictions] = await Promise.all([
        this.predictionService.getAdminStats(this.adminKey),
        this.predictionService.getAdminPredictions(this.adminKey)
      ]);
      this.stats.set(stats);
      this.predictions.set(predictions);
      this.authenticated.set(true);
      setTimeout(() => this.renderCharts(), 0);
    } catch {
      this.error.set('Invalid admin key');
      this.authenticated.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    await this.login();
  }

  private renderCharts(): void {
    const stats = this.stats();
    if (!stats) return;

    this.renderChampionChart(stats);
    this.renderSandboxChart(stats);
  }

  private renderChampionChart(stats: AdminStats): void {
    if (!this.championChartRef) return;
    this.championChart?.destroy();
    const top = stats.championStats.slice(0, 10);
    const labels = top.map(s => `${s.flag} ${s.name}`);
    let data = top.map(s => s.count);

    // If champion picks are overwhelmingly one team (e.g. only Argentina chosen),
    // fall back to using aggregated top-picks percentage so the chart shows multiple teams.
    const nonZero = data.filter(d => d > 0).length;
    let datasetLabel = 'Champion Picks';
    if (nonZero <= 1) {
      data = top.map(s => Math.round((s.pct + Number.EPSILON) * 100) / 100); // use pct (rounded)
      datasetLabel = 'Champion Picks (%)';
    }

    this.championChart = new Chart(this.championChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: datasetLabel,
          data,
          backgroundColor: 'rgba(232, 184, 75, 0.65)',
          borderColor: 'rgba(232, 184, 75, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8fa890' } }
        },
        scales: {
          x: { ticks: { color: '#8fa890' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#8fa890' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }

  private renderSandboxChart(stats: AdminStats): void {
    if (!this.sandboxChartRef) return;
    this.sandboxChart?.destroy();

    const labels = stats.sandboxStats.slice(0, 10).map(s => `${s.flag} ${s.name}`);
    const data = stats.sandboxStats.slice(0, 10).map(s => s.count);

    this.sandboxChart = new Chart(this.sandboxChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Most Simulated Teams',
          data,
          backgroundColor: 'rgba(77, 159, 255, 0.65)',
          borderColor: 'rgba(77, 159, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { labels: { color: '#8fa890' } }
        },
        scales: {
          x: { ticks: { color: '#8fa890', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
          y: { ticks: { color: '#8fa890' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }
}
