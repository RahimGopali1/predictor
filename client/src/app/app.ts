import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgIf],
  template: `
    <router-outlet></router-outlet>
    <footer *ngIf="showFooter">
      2026 FIFA WORLD CUP PREDICTOR · DIXON-COLES MODEL · MONTE CARLO ENGINE · FOR ENTERTAINMENT PURPOSES
    </footer>
  `
})
export class App implements OnDestroy {
  private readonly router = inject(Router);
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
