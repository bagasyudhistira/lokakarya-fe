import { MenuManagerService } from './../../services/menu-manager.service';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  menuNames: string[] = [];
  errorMessage: string = '';
  loading: boolean = true;

  constructor(
    private authService: AuthService,
    private menuManagerService: MenuManagerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const roles = this.authService.getUserRoles();

    if (roles.length > 0) {
      this.menuManagerService.getMenusByRoles(roles).subscribe({
        next: (responses: any[]) => {
          const allMenus = responses.flatMap((response: any) =>
            response.content.map((menu: any) => menu.menu_name)
          );
          this.menuNames = [...new Set(allMenus)];
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load menus for roles.';
          console.error(err);
          this.loading = false;
        },
      });
    } else {
      this.errorMessage = 'No roles found.';
      this.loading = false;
    }
  }
  logout(): void {
    sessionStorage.clear(); // Clear session storage
    this.router.navigate(['/login'], {
      queryParams: { warning: 'You have been successfully logged out.' },
    });
  }
}
