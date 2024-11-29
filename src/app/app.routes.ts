import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './guard/auth.guard';
import { ManageUserComponent } from './pages/manage-user/manage-user.component';
import { EmployeeSuggestionComponent } from './pages/employee-suggestion/employee-suggestion.component';
import { ManageDevPlanComponent } from './pages/manage-dev-plan/manage-dev-plan.component';
import { ManageTechnicalSkillComponent } from './pages/manage-technical-skill/manage-technical-skill.component';
import { ManageAttitudeSkillComponent } from './pages/manage-attitude-skill/manage-attitude-skill.component';
import {ManageAchievementComponent} from './pages/manage-achievement/manage-achievement.component';

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
  {
    path: 'employee-suggestion',
    component: EmployeeSuggestionComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-dev-plan',
    component: ManageDevPlanComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-technical-skill',
    component: ManageTechnicalSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-attitude-skill',
    component: ManageAttitudeSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-achievement',
    component: ManageAchievementComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/home' },
];
