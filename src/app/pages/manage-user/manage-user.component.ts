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
      password: ['', Validators.required],
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
            password: '',
            join_date: new Date(employee.join_date),
          });

          this.fetchUserRoles(employeeId);

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

  getRoleFormControl(index: number): FormControl<boolean> {
    return this.rolesFormArray.at(index) as FormControl<boolean>;
  }

  saveEmployee(): void {
    console.log('Saving Employee. Mode:', this.mode);

    if (!this.editForm.valid) {
      console.error('Form Validation Failed:', this.editForm.errors);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields.',
      });
      return;
    }

    this.isProcessing = true; // Start processing
    const userId = this.editForm.get('id')?.value;
    const rolesToAssign = this.roles
      .map((role, index) => (this.rolesFormArray.value[index] ? role.id : null))
      .filter((roleId) => roleId !== null);
    const uncheckedRoles = this.roles
      .map((role, index) =>
        !this.rolesFormArray.value[index] ? role.id : null
      )
      .filter((roleId) => roleId !== null);
    console.log('Roles to Assign:', rolesToAssign);
    console.log('Unchecked Roles:', uncheckedRoles);

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
      .pipe(
        finalize(() => (this.isProcessing = false)) // Ensure processing stops
      )
      .subscribe({
        next: () => {
          console.log('Employee Saved Successfully');

          // Handle role assignments and removals
          if (this.mode === 'edit') {
            this.updateUserRoles(userId, rolesToAssign, uncheckedRoles);
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Employee saved successfully.',
          });
          this.displayEditDialog = false;
          this.fetchEmployees(); // Refresh the employee list
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
    this.isProcessing = true;
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
          console.log('User Roles Fetched:', response);
          const userRoles = response.content.map((role: any) => role.role_id);
          this.rolesFormArray.clear();

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

    const roleRequests = rolesToAssign.map((roleId) =>
      this.http
        .get<any>(
          `https://lokakarya-be.up.railway.app/appuserrole/${userId}/${roleId}`
        )
        .pipe(
          finalize(() => (this.isProcessing = false)), // Stop processing after each request
          finalize(() => console.log(`Check for role ${roleId} completed.`)) // Logging
        )
        .toPromise()
        .then((response) => {
          if (response?.content) {
            console.log(`Role already assigned: ${roleId}`);
            return null; // Role already assigned, skip
          } else {
            // Role not assigned, create it
            return this.http
              .post('https://lokakarya-be.up.railway.app/appuserrole/create', {
                role_id: roleId,
                user_id: userId,
              })
              .toPromise()
              .then(() => {
                console.log(`Role assigned successfully: ${roleId}`);
              });
          }
        })
    );

    this.isProcessing = true; // Start processing

    Promise.all(roleRequests)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Roles assigned successfully!',
        });
        console.log('All roles assigned successfully:', rolesToAssign);
      })
      .catch((err) => {
        console.error('Failed to assign some roles:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to assign roles.',
        });
      })
      .finally(() => {
        this.isProcessing = false;
      });
  }

  private updateUserRoles(
    userId: string,
    rolesToAssign: string[],
    uncheckedRoles: string[]
  ): void {
    const addRoleRequests = rolesToAssign.map((roleId) =>
      this.http
        .get<any>(
          `https://lokakarya-be.up.railway.app/appuserrole/${userId}/${roleId}`
        )
        .toPromise()
        .then((response) => {
          if (response?.content) {
            console.log(`Role ${roleId} already assigned to user ${userId}.`);
            return null;
          } else {
            console.log(`Assigning role ${roleId} to user ${userId}.`);
            return this.http
              .post('https://lokakarya-be.up.railway.app/appuserrole/create', {
                role_id: roleId,
                user_id: userId,
              })
              .toPromise();
          }
        })
    );

    const deleteRoleRequests = uncheckedRoles.map((roleId) =>
      this.http
        .get<any>(
          `https://lokakarya-be.up.railway.app/appuserrole/${userId}/${roleId}`
        )
        .toPromise()
        .then((response) => {
          if (response?.content) {
            const appUserRoleId = response.content;
            console.log(`Deleting role ${roleId} for user ${userId}.`);
            return this.http
              .delete(
                `https://lokakarya-be.up.railway.app/appuserrole/${appUserRoleId}`
              )
              .toPromise();
          } else {
            console.log(
              `Role ${roleId} is not assigned to user ${userId}, skipping.`
            );
            return null;
          }
        })
    );

    this.isProcessing = true; // Start processing

    Promise.all([...addRoleRequests, ...deleteRoleRequests])
      .then(() => {
        console.log('Role updates completed successfully.');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Roles updated successfully.',
        });
      })
      .catch((err) => {
        console.error('Error updating roles:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update roles.',
        });
      })
      .finally(() => {
        this.isProcessing = false; // Ensure processing stops
      });
  }

  private deleteAppUserRole(userId: string, roleId: string): void {
    const url = `https://lokakarya-be.up.railway.app/appuserrole/${userId}/${roleId}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response?.content) {
          const appUserRoleId = response.content;
          console.log(
            `Role assignment exists with ID: ${appUserRoleId}, deleting...`
          );

          this.http
            .delete(
              `https://lokakarya-be.up.railway.app/appuserrole/${appUserRoleId}`
            )
            .subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Role unassigned successfully!',
                });
                console.log('Role unassigned successfully:', roleId);
              },
              error: (err) => {
                console.error('Error deleting role assignment:', err);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to unassign role.',
                });
              },
            });
        } else {
          console.log('Role assignment does not exist, no deletion needed.');
        }
      },
      error: (err) => {
        console.error('Error fetching role assignment:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch role assignment.',
        });
      },
    });
  }
}
