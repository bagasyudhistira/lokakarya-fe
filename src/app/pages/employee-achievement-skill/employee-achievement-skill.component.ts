import { Component, OnInit } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
  PrimeTemplate,
} from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-employee-achievement-skill',
  standalone: true,
  imports: [
    ButtonDirective,
    CalendarModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
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
    TableModule,
    ToastModule,
    PrimeNgModule,
    NavbarComponent,
  ],
  templateUrl: './employee-achievement-skill.component.html',
  styleUrl: './employee-achievement-skill.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class EmployeeAchievementSkillComponent implements OnInit {
  empAchievementSkills: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  employees: any[] = [];
  mode: 'create' | 'update' = 'create';
  roles: any[] = [];
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  allEmpAchievementSkills: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;
  achievementSkills: any[] = [];

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeAchievementSkillComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchAchievementSkills();
    this.fetchEmpAchievementSkills();
    this.fetchEmployees();
    console.log('Component Initialized');
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

  private extractCurrentRoles(): any | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        console.log('Decoded roles:', decoded.roles);
        return decoded.roles;
      } else {
        console.error('roles not found in JWT.');
        return null;
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private initializeForm() {
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      user_id: ['', Validators.required],
      achievement_id: ['', Validators.required],
      notes: ['', Validators.required],
      score: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchEmpAchievementSkills(event?: any): void {
    console.log('Fetching Employee AchievementSkills...');

    if (
      !this.allEmpAchievementSkills.length ||
      this.allEmpAchievementSkills.length > 0
    ) {
      this.loading = true;

      let achievementSkillUrl = '';
      if (this.currentRoles.includes('HR')) {
        achievementSkillUrl =
          'https://lokakarya-be.up.railway.app/empachievementskill/get/all';
      } else {
        achievementSkillUrl =
          'https://lokakarya-be.up.railway.app/empachievementskill/get/' +
          this.currentUserId;
      }
      console.log('AchievementSkill URL:', achievementSkillUrl);

      this.http
        .get<any>(achievementSkillUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.allEmpAchievementSkills = response.content || [];
            this.totalRecords = this.allEmpAchievementSkills.length;

            // Apply filtering, sorting, and pagination
            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Employee AchievementSkills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee achievementSkills.',
            });
          },
        });
    } else {
      this.applyFiltersAndPagination(event);
    }
  }

  applyFiltersAndPagination(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    // Apply global filtering (search)
    let filteredAchievementSkills = this.globalFilterValue
      ? this.allEmpAchievementSkills.filter((empAchievementSkill) =>
          Object.values(empAchievementSkill).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmpAchievementSkills];

    if (this.showOnlyMine) {
      filteredAchievementSkills = filteredAchievementSkills.filter(
        (achievementSkill) => achievementSkill.user_id === this.currentUserId
      );
    }

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredAchievementSkills.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.empAchievementSkills = filteredAchievementSkills.slice(
      startIndex,
      endIndex
    );

    // Update totalRecords for pagination
    this.totalRecords = filteredAchievementSkills.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      user_id: '',
      achievement_id: '',
      notes: '',
      score: '',
      assessment_year: '',
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteEmpAchievementSkill(achievementSkillId: string): void {
    console.log(
      'Deleting Employee AchievementSkill with ID:',
      achievementSkillId
    );

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message:
        'Are you sure you want to delete this employee achievementSkill?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true;
        this.http
          .delete(
            `https://lokakarya-be.up.railway.app/empachievementskill/${achievementSkillId}`
          )
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Employee AchievementSkill Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee AchievementSkill Deleted Successfully!',
              });
              this.fetchEmpAchievementSkills();
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee achievementSkill.',
              });
            },
          });
      },
      reject: () => {
        // User canceled deletion
        console.log('Delete action canceled');
        this.isProcessing = false;
      },
    });
  }

  editEmpAchievementSkill(achievementSkillId: string): void {
    console.log(
      'Editing Employee AchievementSkill with ID:',
      achievementSkillId
    );
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'update';

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/empachievementskill/${achievementSkillId}`
      )
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          const empAchievementSkill = response.content;

          this.editForm.patchValue({
            id: empAchievementSkill.id,
            user_id: empAchievementSkill.user_id,
            achievement_id: empAchievementSkill.achievement_id,
            notes: empAchievementSkill.notes,
            score: empAchievementSkill.score,
            assessment_year: new Date(
              empAchievementSkill.assessment_year,
              0,
              1
            ),
          });

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Employee AchievementSkill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee achievementSkill details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveEmployeeAchievementSkill(): Promise<void> {
    console.log('Saving Employee AchievementSkill. Mode:', this.mode);

    if (!this.editForm.valid) {
      console.error('Form Validation Failed:', this.editForm.errors);
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields.',
      });
      return;
    }

    const date = new Date(this.editForm.value.assessment_year);
    const assessmentYear = date.getFullYear();

    try {
      const isDuplicate = await this.confirmDuplicate(
        this.currentUserId,
        this.editForm.value.achievement_id,
        assessmentYear
      );
      console.log('Duplicate Check Result:', isDuplicate);
      if (isDuplicate) {
        console.log(this.currentUserId, assessmentYear);
        this.isProcessing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'You have already submitted an employee achievementSkill for this year.',
        });
        return;
      }
    } catch (error) {
      console.error('Error during duplicate check:', error);
      this.isProcessing = false;
      return;
    }

    const payload = {
      ...this.editForm.value,
      user_id: this.editForm.value.user_id,
      assessment_year: assessmentYear,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    console.log(payload);

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://lokakarya-be.up.railway.app/empachievementskill/create',
            payload
          )
        : this.http.put(
            'https://lokakarya-be.up.railway.app/empachievementskill/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Employee AchievementSkill Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Employee achievementSkill saved successfully.',
        });

        this.resetSortAndFilter();

        this.displayEditDialog = false;
        this.fetchEmpAchievementSkills();
      },
      error: (error) => {
        console.error('Error Saving Employee AchievementSkill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save employee achievementSkill.',
        });
      },
    });
  }

  async confirmDuplicate(
    userId: string,
    achievementSkillId: string,
    assessmentYear: number
  ): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://lokakarya-be.up.railway.app/empachievementskill/${userId}/${achievementSkillId}/${assessmentYear}`
        )
        .toPromise();

      if (response && response.content !== undefined) {
        return response.content;
      } else {
        console.error('Unexpected API response:', response);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'Unexpected response from the server while checking duplicates.',
        });
        return false; // Default to no duplicates if response is invalid
      }
    } catch (error) {
      console.error('Error Checking Duplicate:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to check for duplicates.',
      });
      throw error; // Propagate the error to handle it in the calling function
    }
  }

  resetSortAndFilter(): void {
    console.log('Resetting sort and filter...');

    this.globalFilterValue = '';

    const dt = document.querySelector('p-table') as any;
    if (dt) {
      dt.sortField = null;
      dt.sortOrder = null;
    }

    this.applyFiltersAndPagination({ first: 0 });
  }

  submitEmployeeAchievementSkill(): void {
    console.log('Submitting Employee AchievementSkill. Mode:', this.mode);
    this.isProcessing = true;
    this.saveEmployeeAchievementSkill();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  fetchAchievementSkills(): void {
    console.log('Fetching AchievementSkills...');
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/achievement/all')
      .subscribe({
        next: (response: any) => {
          this.achievementSkills = (response.content || []).filter(
            (skill: any) => skill.enabled === true
          );
          console.log('Fetched AchievementSkills:', this.achievementSkills);
        },
        error: (error) => {
          console.error('Error fetching dev achievementSkills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch dev achievementSkills.',
          });
        },
      });
  }

  fetchEmployees(): void {
    console.log('Fetching Employees...');
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/appuser/all')
      .subscribe({
        next: (response: any) => {
          this.employees = (response.content || []).filter(
            (employee: any) => employee.enabled === true
          );
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
}
