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
  selectedUserId: string = '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();

  groupedEmpTechnicalSkills: any[] = []; // For grouped data

  technicalSkillEntries: {
    technical_skill_id: string;
    technical_skill_name: string;
    skillEntrys: { id: string; value: string }[];
    entryScores: { id: string; value: number | null }[];
  }[] = [];

  assessmentYear: Date | null = null;

  scoreOptions: { label: string; value: number }[] = [
    { label: 'Starting', value: 10 },
    { label: 'Beginner', value: 20 },
    { label: 'Intermediate', value: 30 },
    { label: 'Advanced', value: 40 },
    { label: 'Professional', value: 50 },
  ];

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
    this.fetchSelectedUserName();
    if (this.currentRoles.includes('HR')) {
      this.fetchEmployees();
      this.selectedUserId = ''; // HR needs to select a user
    } else {
      this.selectedUserId = this.currentUserId;
      this.fetchEmpTechnicalSkills();
    }
    this.technicalSkillEntries = this.technicalSkills.map((skill: any) => ({
      technical_skill_id: skill.id,
      technical_skill_name: skill.technical_skill,
      skillEntrys: [{ id: this.generateUniqueId(), value: '' }],
      entryScores: [{ id: this.generateUniqueId(), value: null }],
    }));
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
      entryScore: [null, Validators.required],
      skillEntry: ['', Validators.required],
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

  fetchEmpTechnicalSkills(): void {
    if (!this.selectedUserId) {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }

    this.fetchSelectedUserName();
    this.selectedYear = this.selectedAssessmentYear.getFullYear();

    console.log(
      `Fetching ${this.selectedYear} EmpTechnicalSkills for User ID: ${this.selectedUserId}`
    );

    this.loading = true;

    const skillUrl = `https://lokakarya-be.up.railway.app/emptechnicalskill/get/${this.selectedUserId}/${this.selectedYear}`;

    console.log('Fetching EmpTechnicalSkills from URL:', skillUrl);

    this.http
      .get<any>(skillUrl)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.empTechnicalSkills = response.content || [];
          console.log('Fetched EmpTechnicalSkills:', this.empTechnicalSkills);

          // Fetch the selected user's full name
          this.fetchSelectedUserName();

          // Group the technical skills
          this.groupEmpTechnicalSkills();
        },
        error: (error) => {
          console.error('Error Fetching Employee TechnicalSkills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee skills.',
          });
        },
      });
  }

  private groupEmpTechnicalSkills(): void {
    const grouped = new Map<string, any>();

    for (const skill of this.empTechnicalSkills) {
      const key = skill.technical_skill; // 'technical_skill' is the technical skill name
      if (!grouped.has(key)) {
        grouped.set(key, {
          technical_skill: key,
          skillEntrys: [],
          technical_skill_id: skill.technical_skill_id,
        });
      }
      grouped.get(key).skillEntrys.push({
        id: skill.id,
        skillEntry: skill.skill,
        entryScore: skill.score,
      });
    }

    this.groupedEmpTechnicalSkills = Array.from(grouped.values());
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
        (skill) => skill.user_id === this.currentUserId
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
      skillEntry: '',
      entryScore: '',
      assessment_year: null,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
    this.fetchTechnicalSkills();
    this.assessmentYear = null;
  }

  deleteEmpTechnicalSkill(skillId: string): void {
    console.log('Deleting Employee TechnicalSkill with ID:', skillId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee skill?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true;
        this.http
          .delete(
            `https://lokakarya-be.up.railway.app/emptechnicalskill/${skillId}`
          )
          .pipe(finalize(() => (this.isProcessing = false)))
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
                detail: 'Failed to delete employee skill.',
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

  editEmpTechnicalSkill(skillId: string): void {
    console.log('Editing Employee TechnicalSkill with ID:', skillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'update';

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/emptechnicalskill/${skillId}`
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
            skillEntry: empTechnicalSkill.skill,
            entryScore: empTechnicalSkill.score,
            assessment_year: new Date(empTechnicalSkill.assessment_year, 0, 1),
          });

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Employee TechnicalSkill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee skill details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveEmployeeTechnicalSkill(): Promise<void> {
    console.log('Saving Employee TechnicalSkill. Mode:', this.mode);

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

    for (const entry of this.technicalSkillEntries) {
      for (const skillEntry of entry.skillEntrys) {
        if (!skillEntry || skillEntry.value.trim() === '') {
          continue;
        }

        const index = entry.skillEntrys.indexOf(skillEntry);
        const scoreValue = entry.entryScores[index];

        if (scoreValue == null || scoreValue === undefined) {
          console.error('Score is missing for a skill entry.');
          this.isProcessing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Please select a score for each skill entry.',
          });
          return;
        }

        const payload = {
          user_id: this.currentUserId,
          technical_skill_id: entry.technical_skill_id,
          assessment_year: year,
          skill: skillEntry,
          score: scoreValue,
          created_by: this.currentUserId,
        };

        console.log('Submitting Payload:', payload);

        try {
          await this.http
            .post(
              'https://lokakarya-be.up.railway.app/emptechnicalskill/create',
              payload
            )
            .toPromise();

          console.log(
            `Plan "${entry.technical_skill_name}" saved successfully.`
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Plan "${entry.technical_skill_name}" saved successfully.`,
          });
        } catch (error) {
          console.error(
            `Error saving skill "${entry.technical_skill_name}":`,
            error
          );
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to save skill "${entry.technical_skill_name}".`,
          });
        }
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

  submitEmployeeTechnicalSkill(): void {
    console.log('Submitting Employee TechnicalSkill. Mode:', this.mode);
    this.isProcessing = true;
    this.saveEmployeeTechnicalSkill();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  getScoreLabel(scoreValue: number): string {
    const scoreOption = this.scoreOptions.find(
      (option) => option.value === scoreValue
    );
    return scoreOption ? scoreOption.label : scoreValue.toString();
  }

  fetchTechnicalSkills(): void {
    console.log('Fetching TechnicalSkills...');
    this.http
      .get<any>('https://lokakarya-be.up.railway.app/technicalskill/all')
      .subscribe({
        next: (response) => {
          this.technicalSkills = (response.content || []).filter(
            (skill: any) => skill.enabled === true
          );
          console.log('Fetched TechnicalSkills:', this.technicalSkills);

          this.technicalSkillEntries = this.technicalSkills.map(
            (skill: any) => ({
              technical_skill_id: skill.id,
              technical_skill_name: skill.technical_skill,
              skillEntrys: [{ id: this.generateUniqueId(), value: '' }],
              entryScores: [{ id: this.generateUniqueId(), value: null }],
            })
          );
        },
        error: (error) => {
          console.error('Error fetching technical skills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch technical skills.',
          });
        },
      });
  }

  addSkillEntry(entry: any): void {
    entry.skillEntrys.push({ id: this.generateUniqueId(), value: '' });
    entry.entryScores.push({ id: this.generateUniqueId(), value: null });
  }

  generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  removeSkillEntry(entry: any, index: number): void {
    if (entry.skillEntrys.length > 1) {
      entry.skillEntrys.splice(index, 1);
      entry.entryScores.splice(index, 1);
    }
  }

  trackByTechnicalSkillId(index: number, entry: any): string {
    return entry.technical_skill_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  trackById(index: number, item: { id: string }): string {
    return item.id;
  }
}
