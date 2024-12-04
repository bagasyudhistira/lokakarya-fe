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
  selector: 'app-employee-dev-plan',
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
  templateUrl: './employee-dev-plan.component.html',
  styleUrl: './employee-dev-plan.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class EmployeeDevPlanComponent implements OnInit {
  empDevPlans: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  employees: any[] = [];
  mode: 'create' | 'update' = 'create';
  roles: any[] = [];
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  allEmpDevPlans: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;
  devPlans: any[] = [];
  selectedUserId: string = '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();

  groupedEmpDevPlans: any[] = []; // For grouped data

  devPlanEntries: {
    dev_plan_id: string;
    dev_plan_name: string;
    descriptions: string[];
  }[] = [];

  assessmentYear: Date | null = null;

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeDevPlanComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchDevPlans();
    this.fetchEmpDevPlans();
    if (this.currentRoles.includes('HR')) {
      this.fetchEmployees();
      this.selectedUserId = ''; // HR needs to select a user
    } else {
      this.selectedUserId = this.currentUserId;
      this.fetchEmpDevPlans();
    }
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
      dev_plan_id: ['', Validators.required],
      description: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchSelectedUserName(): void {
    console.log('Selected User ID: ', this.selectedUserId);

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

  fetchEmpDevPlans(): void {
    if (!this.selectedUserId) {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }

    this.fetchSelectedUserName();
    this.selectedYear = this.selectedAssessmentYear.getFullYear();

    console.log(
      `Fetching ${this.selectedYear} EmpDevPlans for User ID: ${this.selectedUserId}`
    );

    this.loading = true;

    const planUrl = `https://lokakarya-be.up.railway.app/empdevplan/get/${this.selectedUserId}/${this.selectedYear}`;

    console.log('Fetching EmpDevPlans from URL:', planUrl);

    this.http
      .get<any>(planUrl)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.empDevPlans = response.content || [];
          console.log('Fetched EmpDevPlans:', this.empDevPlans);

          // Group the development plans
          this.groupEmpDevPlans();
        },
        error: (error) => {
          console.error('Error Fetching Employee DevPlans:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee plans.',
          });
        },
      });
  }

  private groupEmpDevPlans(): void {
    const grouped = new Map<string, any>();

    for (const plan of this.empDevPlans) {
      const key = plan.plan; // 'plan' is the development plan name
      if (!grouped.has(key)) {
        grouped.set(key, {
          plan: key,
          descriptions: [],
          dev_plan_id: plan.dev_plan_id,
        });
      }
      grouped.get(key).descriptions.push({
        id: plan.id,
        description: plan.too_bright,
      });
    }

    this.groupedEmpDevPlans = Array.from(grouped.values());
  }

  applyFiltersAndPagination(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    // Apply global filtering (search)
    let filteredDevPlans = this.globalFilterValue
      ? this.allEmpDevPlans.filter((empDevPlan) =>
          Object.values(empDevPlan).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmpDevPlans];

    if (this.showOnlyMine) {
      filteredDevPlans = filteredDevPlans.filter(
        (plan) => plan.user_id === this.currentUserId
      );
    }

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredDevPlans.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.empDevPlans = filteredDevPlans.slice(startIndex, endIndex);

    // Update totalRecords for pagination
    this.totalRecords = filteredDevPlans.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      user_id: '',
      dev_plan_id: '',
      description: '',
      assessment_year: null,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
    this.fetchDevPlans();
    this.assessmentYear = null;
  }

  deleteEmpDevPlan(planId: string): void {
    console.log('Deleting Employee DevPlan with ID:', planId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee plan?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true;
        this.http
          .delete(`https://lokakarya-be.up.railway.app/empdevplan/${planId}`)
          .pipe(finalize(() => (this.isProcessing = false)))
          .subscribe({
            next: () => {
              console.log('Employee DevPlan Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee DevPlan Deleted Successfully!',
              });
              this.fetchEmpDevPlans();
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee plan.',
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

  editEmpDevPlan(planId: string): void {
    console.log('Editing Employee DevPlan with ID:', planId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'update';

    this.http
      .get<any>(`https://lokakarya-be.up.railway.app/empdevplan/${planId}`)
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          const empDevPlan = response.content;
          console.log('Fetched Employee DevPlan:', empDevPlan);

          this.editForm.patchValue({
            id: empDevPlan.id,
            user_id: this.currentUserId,
            dev_plan_id: empDevPlan.dev_plan_id,
            description: empDevPlan.too_bright,
            assessment_year: new Date(empDevPlan.assessment_year, 0, 1),
          });

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Employee DevPlan:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee plan details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveEmployeeDevPlan(): Promise<void> {
    console.log('Saving Employee DevPlan. Mode:', this.mode);

    if (!this.assessmentYear) {
      console.error('Assessment year is missing or invalid.');
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Assessment year is required.',
      });
      return;
    }

    const year = this.assessmentYear.getFullYear();
    this.isProcessing = true;

    for (const entry of this.devPlanEntries) {
      for (const description of entry.descriptions) {
        if (!description || description.trim() === '') {
          continue; // Skip empty descriptions
        }

        const payload = {
          user_id: this.currentUserId,
          dev_plan_id: entry.dev_plan_id,
          assessment_year: year,
          too_bright: description,
          created_by: this.currentUserId,
        };

        console.log('Submitting Payload:', payload);

        try {
          await this.http
            .post(
              'https://lokakarya-be.up.railway.app/empdevplan/create',
              payload
            )
            .toPromise();

          console.log(`Plan "${entry.dev_plan_name}" saved successfully.`);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Plan "${entry.dev_plan_name}" saved successfully.`,
          });
        } catch (error) {
          console.error(`Error saving plan "${entry.dev_plan_name}":`, error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to save plan "${entry.dev_plan_name}".`,
          });
        }
      }
    }

    this.isProcessing = false;
    this.displayEditDialog = false;
    this.fetchEmpDevPlans();
  }

  async confirmDuplicate(
    userId: string,
    devPlanId: string,
    assessmentYear: number
  ): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://lokakarya-be.up.railway.app/empdevplan/${userId}/${devPlanId}/${assessmentYear}`
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

  submitEmployeeDevPlan(): void {
    console.log('Submitting Employee DevPlan. Mode:', this.mode);
    this.isProcessing = true;
    this.saveEmployeeDevPlan();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  fetchDevPlans(): void {
    console.log('Fetching DevPlans...');
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/devplan/all')
      .subscribe({
        next: (response) => {
          this.devPlans = (response.content || []).filter(
            (plan: any) => plan.enabled === true
          );
          console.log('Fetched DevPlans:', this.devPlans);

          this.devPlanEntries = this.devPlans.map((plan: any) => ({
            dev_plan_id: plan.id,
            dev_plan_name: plan.plan,
            descriptions: [''],
          }));
        },
        error: (error) => {
          console.error('Error fetching dev plans:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch dev plans.',
          });
        },
      });
  }

  addDescription(entry: any): void {
    entry.descriptions.push('');
  }

  removeDescription(entry: any, index: number): void {
    if (entry.descriptions.length > 1) {
      entry.descriptions.splice(index, 1);
    }
  }

  trackByDevPlanId(index: number, entry: any): string {
    return entry.dev_plan_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
