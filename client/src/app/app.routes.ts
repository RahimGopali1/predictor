import { Routes } from '@angular/router';
import { PredictorComponent } from './pages/predictor/predictor.component';
import { AdminComponent } from './pages/admin/admin.component';
import { PredictionTrackerComponent } from './pages/prediction-tracker/prediction-tracker.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  { path: 'live/match', loadComponent: () => import('./pages/live-match-center/live-match-center.component').then(m => m.LiveMatchCenterComponent) },
  { path: 'live/match/:id', loadComponent: () => import('./pages/live-match-center/live-match-center.component').then(m => m.LiveMatchCenterComponent) },
  { path: 'live', redirectTo: '/live/match', pathMatch: 'full' },
  { path: 'prediction-tracker', component: PredictionTrackerComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' }
];
