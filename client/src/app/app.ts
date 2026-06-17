import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgIf],
  template: `
    <button class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
      <span class="theme-icon">{{ theme.isDark() ? '☀️' : '🌙' }}</span>
    </button>
    <router-outlet></router-outlet>
    <footer *ngIf="showFooter">
      2026 FIFA WORLD CUP PREDICTOR · DIXON-COLES MODEL · MONTE CARLO ENGINE · FOR ENTERTAINMENT PURPOSES
    </footer>
  `,
  styles: [`
    .theme-toggle {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--border2);
      background: var(--card2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      backdrop-filter: blur(8px);
    }
    .theme-toggle:hover {
      border-color: var(--gold);
      transform: scale(1.1);
    }
    .theme-icon {
      font-size: 20px;
      line-height: 1;
    }
  `]
})
export class App implements OnDestroy {
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);
  showFooter = true;
  private sub: Subscription | null = null;

  constructor() {
    // initialize based on current url
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
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
