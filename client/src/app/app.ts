import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService } from './services/theme.service';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgFor],
  template: `
    <!-- Global Navigation Header -->
    <header class="site-header">
      <div class="nav-inner">
        <a routerLink="/" class="nav-brand" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <span class="brand-icon">🏆</span>
          <span class="brand-text">
            <span class="brand-title">WORLD CUP</span>
            <span class="brand-sub">PREDICTOR</span>
          </span>
        </a>

        <nav class="nav-links" [class.nav-open]="mobileMenuOpen">
          <a *ngFor="let link of navLinks"
             [routerLink]="link.path"
             routerLinkActive="nav-active"
             [routerLinkActiveOptions]="{ exact: link.path === '/' }"
             class="nav-link"
             (click)="mobileMenuOpen = false">
            <span class="nav-label">{{ link.label }}</span>
          </a>
        </nav>

        <div class="nav-actions">
          <button class="nav-theme-btn" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
            {{ theme.isDark() ? '☀️' : '🌙' }}
          </button>
          <button class="nav-hamburger" (click)="mobileMenuOpen = !mobileMenuOpen" [attr.aria-expanded]="mobileMenuOpen">
            <span class="hamb-line" [class.open]="mobileMenuOpen"></span>
            <span class="hamb-line" [class.open]="mobileMenuOpen"></span>
            <span class="hamb-line" [class.open]="mobileMenuOpen"></span>
          </button>
        </div>
      </div>

      <!-- Mobile Overlay -->
      <div class="nav-overlay" *ngIf="mobileMenuOpen" (click)="mobileMenuOpen = false"></div>
    </header>

    <!-- Main Content -->
    <main>
      <router-outlet></router-outlet>
    </main>

    <!-- Footer -->
    <footer class="site-footer" *ngIf="showFooter">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-icon">🏆</span>
          <span class="footer-text">2026 FIFA WORLD CUP PREDICTOR</span>
        </div>
        <div class="footer-links">
          <a routerLink="/" class="footer-link">Predictor</a>
          <a routerLink="/scores" class="footer-link">Live</a>
          <a routerLink="/standings" class="footer-link">Standings</a>
          <a routerLink="/compare" class="footer-link">Compare</a>
          <a routerLink="/leaderboard" class="footer-link">Leaderboard</a>
        </div>
        <div class="footer-disclaimer">
          Dixon-Coles Model · Monte Carlo Engine · For entertainment purposes only
        </div>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; }

    /* ── Site Header / Nav ── */
    .site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(8, 12, 10, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
    }
    [data-theme="light"] .site-header {
      background: rgba(242, 245, 242, 0.92);
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
      height: 60px;
      gap: 16px;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand-icon { font-size: 26px; line-height: 1; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
    .brand-title {
      font-family: var(--font-head);
      font-size: 20px;
      letter-spacing: 0.08em;
      color: var(--gold);
    }
    .brand-sub {
      font-family: var(--font-mono);
      font-size: 9px;
      letter-spacing: 0.18em;
      color: var(--text3);
      text-transform: uppercase;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text2);
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .nav-link:hover {
      color: var(--text);
      background: var(--hover-bg);
    }
    .nav-link.nav-active {
      color: var(--gold);
      background: var(--gold-dim);
    }

    .nav-label { font-size: 12px; letter-spacing: 0.02em; }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-theme-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--border2);
      background: var(--card2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s;
    }
    .nav-theme-btn:hover {
      border-color: var(--gold);
      transform: scale(1.1);
    }
    .nav-hamburger {
      display: none;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
    }
    .hamb-line {
      display: block;
      width: 22px;
      height: 2px;
      background: var(--text2);
      border-radius: 2px;
      transition: all 0.3s;
    }
    .hamb-line.open:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    .hamb-line.open:nth-child(2) { opacity: 0; }
    .hamb-line.open:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
    .nav-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: -1;
    }

    /* ── Footer ── */
    .site-footer {
      border-top: 1px solid var(--border);
      margin-top: 60px;
      padding: 32px 0;
    }
    .footer-inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      text-align: center;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-icon { font-size: 20px; }
    .footer-text {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.12em;
      color: var(--text3);
    }
    .footer-links {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-link {
      color: var(--text2);
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .footer-link:hover { color: var(--gold); }
    .footer-disclaimer {
      font-size: 10px;
      color: var(--text3);
      font-family: var(--font-mono);
      letter-spacing: 0.06em;
      opacity: 0.7;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .nav-inner {
        padding: 0 16px;
        height: 56px;
      }
      .brand-title { font-size: 17px; }
      .brand-sub { font-size: 8px; }
      .nav-links {
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        flex-direction: column;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        padding: 12px 16px;
        gap: 2px;
        transform: translateY(-100%);
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .nav-links.nav-open {
        transform: translateY(0);
        opacity: 1;
        pointer-events: all;
      }
      .nav-link {
        padding: 10px 14px;
        width: 100%;
        border-radius: 6px;
      }
      .nav-label { font-size: 13px; }
      .nav-hamburger { display: flex; }
      .nav-overlay { display: block; }
      .footer-inner { padding: 0 16px; }
      .footer-links { gap: 12px; }
    }
  `]
})
export class App implements OnDestroy {
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);
  showFooter = true;
  mobileMenuOpen = false;
  private sub: Subscription | null = null;

  readonly navLinks: NavLink[] = [
    { path: '/', label: 'Predictor', icon: '' },
    { path: '/scores', label: 'Live Scores', icon: '' },
    { path: '/standings', label: 'Standings', icon: '' },
    { path: '/compare', label: 'Compare', icon: '' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '' },
  ];

  constructor() {
    try {
      const url = this.router.url || '';
      this.showFooter = !url.startsWith('/predictor');
    } catch {
      this.showFooter = true;
    }

    this.sub = this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        const u = (e as NavigationEnd).urlAfterRedirects || (e as NavigationEnd).url;
        this.showFooter = !u.startsWith('/predictor');
        this.mobileMenuOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
