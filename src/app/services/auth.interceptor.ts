import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('auth-token');

  const clonedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(clonedRequest).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        sessionStorage.clear(); // Optional: Clear session data
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
