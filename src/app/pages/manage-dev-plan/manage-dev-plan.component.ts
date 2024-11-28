import { Component } from '@angular/core';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-dev-plan',
  standalone: true,
  imports: [NavbarComponent, PrimeNgModule, CommonModule],
  templateUrl: './manage-dev-plan.component.html',
  styleUrl: './manage-dev-plan.component.scss',
})
export class ManageDevPlanComponent {}
