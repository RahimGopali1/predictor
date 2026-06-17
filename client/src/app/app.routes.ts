import { Routes } from '@angular/router';
import { PredictorComponent } from './pages/predictor/predictor.component';
import { AdminComponent } from './pages/admin/admin.component';
import { PredictionTrackerComponent } from './pages/prediction-tracker/prediction-tracker.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  {
    path: 'live',
    loadComponent: () => import('./pages/live/live.component').then(m => m.LiveComponent),
    children: [
      { path: '', redirectTo: 'match', pathMatch: 'full' },
      { path: 'scores', loadComponent: () => import('./pages/live-scores/live-scores.component').then(m => m.LiveScoresComponent) },
      { path: 'match', loadComponent: () => import('./pages/live-match-center/live-match-center.component').then(m => m.LiveMatchCenterComponent) },
      { path: 'match/:id', loadComponent: () => import('./pages/live-match-center/live-match-center.component').then(m => m.LiveMatchCenterComponent) },
    ]
  },
  { path: 'prediction-tracker', component: PredictionTrackerComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' }
];
