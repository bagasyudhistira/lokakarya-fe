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
  selector: 'app-manage-achievement',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
  ],
  templateUrl: './manage-achievement.component.html',
  styleUrl: './manage-achievement.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageAchievementComponent implements OnInit {
  groupedAchievements: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  mode: 'create' | 'edit' = 'create';
  roles: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  displayGroupEditDialog: boolean = false;
  editForm!: FormGroup;
  editGroupForm!: FormGroup;
  globalFilterValue: string = '';
  filteredGroupedAchievements: any[] = [];
  filteredAchievements: any[] = [];
  allAchievements: any[] = [];
  groupOptions: any[] = [];

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
    this.initializeForms();
    this.fetchData();
    console.log('Component Initialized');
  }

  private initializeForms() {
    console.log('Initializing Forms...');
    this.editForm = this.fb.group({
      id: [''],
      achievement: ['', Validators.required],
      group_id: ['', Validators.required],
      enabled: [true],
    });

    this.editGroupForm = this.fb.group({
      id: [''],
      group_name: ['', Validators.required],
      percentage: [null, Validators.required],
      enabled: [true],
    });

    this.currentUserId = this.extractCurrentUserId() || '';
    console.log(
      'Forms Initialized:',
      this.editForm.value,
      this.editGroupForm.value
    );
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

  fetchData(): void {
    console.log('Fetching Groups and Achievements...');
    this.loading = true;

    const groupsRequest = this.http.get<any>(
      'https://lokakarya-be.up.railway.app/groupachievement/all'
    );
    const attAchievementsRequest = this.http.get<any>(
      'https://lokakarya-be.up.railway.app/achievement/all'
    );

    forkJoin([groupsRequest, attAchievementsRequest])
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ([groupsResponse, attAchievementsResponse]) => {
          const groups = groupsResponse.content || [];
          const attAchievements = attAchievementsResponse.content || [];

          this.groupedAchievements = groups.map((group: any) => ({
            ...group,
            skills:
              attAchievements.filter(
                (skill: any) => skill.group_id === group.id
              ) || [],
          }));
          this.allAchievements = attAchievements;

          this.groupOptions = groups.map((group: any) => ({
            label: group.group_name,
            value: group.id,
          }));

          this.applyFiltersAndPagination();
        },
        error: (error) => {
          console.error('Error Fetching Data:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch groups and achievements.',
          });
        },
      });
  }

  openCreateAchievementDialog(): void {
    console.log('Opening Create Achievement Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      achievement: '',
      enabled: true,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  openCreateGroupDialog(): void {
    console.log('Opening Create Group Dialog');
    this.mode = 'create';
    this.editGroupForm.reset({
      id: '',
      group_name: '',
      percentage: null,
      enabled: true,
    });

    this.displayGroupEditDialog = true;
    this.isProcessing = false;
  }

  async saveGroupAchievement(): Promise<void> {
    console.log('Saving Group Achievement. Mode:', this.mode);

    if (!this.editGroupForm.valid) {
      console.error('Group Form Validation Failed:', this.editGroupForm.errors);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields.',
      });
      return;
    }

    const payload = {
      ...this.editGroupForm.value,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://lokakarya-be.up.railway.app/groupachievement/create',
            payload
          )
        : this.http.put(
            'https://lokakarya-be.up.railway.app/groupachievement/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Group achievement saved successfully.',
        });
        this.displayGroupEditDialog = false;
        this.fetchData();
      },
      error: (error) => {
        console.error('Error Saving Group Achievement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save group achievement.',
        });
      },
    });
  }

  editGroupAchievement(groupId: string): void {
    console.log('Editing Group Achievement with ID:', groupId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit'; // Set mode to edit for group

    const groupRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/groupachievement/${groupId}`
    );

    this.displayGroupEditDialog = false;

    groupRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (groupResponse) => {
        console.log('Group Achievement Fetched:', groupResponse);
        const group = groupResponse.content;

        this.editGroupForm.patchValue({
          id: group.id,
          group_name: group.group_name,
          percentage: group.percentage,
          enabled: group.enabled,
        });

        this.displayGroupEditDialog = true;
        this.isEditFormLoading = false;
      },
      error: (error) => {
        console.error('Error Fetching Group Achievement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch group achievement details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  deleteGroupAchievement(groupId: string): void {
    console.log('Deleting Group Achievement with ID:', groupId);

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this group achievement?',
      accept: () => {
        this.http
          .delete(
            `https://lokakarya-be.up.railway.app/groupachievement/${groupId}`
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Group achievement deleted successfully.',
              });
              this.fetchData();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete group achievement.',
              });
            },
          });
      },
    });
  }

  // Achievement Methods
  openAchievementEditDialog(skill: any): void {
    console.log('Editing Achievement:', skill);
    this.mode = 'edit';
    this.editForm.patchValue({
      ...skill,
    });
    this.displayEditDialog = true;
  }

  async saveAchievement(): Promise<void> {
    console.log('Saving Achievement. Mode:', this.mode);

    if (!this.editForm.valid) {
      console.error(
        'Achievement Form Validation Failed:',
        this.editForm.errors
      );
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

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://lokakarya-be.up.railway.app/achievement/create',
            payload
          )
        : this.http.put(
            'https://lokakarya-be.up.railway.app/achievement/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Achievement saved successfully.',
        });
        this.displayEditDialog = false;
        this.fetchData();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save achievement.',
        });
      },
    });
  }

  editAchievement(skillId: string): void {
    console.log('Editing Achievement with ID:', skillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit'; // Set mode to edit for achievement

    const skillRequest = this.http.get<any>(
      `https://lokakarya-be.up.railway.app/achievement/${skillId}`
    );

    this.displayEditDialog = false;

    skillRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (skillResponse) => {
        console.log('Achievement Fetched:', skillResponse);
        const skill = skillResponse.content;

        this.editForm.patchValue({
          id: skill.id,
          achievement: skill.achievement,
          group_id: skill.group_id,
          enabled: skill.enabled,
        });

        this.displayEditDialog = true;
        this.isEditFormLoading = false;
      },
      error: (error) => {
        console.error('Error Fetching Achievement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch achievement details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  deleteAchievement(skillId: string): void {
    console.log('Deleting Achievement with ID:', skillId);

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this achievement?',
      accept: () => {
        this.http
          .delete(`https://lokakarya-be.up.railway.app/achievement/${skillId}`)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Achievement deleted successfully.',
              });
              this.fetchData();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete achievement.',
              });
            },
          });
      },
    });
  }
  applyFiltersAndPagination(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    const filterValue = this.globalFilterValue?.toLowerCase() || '';

    // Filter Grouped Achievements
    const filteredGroupedAchievements = this.groupedAchievements
      .map((group) => {
        const filteredAchievements = group.skills.filter((skill: any) =>
          Object.values(skill).some((value) =>
            String(value).toLowerCase().includes(filterValue)
          )
        );

        const matchesGroupName = group.group_name
          .toLowerCase()
          .includes(filterValue);

        if (matchesGroupName || filteredAchievements.length > 0) {
          return {
            ...group,
            skills:
              filteredAchievements.length > 0
                ? filteredAchievements
                : group.skills,
          };
        }
        return null;
      })
      .filter((group) => group !== null);

    // Flatten skills for sorting
    let flatAchievements = filteredGroupedAchievements.flatMap((group) =>
      group.skills.map((skill: any) => ({
        ...skill,
        group_name: group.group_name,
        percentage: group.percentage,
      }))
    );

    // Apply sorting
    if (event?.sortField) {
      const sortField = event.sortField;
      const sortOrder = event.sortOrder || 1;

      flatAchievements = flatAchievements.sort((a, b) => {
        const valueA = a[sortField];
        const valueB = b[sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Paginate Achievements
    const paginatedAchievements = flatAchievements.slice(startIndex, endIndex);

    // Update component state
    this.filteredGroupedAchievements = filteredGroupedAchievements;
    this.filteredAchievements = paginatedAchievements;
    this.totalRecords = flatAchievements.length;

    console.log(
      'Filtered Grouped Achievements:',
      this.filteredGroupedAchievements
    );
    console.log('Paginated Achievements:', this.filteredAchievements);
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

  submitAchievement(): void {
    console.log('Submitting Achievement. Mode:', this.mode);
    this.isProcessing = true;
    this.saveAchievement();
  }

  submitGroupAchievement(): void {
    console.log('Submitting Group Achievement. Mode:', this.mode);
    this.isProcessing = true;
    this.saveGroupAchievement();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }
}
