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
  selector: 'app-employee-attitude-skill',
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
  templateUrl: './employee-attitude-skill.component.html',
  styleUrl: './employee-attitude-skill.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class EmployeeAttitudeSkillComponent implements OnInit {
  empAttitudeSkills: any[] = [];
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
  allEmpAttitudeSkills: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;
  attitudeSkills: any[] = [];

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeAttitudeSkillComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchAttitudeSkills();
    this.fetchEmpAttitudeSkills();
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
      user_id: [''],
      attitude_skill_id: ['', Validators.required],
      score: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchEmpAttitudeSkills(event?: any): void {
    console.log('Fetching Employee AttitudeSkills...');

    if (
      !this.allEmpAttitudeSkills.length ||
      this.allEmpAttitudeSkills.length > 0
    ) {
      this.loading = true;

      let attitudeSkillUrl = '';
      if (this.currentRoles.includes('HR')) {
        attitudeSkillUrl =
          'https://lokakarya-be.up.railway.app/empattitudeskill/get/all';
      } else {
        attitudeSkillUrl =
          'https://lokakarya-be.up.railway.app/empattitudeskill/get/' +
          this.currentUserId;
      }
      console.log('AttitudeSkill URL:', attitudeSkillUrl);

      this.http
        .get<any>(attitudeSkillUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.allEmpAttitudeSkills = response.content || [];
            this.totalRecords = this.allEmpAttitudeSkills.length;

            // Apply filtering, sorting, and pagination
            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Employee AttitudeSkills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee attitudeSkills.',
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
    let filteredAttitudeSkills = this.globalFilterValue
      ? this.allEmpAttitudeSkills.filter((empAttitudeSkill) =>
          Object.values(empAttitudeSkill).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmpAttitudeSkills];

    if (this.showOnlyMine) {
      filteredAttitudeSkills = filteredAttitudeSkills.filter(
        (attitudeSkill) => attitudeSkill.user_id === this.currentUserId
      );
    }

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredAttitudeSkills.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.empAttitudeSkills = filteredAttitudeSkills.slice(startIndex, endIndex);

    // Update totalRecords for pagination
    this.totalRecords = filteredAttitudeSkills.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      user_id: '',
      attitude_skill_id: '',
      score: '',
      assessment_year: '',
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteEmpAttitudeSkill(attitudeSkillId: string): void {
    console.log('Deleting Employee AttitudeSkill with ID:', attitudeSkillId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee attitudeSkill?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true;
        this.http
          .delete(
            `https://lokakarya-be.up.railway.app/empattitudeskill/${attitudeSkillId}`
          )
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Employee AttitudeSkill Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee AttitudeSkill Deleted Successfully!',
              });
              this.fetchEmpAttitudeSkills();
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee attitudeSkill.',
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

  editEmpAttitudeSkill(attitudeSkillId: string): void {
    console.log('Editing Employee AttitudeSkill with ID:', attitudeSkillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'update';

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/empattitudeskill/${attitudeSkillId}`
      )
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          const empAttitudeSkill = response.content;

          this.editForm.patchValue({
            id: empAttitudeSkill.id,
            user_id: this.currentUserId,
            attitude_skill_id: empAttitudeSkill.attitude_skill_id,
            score: empAttitudeSkill.score,
            assessment_year: new Date(empAttitudeSkill.assessment_year, 0, 1),
          });

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Employee AttitudeSkill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee attitudeSkill details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveEmployeeAttitudeSkill(): Promise<void> {
    console.log('Saving Employee AttitudeSkill. Mode:', this.mode);

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
        this.editForm.value.attitude_skill_id,
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
            'You have already submitted an employee attitudeSkill for this year.',
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
      user_id: this.currentUserId,
      assessment_year: assessmentYear,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    console.log(payload);

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://lokakarya-be.up.railway.app/empattitudeskill/create',
            payload
          )
        : this.http.put(
            'https://lokakarya-be.up.railway.app/empattitudeskill/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Employee AttitudeSkill Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Employee attitudeSkill saved successfully.',
        });

        this.resetSortAndFilter();

        this.displayEditDialog = false;
        this.fetchEmpAttitudeSkills();
      },
      error: (error) => {
        console.error('Error Saving Employee AttitudeSkill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save employee attitudeSkill.',
        });
      },
    });
  }

  async confirmDuplicate(
    userId: string,
    attitudeSkillId: string,
    assessmentYear: number
  ): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://lokakarya-be.up.railway.app/empattitudeskill/${userId}/${attitudeSkillId}/${assessmentYear}`
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

  submitEmployeeAttitudeSkill(): void {
    console.log('Submitting Employee AttitudeSkill. Mode:', this.mode);
    this.isProcessing = true;
    this.saveEmployeeAttitudeSkill();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  fetchAttitudeSkills(): void {
    console.log('Fetching AttitudeSkills...');
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/attitudeskill/all')
      .subscribe({
        next: (response: any) => {
          this.attitudeSkills = (response.content || []).filter(
            (skill: any) => skill.enabled === true
          );
          console.log('Fetched AttitudeSkills:', this.attitudeSkills);
        },
        error: (error) => {
          console.error('Error fetching dev attitudeSkills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch dev attitudeSkills.',
          });
        },
      });
  }
}
