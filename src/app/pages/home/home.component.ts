import { ConfirmationService, MessageService } from 'primeng/api';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    PrimeNgModule,
    NavbarComponent,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [ConfirmationService, MessageService],
})
export class HomeComponent {
  userDetails: any = null;
  errorMessage: string = '';
  loading: boolean = true;
  userId: string = '';
  displayChangePasswordDialog: boolean = false;
  changePasswordForm!: FormGroup;
  changePassLoading: boolean = false;
  passwordMatches: boolean = false;
  currentRoles: any[] = this.extractCurrentRoles() || [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.initializeForm();
  }

  loadUserData(): void {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userId = payload.userId;

    this.http
      .get(`https://lokakarya-be.up.railway.app/appuser/get/${this.userId}`)
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

  private initializeForm() {
    console.log('Initializing Change Password Form...');
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
  }

  openChangePasswordDialog(): void {
    this.displayChangePasswordDialog = true;
    this.changePasswordForm.reset();
  }

  changePassword(): void {
    if (!this.changePasswordForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Form',
        detail: 'Please fill out all fields correctly.',
      });
      return;
    }

    console.log('Attempting to change password...');

    this.confirmationService.confirm({
      message: 'Are you sure you want to change your password?',
      header: 'Confirm Change Password',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.changePassLoading = true;

        const currentPassword = this.changePasswordForm.value.currentPassword;
        const newPassword = this.changePasswordForm.value.newPassword;

        const loginPayload = {
          username: this.userDetails.username,
          password: currentPassword,
        };

        this.http
          .post(
            'https://lokakarya-be.up.railway.app/auth/sign-in',
            loginPayload,
            {
              responseType: 'text',
            }
          )
          .pipe(
            switchMap(() => {
              if (newPassword == currentPassword) {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail:
                    'New password cannot be the same as the current password.',
                });
                this.changePassLoading = false;
                return EMPTY;
              }
              const changePassPayload = {
                user_id: this.userId,
                new_password: newPassword,
              };
              return this.http.put(
                'https://lokakarya-be.up.railway.app/auth/changepassword',
                changePassPayload
              );
            }),
            finalize(() => {
              this.changePassLoading = false;
            })
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Password Changed',
                detail: 'Your password has been successfully updated.',
              });
              this.displayChangePasswordDialog = false;
              this.changePasswordForm.reset();
            },
            error: (err) => {
              console.error('Error:', err);
              if (err.status === 500) {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail: 'Current password is incorrect.',
                });
                this.changePassLoading = false;
              } else if (err.status === 400) {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail: 'Invalid request. Please try again.',
                });
                this.changePassLoading = false;
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail:
                    'An unexpected error occurred. Please try again later.',
                });
                this.changePassLoading = false;
              }
            },
          });
      },
      reject: () => {
        console.log('Password change canceled by user.');
        this.changePassLoading = false;
      },
    });
  }

  checkPasswordMatch(): boolean {
    console.log('Checking password match...');
    this.passwordMatches =
      this.changePasswordForm.value.newPassword ===
      this.changePasswordForm.value.confirmPassword;
    console.log('Password Match:', this.passwordMatches);
    return this.passwordMatches;
  }

  private extractCurrentRoles(): any[] {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return [];
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        console.log('Decoded roles:', decoded.roles);
        return decoded.roles;
      } else {
        console.error('roles not found in JWT.');
        return [];
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return [];
    }
  }
}
