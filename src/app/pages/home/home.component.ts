import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PrimeNgModule, NavbarComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  userDetails: any = null;
  errorMessage: string = '';
  loading: boolean = true;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.userId;

    this.http
      .get(`https://lokakarya-be-x.up.railway.app/appuser/get/${userId}`)
      .subscribe({
        next: (response: any) => {
          this.userDetails = response.content;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load user data.';
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
}
