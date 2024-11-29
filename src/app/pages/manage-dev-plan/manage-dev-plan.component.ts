import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { InputSwitchModule } from 'primeng/inputswitch';

@Component({
  selector: 'app-manage-dev-plan',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
  ],
  templateUrl: './manage-dev-plan.component.html',
  styleUrl: './manage-dev-plan.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageDevPlanComponent implements OnInit {
  plans: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  employees: any[] = [];
  mode: 'create' | 'edit' = 'create';
  roles: any[] = [];
  currentUserId: string = '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  allPlans: any[] = [];
  globalFilterValue: string = '';

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchPlans();
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

  private initializeForm() {
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      plan: ['', Validators.required],
      enabled: [true],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchPlans(event?: any): void {
    console.log('Fetching Development Plans...');

    if (!this.allPlans.length || this.allPlans.length > 0) {
      this.loading = true;
      this.http
        .get<any>('https://lokakarya-be.up.railway.app/devplan/all')
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            console.log('Development Plans Fetched:', response);
            this.allPlans = response.content || [];
            this.totalRecords = this.allPlans.length;

            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Development Plans:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch development plans.',
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

    let filteredSkills = this.globalFilterValue
      ? this.allPlans.filter((plan) =>
          Object.values(plan).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allPlans];

    console.log(this.allPlans);

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredSkills.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    this.plans = filteredSkills.slice(startIndex, endIndex);

    this.totalRecords = filteredSkills.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      plan: '',
      enabled: true,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deletePlan(planId: string): void {
    console.log('Deleting Development Plan with ID:', planId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this development plan?',
      accept: () => {
        this.isProcessing = true;
        this.http
          .delete(`https://lokakarya-be.up.railway.app/devplan/${planId}`)
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Development Plan Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Development Plan Deleted Successfully!',
              });
              this.fetchPlans();
            },
            error: (error) => {
              console.error('Error Deleting Development Plan:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete development plan.',
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

  editPlan(planId: string): void {
    console.log('Editing Development Plan with ID:', planId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit';

    const planRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/devplan/${planId}`
    );

    this.displayEditDialog = false;

    planRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (developmentPlanResponse) => {
        console.log('Development Plan Fetched:', developmentPlanResponse);
        const plan = developmentPlanResponse.content;

        this.currentUserId = this.extractCurrentUserId() || '';
        console.log('Current User ID:', this.currentUserId);

        this.editForm.patchValue({
          ...plan,
          enabled: plan.enabled,
          updated_by: this.currentUserId,
        });

        this.displayEditDialog = true;
        this.isEditFormLoading = false;
      },
      error: (error) => {
        console.error('Error Fetching Development Plan:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch development plan details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  async savePlan(): Promise<void> {
    console.log('Saving Development Plan. Mode:', this.mode);

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

    const payload = {
      ...this.editForm.value,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    console.log(payload);

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://lokakarya-be.up.railway.app/devplan/create',
            payload
          )
        : this.http.put(
            'https://lokakarya-be.up.railway.app/devplan/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Development Plan Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Technical skill saved successfully.',
        });

        this.resetSortAndFilter();

        this.displayEditDialog = false;
        this.fetchPlans();
      },
      error: (error) => {
        console.error('Error Saving Development Plan:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save development plan.',
        });
      },
    });
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

  submitPlan(): void {
    console.log('Submitting Development Plan. Mode:', this.mode);
    this.isProcessing = true;
    this.savePlan();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }
}
