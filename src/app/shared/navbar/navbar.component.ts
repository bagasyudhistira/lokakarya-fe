import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuManagerService } from '../../services/menu-manager.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { PrimeNgModule } from '../primeng/primeng.module';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  imports: [TitleCasePipe, CommonModule, PrimeNgModule, ConfirmDialogModule],
  styleUrls: ['./navbar.component.scss'],
  providers: [ConfirmationService],
})
export class NavbarComponent implements OnInit {
  @Output() onLogout = new EventEmitter<void>();
  manageMenus: string[] = [];
  submitMenus: string[] = [];
  otherMenus: string[] = [];
  userName: string | null = null;
  errorMessage: string = '';
  loading: boolean = true;
  isHomePage: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private menuManagerService: MenuManagerService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadNavbarData();
  }

  loadNavbarData(): void {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userName = payload.fullName;

    const roles = this.authService.getUserRoles();
    const menuNamesRequest = this.menuManagerService.getMenusByRoles(roles);

    menuNamesRequest.subscribe({
      next: (menuResponses: any[]) => {
        const allMenus = menuResponses.flatMap((response: any) =>
          response.content.map((menu: any) => menu.menu_name)
        );

        this.manageMenus = [
          ...new Set(allMenus.filter((menu) => menu.startsWith('manage-'))),
        ];
        this.submitMenus = [
          ...new Set(allMenus.filter((menu) => menu.startsWith('employee-'))),
        ];
        this.otherMenus = [
          ...new Set(
            allMenus.filter(
              (menu) =>
                !menu.startsWith('manage-') && !menu.startsWith('employee-')
            )
          ),
        ];
      },
      error: (err) => {
        console.error('Failed to load menus:', err);
        this.errorMessage = 'Failed to load menus.';
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
    this.confirmationService.confirm({
      message: 'Are you sure you want to log out?',
      header: 'Confirm Logout',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // User confirmed logout
        this.onLogout.emit();
        localStorage.clear();
        this.router.navigate(['/login'], {
          queryParams: { warning: 'You have been successfully logged out.' },
        });
      },
      reject: () => {
        // User canceled logout
        console.log('Logout canceled.');
      },
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
