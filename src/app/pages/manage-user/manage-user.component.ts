import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrimeNGConfig } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { FormArray } from '@angular/forms';

@Component({
  selector: 'app-manage-user',
  standalone: true,
  templateUrl: './manage-user.component.html',
  styleUrls: ['./manage-user.component.scss'],
  imports: [CommonModule, PrimeNgModule, FormsModule, ReactiveFormsModule],
  providers: [ConfirmationService, MessageService],
})
export class ManageUserComponent implements OnInit {
  employees: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 10;
  maxDate: Date = new Date();
  divisions: any[] = [];
  currentYear: string = new Date().getFullYear().toString();
  mode: 'create' | 'edit' = 'create';
  roles: any[] = []; // Stores the available roles
  selectedRoles: { [roleId: string]: boolean } = {}; // Tracks selected roles

  displayEditDialog: boolean = false;
  editForm!: FormGroup;

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing ManageUserComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchEmployees();
    this.fetchRoles();
    console.log('Component Initialized');
  }

  private initializeForm() {
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      username: ['', Validators.required],
      full_name: ['', Validators.required],
      position: ['', Validators.required],
      email_address: ['', [Validators.required, Validators.email]],
      employee_status: ['', Validators.required],
      join_date: ['', Validators.required],
      enabled: [true],
      division_id: ['', Validators.required],
      password: ['', this.mode === 'create' ? Validators.required : null],
      roles: this.fb.array([]),
    });
    console.log('Form Initialized:', this.editForm.value);
  }

  navigateHome() {
    console.log('Navigating to Home');
    this.router.navigate(['/home']);
  }

  fetchEmployees(event?: any): void {
    console.log('Fetching Employees. Event:', event);
    this.loading = true;
    const page = event?.first ? event.first / this.rowsPerPage : 0;

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/appuser/get/all?page=${page}&size=${this.rowsPerPage}`
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          console.log('Employees Fetched:', response);
          this.employees = response.content;
          this.totalRecords = response.total_rows;
        },
        error: (error) => {
          console.error('Error Fetching Employees:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employees.',
          });
        },
      });
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      username: '',
      full_name: '',
      position: '',
      email_address: '',
      employee_status: '',
      join_date: '',
      enabled: true,
      division_id: '',
      password: '',
    });

    this.fetchDivisions(() => {
      console.log('Divisions Fetched for Create');
      this.displayEditDialog = true;
    });
  }

  deleteEmployee(employeeId: string): void {
    console.log('Deleting Employee with ID:', employeeId);
    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.isProcessing = true;
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee?',
      accept: () => {
        console.log('Delete Confirmed');
        this.http
          .delete(`https://lokakarya-be.up.railway.app/appuser/${employeeId}`)
          .pipe(finalize(() => (this.isProcessing = false)))
          .subscribe({
            next: () => {
              console.log('Employee Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee deleted successfully!',
              });
              this.fetchEmployees();
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee.',
              });
            },
          });
      },
      reject: () => {
        console.log('Delete Canceled');
        this.isProcessing = false;
      },
    });
  }

  editEmployee(employeeId: string): void {
    console.log('Editing Employee with ID:', employeeId);
    this.mode = 'edit';

    const employeeRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/appuser/${employeeId}`
    );
    const divisionsRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/division/all`
    );

    forkJoin([employeeRequest, divisionsRequest])
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: ([employeeResponse, divisionsResponse]) => {
          console.log('Employee and Divisions Fetched:', {
            employee: employeeResponse,
            divisions: divisionsResponse,
          });
          this.divisions = divisionsResponse.content;

          const employee = employeeResponse.content;
          this.editForm.patchValue({
            ...employee,
            join_date: new Date(employee.join_date),
          });

          this.fetchUserRoles(employee.id);
          this.displayEditDialog = true;
        },
        error: (error) => {
          console.error('Error Fetching Employee or Divisions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee or division details.',
          });
        },
      });
  }

  fetchDivisions(callback: () => void): void {
    console.log('Fetching Divisions...');
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/division/all')
      .subscribe({
        next: (response) => {
          this.divisions = response.content;
          console.log('Divisions Fetched:', this.divisions);
          callback();
        },
        error: (error) => {
          console.error('Error Fetching Divisions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch divisions.',
          });
        },
      });
  }

  saveEmployee(): void {
    console.log('Saving Employee. Mode:', this.mode);
    if (!this.editForm.valid) {
      console.error('Form Validation Failed:', this.editForm.errors);
      return;
    }

    this.isProcessing = true;

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://lokakarya-be.up.railway.app/appuser/create',
            this.editForm.value
          )
        : this.http.put(
            'https://lokakarya-be.up.railway.app/appuser/update',
            this.editForm.value
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response) => {
        console.log('Employee Saved:', response);
        this.displayEditDialog = false;
        this.fetchEmployees();
      },
      error: (error) => {
        console.error('Error Saving Employee:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save employee.',
        });
      },
    });
  }

  fetchRoles(): void {
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/approle/all')
      .subscribe({
        next: (response) => {
          this.roles = response.content;
          console.log('Roles fetched:', this.roles);

          // Initialize FormArray with a control for each role
          this.rolesFormArray.clear();
          this.roles.forEach(() =>
            this.rolesFormArray.push(this.fb.control(false))
          );
        },
        error: (err) => {
          console.error('Failed to fetch roles:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch roles.',
          });
        },
      });
  }

  get rolesFormArray(): FormArray {
    return this.editForm.get('roles') as FormArray;
  }

  fetchUserRoles(userId: string): void {
    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/appuserrole/get2/${userId}`
      )
      .subscribe({
        next: (response) => {
          const userRoles = response.content.map((role: any) => role.role_id);
          this.rolesFormArray.clear(); // Clear any previous role states

          this.roles.forEach((role) =>
            this.rolesFormArray.push(
              this.fb.control(userRoles.includes(role.id)) // Check if user has this role
            )
          );
          console.log('Roles patched for User:', this.rolesFormArray.value);
        },
        error: (err) => {
          console.error('Failed to fetch user roles:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch user roles.',
          });
        },
      });
  }
  assignRolesToUser(userId: string): void {
    const rolesToAssign = this.roles
      .map((role, index) => (this.rolesFormArray.value[index] ? role.id : null))
      .filter((roleId) => roleId);

    const roleRequests = rolesToAssign.map((roleId) =>
      this.http.post('https://lokakarya-be.up.railway.app/appuserrole/create', {
        role_id: roleId,
        user_id: userId,
      })
    );

    forkJoin(roleRequests).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Roles assigned successfully!',
        });
      },
      error: (err) => {
        console.error('Failed to assign roles:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to assign roles.',
        });
      },
    });
  }
}
