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
  styles: []
})
export class LiveComponent {}
