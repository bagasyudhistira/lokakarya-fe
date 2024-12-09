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
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
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
  roles: any[] = [];
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  allEmpAchievementSkills: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;
  achievementSkills: any[] = [];
  selectedUserId: string = '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();

  groupedEmpAchievementSkills: any[] = []; // For grouped data

  achievementSkillEntries: {
    achievement_id: string;
    achievement: string;
    skillEntrys: { id: string; value: string }[];
    entryScores: { id: string; value: number | null }[];
  }[] = [];

  assessmentYear: Date | null = null;

  scoreOptions: { label: string; value: number }[] = [
    { label: 'Bad', value: 10 },
    { label: 'Average', value: 20 },
    { label: 'Good', value: 30 },
    { label: 'Great', value: 40 },
    { label: 'Excellent', value: 50 },
  ];

  achievementSkillsMap: Map<string, string> = new Map();
  groupAchievementsMap: Map<string, string> = new Map();

  groupAchievements: any[] = [];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeAchievementSkillComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();

    // Fetch achievements and group achievements first
    Promise.all([this.fetchAchievementSkills(), this.fetchGroupAchievements()])
      .then(() => {
        // Now fetch employee achievement skills
        this.fetchEmpAchievementSkills();
      })
      .catch((error) => {
        console.error('Error fetching initial data:', error);
      });

    this.fetchSelectedUserName();
    if (this.currentRoles.includes('HR')) {
      this.fetchEmployees();
      this.selectedUserId = '';
    } else {
      this.selectedUserId = this.currentUserId;
    }
    this.selectedAssessmentYear = new Date();
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
      achievement_id: ['', Validators.required],
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

  fetchEmpAchievementSkills(): void {
    if (!this.selectedUserId) {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }
    if (!this.selectedAssessmentYear) {
      console.warn('No year selected.');
      this.selectedAssessmentYear = new Date();
    }

    this.fetchSelectedUserName();
    this.selectedYear = this.selectedAssessmentYear.getFullYear();

    console.log(
      `Fetching ${this.selectedYear} EmpAchievementSkills for User ID: ${this.selectedUserId}`
    );

    this.loading = true; // Show the spinner

    const skillUrl = `https://lokakarya-be.up.railway.app/empachievementskill/get/${this.selectedUserId}/${this.selectedYear}`;

    this.http
      .get<any>(skillUrl)
      .pipe(finalize(() => (this.loading = false))) // Hide spinner after loading
      .subscribe({
        next: (response) => {
          this.empAchievementSkills = response.content || [];
          console.log(
            'Fetched EmpAchievementSkills:',
            this.empAchievementSkills
          );

          // Prepare the data structure for the view
          this.groupAllAchievements();
        },
        error: (error) => {
          console.error('Error Fetching Employee AchievementSkills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee skills.',
          });
        },
      });
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
        (skill) => skill.user_id === this.currentUserId
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

  editEmpAchievementSkill(skillId: string): void {
    console.log('Editing Employee AchievementSkill with ID:', skillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;

    this.http
      .get<any>(
        `https://lokakarya-be.up.railway.app/empachievementskill/${skillId}`
      )
      .pipe(
        finalize(() => {
          this.isProcessing = false;
          this.isEditFormLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          const empAchievementSkill = response.content;
          console.log(
            'Fetched Employee AchievementSkill:',
            empAchievementSkill
          );

          this.achievementSkillEntries = [
            {
              achievement_id: empAchievementSkill.achievement_id,
              achievement: empAchievementSkill.achievement,
              skillEntrys: [
                {
                  id: empAchievementSkill.id,
                  value: empAchievementSkill.notes,
                },
              ],
              entryScores: [
                {
                  id: this.generateUniqueId(),
                  value: empAchievementSkill.score,
                },
              ],
            },
          ];

          // Set the assessment year
          this.assessmentYear = new Date(
            empAchievementSkill.assessment_year,
            0,
            1
          );

          this.displayEditDialog = true;
        },
        error: (error) => {
          console.error('Error Fetching Employee AchievementSkill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee skill details.',
          });
        },
      });
  }

  async saveEmployeeAchievementSkill(): Promise<void> {
    console.log('Saving Employee Achievement Skills.');

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

    for (const group of this.groupedEmpAchievementSkills) {
      for (const achievement of group.achievements) {
        if (
          (!achievement.notes || achievement.notes.trim() === '') &&
          (achievement.score == null || achievement.score === undefined)
        ) {
          continue;
        }

        const payload: any = {
          user_id: this.selectedUserId || this.currentUserId,
          achievement_id: achievement.achievement_id,
          assessment_year: year,
          notes: achievement.notes,
          score: achievement.score,
        };

        if (achievement.emp_skill_id) {
          payload['id'] = achievement.emp_skill_id;
          payload['updated_by'] = this.currentUserId;
          requests.push(
            this.http
              .put(
                'https://lokakarya-be.up.railway.app/empachievementskill/update',
                payload
              )
              .toPromise()
          );
        } else {
          payload['created_by'] = this.currentUserId;
          requests.push(
            this.http
              .post(
                'https://lokakarya-be.up.railway.app/empachievementskill/create',
                payload
              )
              .toPromise()
          );
        }
      }
    }

    try {
      await Promise.all(requests);
      console.log(`Employee Achievement Skills saved successfully.`);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Employee Achievement Skills saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving employee achievement skills:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save employee achievement skills.',
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpAchievementSkills();
    }
  }

  async updateEmployeeAchievementSkill(): Promise<void> {
    console.log('Updating Employee AchievementSkill.');

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

    const entry = this.achievementSkillEntries[0];
    const skillEntry = entry.skillEntrys[0];
    const scoreEntry = entry.entryScores[0];

    if (!skillEntry || skillEntry.value.trim() === '') {
      console.error('Skill entry is missing.');
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Skill entry is required.',
      });
      return;
    }

    if (scoreEntry.value == null || scoreEntry.value === undefined) {
      console.error('Score is missing for the skill entry.');
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a score for the skill entry.',
      });
      return;
    }

    const payload = {
      id: skillEntry.id,
      user_id: this.currentUserId,
      achievement_id: entry.achievement_id,
      assessment_year: year,
      notes: skillEntry.value,
      score: scoreEntry.value,
      updated_by: this.currentUserId,
    };

    console.log('Submitting Update Payload:', payload);

    try {
      await this.http
        .put(
          'https://lokakarya-be.up.railway.app/empachievementskill/update',
          payload
        )
        .toPromise();

      console.log(`Skill "${entry.achievement}" updated successfully.`);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Skill "${entry.achievement}" updated successfully.`,
      });
    } catch (error) {
      console.error(`Error updating skill "${entry.achievement}":`, error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to update skill "${entry.achievement}".`,
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpAchievementSkills();
    }
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

  openEditDialog(): void {
    console.log('Opening Achievement Skill Edit Form');
    this.editForm.reset();
    this.displayEditDialog = true;
    this.isProcessing = false;
    this.assessmentYear = this.selectedAssessmentYear;

    this.fetchEmpAchievementSkills();
  }

  submitEmployeeAchievementSkill(): void {
    console.log('Submitting Employee Achievement Skills.');
    this.isProcessing = true;
    this.saveEmployeeAchievementSkill();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  getScoreLabel(scoreValue: number | null | undefined): string {
    if (scoreValue == null) {
      return ''; // Or return a default message like 'No Score'
    }
    const scoreOption = this.scoreOptions.find(
      (option) => option.value === scoreValue
    );
    return scoreOption ? scoreOption.label : scoreValue.toString();
  }

  // Fetch achievements
  fetchAchievementSkills(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<any>('https://lokakarya-be.up.railway.app/achievement/all')
        .subscribe({
          next: (response) => {
            this.achievementSkills = (response.content || []).filter(
              (skill: any) => skill.enabled === true
            );
            console.log('Fetched AchievementSkills:', this.achievementSkills);

            resolve();
          },
          error: (error) => {
            console.error('Error fetching achievements:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch achievements.',
            });
            reject(error);
          },
        });
    });
  }

  // Fetch group achievements
  fetchGroupAchievements(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<any>('https://lokakarya-be.up.railway.app/groupachievement/all')
        .subscribe({
          next: (response) => {
            this.groupAchievements = response.content || [];
            console.log('Fetched Group Achievements:', this.groupAchievements);

            resolve();
          },
          error: (error) => {
            console.error('Error fetching group achievements:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch group achievements.',
            });
            reject(error);
          },
        });
    });
  }

  private groupAllAchievements(): void {
    const grouped = new Map<string, any>();

    // Initialize groups
    this.groupAchievements.forEach((group) => {
      grouped.set(group.id, {
        group_id: group.id,
        group_name: group.group_name,
        achievements: [],
      });
    });

    // Add achievements to their respective groups
    this.achievementSkills.forEach((achievement) => {
      const groupId = achievement.group_id;
      if (grouped.has(groupId)) {
        grouped.get(groupId).achievements.push({
          achievement_id: achievement.id,
          achievement_name: achievement.achievement,
          notes: '', // Default empty notes
          score: null, // Default null score
          emp_skill_id: null, // For updating purposes
        });
      } else {
        // Optionally handle achievements without a group
        console.warn(
          `Group ID ${groupId} not found for achievement ${achievement.id}`
        );
      }
    });

    // Merge employee data
    this.empAchievementSkills.forEach((empSkill) => {
      const groupId = empSkill.group_id;
      const achievementId = empSkill.achievement_id;

      const group = grouped.get(groupId);
      if (group) {
        const achievement = group.achievements.find(
          (ach: any) => ach.achievement_id === achievementId
        );
        if (achievement) {
          achievement.notes = empSkill.notes;
          achievement.score = empSkill.score;
          achievement.emp_skill_id = empSkill.id; // For updating purposes
        }
      }
    });

    // Convert grouped data into an array for display
    this.groupedEmpAchievementSkills = Array.from(grouped.values());
  }

  prepareAchievementSkillEntries(): void {
    const grouped = new Map<string, any>();

    // Initialize groups
    this.groupAchievements.forEach((group) => {
      grouped.set(group.id, {
        group_id: group.id,
        group_name: group.group_name,
        achievements: [],
      });
    });

    // Add achievements to their respective groups
    this.achievementSkills.forEach((achievement) => {
      const groupId = achievement.group_id;
      if (grouped.has(groupId)) {
        grouped.get(groupId).achievements.push({
          achievement_id: achievement.id,
          achievement_name: achievement.achievement,
          notes: '',
          score: null,
        });
      } else {
        // Handle achievements without a group (optional)
        console.warn(
          `Group ID ${groupId} not found for achievement ${achievement.id}`
        );
      }
    });

    // Merge employee data
    this.empAchievementSkills.forEach((empSkill) => {
      const groupId = empSkill.group_id;
      const achievementId = empSkill.achievement_id;

      const group = grouped.get(groupId);
      if (group) {
        const achievement = group.achievements.find(
          (ach: any) => ach.achievement_id === achievementId
        );
        if (achievement) {
          achievement.notes = empSkill.notes ?? '';
          achievement.score = empSkill.score ?? null;
          achievement.emp_skill_id = empSkill.id; // Store the employee skill ID for updates
        }
      }
    });

    // Convert to array
    this.achievementSkillEntries = Array.from(grouped.values());
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

  trackByAchievementSkillId(index: number, entry: any): string {
    return entry.achievement_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  trackById(index: number, item: { id: string }): string {
    return item.id;
  }
}
