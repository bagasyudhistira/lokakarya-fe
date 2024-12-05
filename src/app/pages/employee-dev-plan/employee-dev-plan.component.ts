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
  selector: 'app-employee-dev-plan',
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
  templateUrl: './employee-dev-plan.component.html',
  styleUrls: ['./employee-dev-plan.component.scss'],
  providers: [MessageService],
})
export class EmployeeDevPlanComponent implements OnInit {
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
  groupedEmpDevPlans: any[] = []; // For grouped data
  assessmentYear: Date | null = null;

  devPlansMap: Map<string, string> = new Map();

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeDevPlanComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchSelectedUserName();

    if (this.currentRoles.includes('HR')) {
      this.fetchEmployees();
      this.selectedUserId = ''; // HR needs to select a user
    } else {
      this.selectedUserId = this.currentUserId;
    }

    // Fetch dev plans and employee dev plans, then group them
    Promise.all([this.fetchDevPlans(), this.fetchEmpDevPlans()])
      .then(() => {
        this.groupAllDevPlans();
      })
      .catch((error) => {
        console.error('Error fetching initial data:', error);
      });

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

  fetchDevPlans(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Fetching DevPlans...');
      this.http
        .get<any>('https://lokakarya-be.up.railway.app/devplan/all')
        .subscribe({
          next: (response) => {
            this.devPlans = (response.content || []).filter(
              (plan: any) => plan.enabled === true
            );
            console.log('Fetched DevPlans:', this.devPlans);

            // Create a map for quick lookup
            this.devPlansMap.clear();
            this.devPlans.forEach((plan: any) => {
              this.devPlansMap.set(plan.id, plan.plan);
            });

            resolve();
          },
          error: (error) => {
            console.error('Error fetching dev plans:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch dev plans.',
            });
            reject(error);
          },
        });
    });
  }

  fetchEmpDevPlans(): Promise<void> {
    return new Promise((resolve, reject) => {
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

            // Group the dev plans after fetching data
            this.groupAllDevPlans();

            resolve();
          },
          error: (error) => {
            console.error('Error Fetching Employee DevPlans:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee plans.',
            });
            reject(error);
          },
        });
    });
  }

  private groupAllDevPlans(includeAll: boolean = false): void {
    const grouped = new Map<string, any>();

    // Initialize groups with all dev plans
    this.devPlans.forEach((devPlan) => {
      grouped.set(devPlan.id, {
        dev_plan_id: devPlan.id,
        dev_plan_name: devPlan.plan,
        descriptions: [],
      });
    });

    console.log('DevPlan: ', this.devPlans);

    // Merge employee data
    this.empDevPlans.forEach((empPlan) => {
      const devPlanId = empPlan.dev_plan_id;
      const group = grouped.get(devPlanId);
      if (group) {
        group.descriptions.push({
          id: empPlan.id,
          description: empPlan.too_bright,
        });
      } else {
        console.warn(
          `Dev Plan ID ${devPlanId} not found for employee plan ${empPlan.id}`
        );
      }
    });

    console.log('EmpDevPlan: ', this.empDevPlans);
    console.log('Grouped: ', grouped);

    if (!includeAll) {
      for (const [key, group] of grouped) {
        if (group.descriptions.length === 0) {
          grouped.delete(key);
        }
      }
    }

    this.groupedEmpDevPlans = Array.from(grouped.values());
  }

  openEditDialog(): void {
    console.log('Opening Dev Plan Edit Form');
    this.displayEditDialog = true;
    this.isProcessing = false;
    this.assessmentYear = this.selectedAssessmentYear;

    // Prepare the data structure, including all dev plans
    this.groupAllDevPlans(true);

    // Optional: Add a default empty entry for dev plans with no entries
    this.groupedEmpDevPlans.forEach((group) => {
      if (group.descriptions.length === 0) {
        group.descriptions.push({
          id: this.generateUniqueId(),
          description: '',
        });
      }
    });
  }

  async saveEmployeeDevPlan(): Promise<void> {
    console.log('Saving Employee Dev Plans.');

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

    const requests: Promise<any>[] = [];

    for (const group of this.groupedEmpDevPlans) {
      for (const entry of group.descriptions) {
        if (!entry.description) {
          console.warn('Skipping incomplete entry:', entry);
          continue;
        }

        const payload: any = {
          user_id: this.selectedUserId || this.currentUserId,
          dev_plan_id: group.dev_plan_id,
          assessment_year: year,
          too_bright: entry.description,
        };

        if (entry.id && !entry.id.startsWith('new_')) {
          payload['id'] = entry.id;
          payload['updated_by'] = this.currentUserId;
          requests.push(
            this.http
              .put(
                'https://lokakarya-be.up.railway.app/empdevplan/update',
                payload
              )
              .toPromise()
          );
        } else {
          // Create new entry
          payload['created_by'] = this.currentUserId;
          requests.push(
            this.http
              .post(
                'https://lokakarya-be.up.railway.app/empdevplan/create',
                payload
              )
              .toPromise()
          );
        }
      }
    }

    try {
      await Promise.all(requests);
      console.log(`Employee Dev Plans saved successfully.`);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Employee Dev Plans saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving employee dev plans:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save employee dev plans.',
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpDevPlans().then(() => this.groupAllDevPlans());
    }
  }

  submitEmployeeDevPlan(): void {
    console.log('Submitting Employee Dev Plans.');
    this.isProcessing = true;
    this.saveEmployeeDevPlan();
  }

  addPlanEntry(group: any): void {
    group.descriptions.push({
      id: this.generateUniqueId(),
      description: '',
      isCompleted: false,
    });
  }

  removePlanEntry(group: any, index: number): void {
    group.descriptions.splice(index, 1);
  }

  generateUniqueId(): string {
    return 'new_' + Math.random().toString(36).substr(2, 9);
  }

  trackByDevPlanId(index: number, entry: any): string {
    return entry.dev_plan_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
