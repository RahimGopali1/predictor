import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <nav class="live-tabs">
        <a routerLink="/live/scores" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="live-tab">Live Scores</a>
        <a routerLink="/live/match" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="live-tab">Match Center</a>
      </nav>

      <section>
        <router-outlet></router-outlet>
      </section>
    </div>
  `
  ,
  styles: [
    ".live-tabs { display:flex; justify-content:center; gap:16px; margin:22px 0; position:sticky; top:12px; z-index:40; }",
    ".live-tab { display:inline-flex; align-items:center; justify-content:center; padding:12px 20px; border-radius:999px; background:var(--card); border:1px solid var(--border); color:var(--text); font-weight:700; text-decoration:none; box-shadow: 0 6px 18px rgba(0,0,0,0.12); transition: all 0.18s ease; }",
    ".live-tab.active { background: linear-gradient(90deg, rgba(232,184,75,0.12), rgba(45,206,110,0.06)); border-color: rgba(232,184,75,0.28); color: var(--gold); transform: translateY(-2px); box-shadow: 0 14px 40px rgba(0,0,0,0.25); }",
    ".live-tab:hover { transform: translateY(-2px); border-color: var(--gold); }",
  ]
})
export class LiveComponent {}
