import { Routes } from '@angular/router';
import { PredictorComponent } from './pages/predictor/predictor.component';
import { AdminComponent } from './pages/admin/admin.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' }
];
