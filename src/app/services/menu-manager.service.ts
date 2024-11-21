import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MenuManagerService {
  private baseUrl = 'http://localhost:8081/auth/role';

  constructor(private http: HttpClient) {}

  getMenuByRole(roleName: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${roleName}`);
  }

  getMenusByRoles(roleNames: string[]): Observable<any[]> {
    const requests = roleNames.map((role) => this.getMenuByRole(role));
    return forkJoin(requests);
  }
}
