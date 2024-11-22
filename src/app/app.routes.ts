import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './guard/auth.guard';
import { ManageUserComponent } from './pages/manage-user/manage-user.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-user',
    component: ManageUserComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/login' },
];
