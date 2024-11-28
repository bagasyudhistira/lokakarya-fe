import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MenuManagerService } from '../../services/menu-manager.service';
import { AuthService } from '../../services/auth.service';
import { TitleCasePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PrimeNgModule, TitleCasePipe],
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
    this.loadPageData();
  }

  loadPageData(): void {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Decoded JWT payload:', payload);
    const userId = payload.userId;

    const userDetailsRequest = this.http.get(
      `https://lokakarya-be.up.railway.app/appuser/get/${userId}`
    );

    const roles = this.authService.getUserRoles();
    console.log('User Roles:', roles);
    const menuNamesRequest = this.menuManagerService.getMenusByRoles(roles);

    forkJoin([userDetailsRequest, menuNamesRequest]).subscribe({
      next: ([userDetailsResponse, menuResponses]: [any, any[]]) => {
        this.userDetails = userDetailsResponse.content;

        const allMenus = menuResponses.flatMap((response: any) =>
          response.content.map((menu: any) => menu.menu_name)
        );
        this.menuNames = [...new Set(allMenus)];
      },
      error: (err) => {
        this.errorMessage = 'Failed to load page data.';
        console.error(err);
        this.router.navigate(['/login'], {
          queryParams: { warning: 'Session expired. Please log in again.' },
        });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login'], {
      queryParams: { warning: 'You have been successfully logged out.' },
    });
  }

  navigateTo(menu: string): void {
    const route = `/${menu}`;
    this.router.navigate([route]);
  }

  formatMenuName(menu: string): string {
    return menu
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
