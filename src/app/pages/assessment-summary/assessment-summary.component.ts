import { Component, OnInit } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { NgForOf, NgIf } from '@angular/common';
import { MessageService, PrimeNGConfig, PrimeTemplate } from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-assessment-summary',
  standalone: true,
  imports: [
    ButtonDirective,
    CalendarModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    InputSwitchModule,
    InputTextModule,
    NgForOf,
    NgIf,
    PrimeTemplate,
    RadioButtonModule,
    ReactiveFormsModule,
    ToastModule,
    PrimeNgModule,
    NavbarComponent,
  ],
  templateUrl: './assessment-summary.component.html',
  styleUrls: ['./assessment-summary.component.scss'],
  providers: [MessageService],
})
export class AssessmentSummaryComponent implements OnInit {
  empDevPlans: any[] = [];
  loading: boolean = false;
  isProcessing: boolean = false;
  maxDate: Date = new Date();
  employees: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  devPlans: any[] = [];
  selectedUserId: string = '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();
  achievements: any[] = [];
  attitudeSkills: any[] = [];
  suggestions: any[] = [];
  assessmentYear: Date | null = null;

  devPlansMap: Map<string, string> = new Map();

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig
  ) {}

  ngOnInit(): void {
    this.fetchSelectedUserName();
    this.fetchEmployees();
    this.fetchAssessmentSummary();
    this.primengConfig.ripple = true;
    if (
      this.currentRoles.includes('HR') ||
      this.currentRoles.includes('SVP') ||
      this.currentRoles.includes('MGR')
    ) {
      this.fetchEmployees();
      this.selectedUserId = '';
    } else {
      this.selectedUserId = this.currentUserId;
    }
  }

  fetchEmployees(): void {
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/appuser/all')
      .subscribe({
        next: (response) => {
          this.employees = response.content || [];
          console.log('Fetched Employees:', this.employees);
        },
        error: (error) => {
          console.error('Error fetching employees:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employees.',
          });
        },
      });
  }

  private extractCurrentUserId(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.userId) {
        console.log('Decoded userId:', decoded.userId);
        return decoded.userId;
      } else {
        console.error('userId not found in JWT.');
        return null;
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  fetchSelectedUserName(): void {
    if (!this.selectedUserId || this.selectedUserId === '') {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }
    const userUrl = `https://lokakarya-be.up.railway.app/appuser/get/${this.selectedUserId}`;

    this.http.get<any>(userUrl).subscribe({
      next: (response) => {
        const user = response.content;
        if (user && user.full_name) {
          this.selectedName = user.full_name;
          console.log('Fetched User Full Name:', this.selectedName);
        } else {
          console.warn('User full name not found in response.');
          this.selectedName = '';
        }
      },
      error: (error) => {
        console.error('Error fetching user full name:', error);
        this.selectedName = '';
      },
    });
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

  fetchAchievementSummary(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Achievement Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      this.loading = true;

      const summaryUrl = `https://lokakarya-be.up.railway.app/assessmentsummary/achievementsummary`;

      const requestBody = {
        user_id: this.selectedUserId,
        assessment_year: this.selectedYear,
      };

      console.log(
        'Sending Request to URL:',
        summaryUrl,
        'with body:',
        requestBody
      );

      this.http
        .post<any>(summaryUrl, requestBody)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.achievements = response.content || [];
            console.log('Fetched Achievement Summary:', this.achievements);
            resolve();
          },
          error: (error) => {
            console.error('Error Fetching Achievement Summary:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch achievement summary.',
            });
            reject(error);
          },
        });
    });
  }

  fetchAttitudeSkillSummary(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Attitude Skill Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      this.loading = true;

      const summaryUrl = `https://lokakarya-be.up.railway.app/assessmentsummary/attitudeskillsummary`;

      const requestBody = {
        user_id: this.selectedUserId,
        assessment_year: this.selectedYear,
      };

      console.log(
        'Sending Request to URL:',
        summaryUrl,
        'with body:',
        requestBody
      );

      this.http
        .post<any>(summaryUrl, requestBody)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.attitudeSkills = response.content || [];
            console.log('Fetched Attitude Skill Summary:', this.attitudeSkills);
            resolve();
          },
          error: (error) => {
            console.error('Error Fetching Attitude Skill Summary:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch attitude skill summary.',
            });
            reject(error);
          },
        });
    });
  }

  fetchSuggestion(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedUserId) {
        console.warn('No user selected.');
        this.selectedUserId = this.currentUserId;
      }

      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      console.log(
        `Fetching Attitude Skill Summary for ${this.selectedYear} for User ID: ${this.selectedUserId}`
      );

      this.loading = true;

      const summaryUrl =
        'https://lokakarya-be.up.railway.app/empsuggestion/' +
        this.selectedUserId +
        '/' +
        this.selectedYear;

      console.log(
        'Sending Request to URL:',
        summaryUrl,
        'with: ' + this.selectedUserId + ' ' + this.selectedYear
      );

      this.http
        .get<any>(summaryUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.suggestions = response.content || [];
            console.log('Fetched Suggestions:', this.suggestions);
            resolve();
          },
          error: (error) => {
            console.error('Error Fetching Suggestions:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch suggestions.',
            });
            reject(error);
          },
        });
    });
  }

  fetchAssessmentSummary(): void {
    this.fetchAchievementSummary();
    this.fetchAttitudeSkillSummary();
    this.fetchSuggestion();
  }
}
