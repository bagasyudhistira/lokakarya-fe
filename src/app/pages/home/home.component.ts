import { MenuManagerService } from './../../services/menu-manager.service';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  menuNames: string[] = [];
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private menuManagerService: MenuManagerService
  ) {}
  ngOnInit(): void {
    const roles = this.authService.getUserRoles(); // Retrieve all roles for the user

    if (roles.length > 0) {
      this.menuManagerService.getMenusByRoles(roles).subscribe({
        next: (responses: any[]) => {
          // Consolidate all menu names, ensuring no duplicates
          const allMenus = responses.flatMap((response: any) =>
            response.content.map((menu: any) => menu.menu_name)
          );
          this.menuNames = [...new Set(allMenus)]; // Remove duplicates
        },
        error: (err) => {
          this.errorMessage = 'Failed to load menus for roles.';
          console.error(err);
        },
      });
    } else {
      this.errorMessage = 'No roles found.';
    }
  }
}
