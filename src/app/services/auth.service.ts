import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private roles: string[] = [];

  constructor() {
    this.loadRoles();
  }

  private loadRoles() {
    const token = sessionStorage.getItem('auth-token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.roles = payload.roles || [];
    }
  }

  public getUserRoles(): string[] {
    return this.roles;
  }

  public hasRole(role: string): boolean {
    return this.roles.includes(role);
  }
}
