import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Ensure window and localStorage are available
  if (typeof window === 'undefined' || !window.localStorage) {
    console.error('Session storage is not available.');
    router.navigate(['/login'], {
      queryParams: { warning: 'Session unavailable. Please log in again.' },
    });
    return false;
  }

  // Safely retrieve token
  const token = localStorage.getItem('auth-token');

  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (e) {
      return true; // Consider token expired if parsing fails
    }
  };

  if (token && !isTokenExpired(token)) {
    return true; // Allow access if token is valid
  }

  router.navigate(['/login'], {
    queryParams: { warning: 'Session expired or missing. Please log in.' },
  });
  return false; // Deny access
};
