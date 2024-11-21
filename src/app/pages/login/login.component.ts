import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false; // Tracks the loading state

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';
    const loginPayload = { username: this.username, password: this.password };

    this.http
      .post('http://localhost:8081/auth/sign-in', loginPayload, {
        responseType: 'text',
      })
      .subscribe({
        next: (token: string) => {
          console.log('JWT token received:', token);
          sessionStorage.setItem('auth-token', token);

          // Decode JWT to extract data (optional)
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Decoded JWT payload:', payload);

          this.router.navigate(['/home']);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Login error:', err);
          this.errorMessage =
            err.status === 401
              ? 'Invalid username or password'
              : 'An unexpected error occurred.';
          this.isLoading = false;
        },
      });
  }
}
