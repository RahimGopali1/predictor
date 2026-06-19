import { Routes } from '@angular/router';
import { PredictorComponent } from './pages/predictor/predictor.component';
import { AdminComponent } from './pages/admin/admin.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  {
    path: 'scores',
    loadComponent: () => import('./pages/live-match-center/live-match-center.component').then(m => m.LiveMatchCenterComponent)
  },
  {
    path: 'scores/:id',
    loadComponent: () => import('./pages/live-match-center/live-match-center.component').then(m => m.LiveMatchCenterComponent)
  },
  {
    path: 'standings',
    loadComponent: () => import('./pages/group-standings/group-standings.component').then(m => m.GroupStandingsComponent)
  },
  {
    path: 'compare',
    loadComponent: () => import('./pages/head-to-head/head-to-head.component').then(m => m.HeadToHeadComponent)
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
  },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' }
];
