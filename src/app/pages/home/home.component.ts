import { MenuManagerService } from './../../services/menu-manager.service';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PrimeNgModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  menuNames: string[] = [];
  userDetails: any = null;
  errorMessage: string = '';
  loading: boolean = true;

  constructor(
    private authService: AuthService,
    private menuManagerService: MenuManagerService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.fetchUserDetails();
    this.fetchMenuNames();
  }

  fetchUserDetails() {
    const token = sessionStorage.getItem('auth-token');
    const payload = JSON.parse(atob(token!.split('.')[1]));
    const userId = payload.userId;

    this.http
      .get(`https://lokakarya-be.up.railway.app/appuser/get/${userId}`)
      .subscribe({
        next: (response: any) => {
          this.userDetails = response.content;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load user details.';
          console.error(err);
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  fetchMenuNames() {
    const roles = this.authService.getUserRoles();
    this.menuManagerService.getMenusByRoles(roles).subscribe({
      next: (responses: any[]) => {
        const allMenus = responses.flatMap((response: any) =>
          response.content.map((menu: any) => menu.menu_name)
        );
        this.menuNames = [...new Set(allMenus)];
      },
      error: (err) => {
        this.errorMessage = 'Failed to load menus for roles.';
        console.error(err);
      },
    });
  }
  logout(): void {
    sessionStorage.clear(); // Clear session storage
    this.router.navigate(['/login'], {
      queryParams: { warning: 'You have been successfully logged out.' },
    });
  }

  navigateTo(menu: string): void {
    const route = `/${menu}`; // Adjust this to match your routing structure
    this.router.navigate([route]);
  }
}
