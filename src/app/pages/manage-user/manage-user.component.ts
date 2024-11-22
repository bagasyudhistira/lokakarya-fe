import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
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
    this.loading = true; // Start loading
    const page = event?.first ? event.first / this.rowsPerPage : 0;

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/appuser/get/all?page=${page}&size=${this.rowsPerPage}`
      )
      .pipe(finalize(() => (this.loading = false))) // Stop loading after request
      .subscribe({
        next: (response) => {
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
    this.isProcessing = true;
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
      this.isProcessing = false;
    });
  }
  deleteEmployee(employeeId: string): void {
    console.log('Deleting Employee with ID:', employeeId);

    // Prevent multiple delete operations if already processing
    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    // Show confirmation dialog
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true; // Start processing
        this.http
          .delete(`https://lokakarya-be.up.railway.app/appuser/${employeeId}`)
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Employee Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee deleted successfully!',
              });
              this.fetchEmployees(); // Refresh the employee list
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
        // User canceled deletion
        console.log('Delete action canceled');
        this.isProcessing = false; // Ensure `isProcessing` is false if canceled
      },
    });
  }

  editEmployee(employeeId: string): void {
    console.log('Editing Employee with ID:', employeeId);
    this.isProcessing = true; // Start processing
    this.mode = 'edit';

    const employeeRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/appuser/${employeeId}`
    );
    const divisionsRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/division/all`
    );

    forkJoin([employeeRequest, divisionsRequest])
      .pipe(finalize(() => (this.isProcessing = false))) // Stop processing after all operations
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

          // Fetch and update roles dynamically
          this.fetchUserRoles(employeeId);

          this.displayEditDialog = true; // Show the dialog only after roles are updated
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

  getRoleFormControl(index: number): FormControl<boolean> {
    return this.rolesFormArray.at(index) as FormControl<boolean>;
  }

  saveEmployee(): void {
    console.log('Saving Employee. Mode:', this.mode);
    if (!this.editForm.valid) {
      console.error('Form Validation Failed:', this.editForm.errors);
      return;
    }

    this.isProcessing = true; // Start processing
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

    request$
      .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
      .subscribe({
        next: (response) => {
          console.log('Employee Saved:', response);
          this.displayEditDialog = false;
          this.fetchEmployees(); // Refresh employee list

          // Assign roles after saving the employee
          this.assignRolesToUser(this.editForm.get('id')?.value);
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
    this.isProcessing = true; // Start processing
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/approle/all')
      .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
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
    this.isProcessing = true; // Start processing
    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/appuserrole/get2/${userId}`
      )
      .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
      .subscribe({
        next: (response) => {
          const userRoles = response.content.map((role: any) => role.role_id); // Extract role IDs
          this.rolesFormArray.clear(); // Clear previous controls

          // Add a checkbox for each role and check if it matches the user's roles
          this.roles.forEach((role) =>
            this.rolesFormArray.push(
              this.fb.control(userRoles.includes(role.id))
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
    // Extract selected role IDs based on the checkboxes
    const rolesToAssign = this.roles
      .map((role, index) => (this.rolesFormArray.value[index] ? role.id : null))
      .filter((roleId) => roleId !== null); // Filter out unselected roles

    if (rolesToAssign.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No roles selected for assignment.',
      });
      return;
    }

    // Prepare requests for each selected role
    const roleRequests = rolesToAssign.map((roleId) =>
      this.http.post('https://lokakarya-be.up.railway.app/appuserrole/create', {
        role_id: roleId,
        user_id: userId,
      })
    );

    this.isProcessing = true; // Start processing

    // Execute all requests in parallel
    forkJoin(roleRequests)
      .pipe(finalize(() => (this.isProcessing = false))) // Stop processing after requests are complete
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Roles assigned successfully!',
          });
          console.log('Roles assigned successfully:', rolesToAssign);
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
