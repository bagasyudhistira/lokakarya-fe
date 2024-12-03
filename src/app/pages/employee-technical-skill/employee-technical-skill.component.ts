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
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-employee-technical-skill',
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
  templateUrl: './employee-technical-skill.component.html',
  styleUrl: './employee-technical-skill.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class EmployeeTechnicalSkillComponent implements OnInit {
  empTechnicalSkills: any[] = [];
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
  allEmpTechnicalSkills: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;
  technicalSkills: any[] = [];
  assessmentYear: number | null = null;
  currentTechnicalSkill: any = null; // For the skill being edited

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeTechnicalSkillComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchTechnicalSkills();
    this.fetchEmpTechnicalSkills();
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
      technical_skill_id: ['', Validators.required],
      score: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  isScoresValid(): boolean {
    return this.technicalSkills.every(
      (skill) => skill.score !== null && skill.score >= 0 && skill.score <= 100
    );
  }

  fetchEmpTechnicalSkills(event?: any): void {
    console.log('Fetching Employee TechnicalSkills...');

    if (
      !this.allEmpTechnicalSkills.length ||
      this.allEmpTechnicalSkills.length > 0
    ) {
      this.loading = true;

      let technicalSkillUrl = '';
      if (this.currentRoles.includes('HR')) {
        technicalSkillUrl =
          'https://lokakarya-be.up.railway.app/emptechnicalskill/get/all';
      } else {
        technicalSkillUrl =
          'https://lokakarya-be.up.railway.app/emptechnicalskill/get/' +
          this.currentUserId;
      }
      console.log('TechnicalSkill URL:', technicalSkillUrl);

      this.http
        .get<any>(technicalSkillUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.allEmpTechnicalSkills = response.content || [];
            this.totalRecords = this.allEmpTechnicalSkills.length;

            // Apply filtering, sorting, and pagination
            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Employee TechnicalSkills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee technicalSkills.',
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
    let filteredTechnicalSkills = this.globalFilterValue
      ? this.allEmpTechnicalSkills.filter((empTechnicalSkill) =>
          Object.values(empTechnicalSkill).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmpTechnicalSkills];

    if (this.showOnlyMine) {
      filteredTechnicalSkills = filteredTechnicalSkills.filter(
        (technicalSkill) => technicalSkill.user_id === this.currentUserId
      );
    }

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredTechnicalSkills.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.empTechnicalSkills = filteredTechnicalSkills.slice(
      startIndex,
      endIndex
    );

    // Update totalRecords for pagination
    this.totalRecords = filteredTechnicalSkills.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      user_id: '',
      technical_skill_id: '',
      score: '',
      assessment_year: '',
    });

    this.currentTechnicalSkill = null; // Reset current skill
    this.assessmentYear = null;
    this.fetchTechnicalSkills(); // Fetch full list of skills
    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteEmpTechnicalSkill(technicalSkillId: string): void {
    console.log('Deleting Employee TechnicalSkill with ID:', technicalSkillId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee technicalSkill?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true;
        this.http
          .delete(
            `https://lokakarya-be.up.railway.app/emptechnicalskill/${technicalSkillId}`
          )
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Employee TechnicalSkill Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee TechnicalSkill Deleted Successfully!',
              });
              this.fetchEmpTechnicalSkills();
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee technicalSkill.',
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

  editEmpTechnicalSkill(technicalSkillId: string): void {
    console.log('Editing Employee TechnicalSkill with ID:', technicalSkillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'update';

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/emptechnicalskill/${technicalSkillId}`
      )
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          const empTechnicalSkill = response.content;

          console.log('Fetched Employee TechnicalSkill:', empTechnicalSkill);

          this.editForm.patchValue({
            id: empTechnicalSkill.id,
            user_id: this.currentUserId,
            technical_skill_id: empTechnicalSkill.technical_skill_id,
            score: empTechnicalSkill.score,
            assessment_year: new Date(empTechnicalSkill.assessment_year, 0, 1),
          });

          console.log('Patched Form Values:', this.editForm.value);

          this.currentTechnicalSkill = {
            id: empTechnicalSkill.id,
            technical_skill: empTechnicalSkill.technical_skill,
            score: empTechnicalSkill.score || null,
            assessment_year: empTechnicalSkill.assessment_year,
          };

          this.assessmentYear = new Date(
            empTechnicalSkill.assessment_year,
            0,
            1
          ).getFullYear();

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Employee TechnicalSkill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee technicalSkill details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveEmployeeTechnicalSkill(): Promise<void> {
    console.log('Saving Employee TechnicalSkill. Mode:', this.mode);

    if (!this.assessmentYear) {
      console.error('Assessment year is missing or invalid.');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Assessment year is required.',
      });
      this.isProcessing = false;
      return;
    }

    const year = new Date(this.assessmentYear).getFullYear();

    if (isNaN(year)) {
      console.error('Invalid assessment year:', this.assessmentYear);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid assessment year. Please select a valid year.',
      });
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    for (const skill of this.technicalSkills) {
      const isDuplicate = await this.confirmDuplicate(
        this.currentUserId,
        skill.id,
        year
      );

      if (
        !skill.score ||
        skill.score < 0 ||
        skill.score > 100 ||
        (isDuplicate && this.mode === 'create')
      ) {
        console.log(
          `Skipping invalid score or duplicate for skill: ${skill.technical_skill}, year: ${year}`
        );
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Invalid score or duplicate for skill: ${skill.technical_skill}, year: ${year}`,
        });
        continue;
      }

      const payload = {
        assessment_year: year,
        user_id: this.currentUserId,
        technical_skill_id: skill.id,
        score: skill.score,
        ...(this.mode === 'create'
          ? { created_by: this.currentUserId }
          : { updated_by: this.currentUserId }),
      };

      console.log('Submitting Payload:', payload);

      try {
        await this.http
          .post(
            'https://lokakarya-be.up.railway.app/emptechnicalskill/create',
            payload
          )
          .toPromise();
        console.log(`Skill "${skill.technical_skill}" saved successfully.`);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Skill "${skill.technical_skill}" saved successfully.`,
        });
      } catch (error) {
        console.error(`Error saving skill "${skill.technical_skill}":`, error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to save skill "${skill.technical_skill}".`,
        });
      }
    }

    this.isProcessing = false;
    this.displayEditDialog = false;
    this.fetchEmpTechnicalSkills();
  }

  async confirmDuplicate(
    userId: string,
    technicalSkillId: string,
    assessmentYear: number
  ): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://lokakarya-be.up.railway.app/emptechnicalskill/${userId}/${technicalSkillId}/${assessmentYear}`
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
        return false;
      }
    } catch (error) {
      console.error('Error Checking Duplicate:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to check for duplicates.',
      });
      throw error;
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

  submitEmployeeTechnicalSkill(): void {
    console.log('Submitting Employee TechnicalSkill. Mode:', this.mode);
    this.isProcessing = true;

    this.saveEmployeeTechnicalSkill();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  fetchTechnicalSkills(): void {
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/technicalskill/all')
      .subscribe({
        next: (response: any) => {
          this.technicalSkills = (response.content || [])
            .filter((skill: any) => skill.enabled === true)
            .map((skill: any) => ({ ...skill, score: null })); // Add score field
          console.log('Fetched Technical Skills:', this.technicalSkills);
        },
        error: (error) => {
          console.error('Error fetching technicalSkills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch technical skills.',
          });
        },
      });
  }
}
