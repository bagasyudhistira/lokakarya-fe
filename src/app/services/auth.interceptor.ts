import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import {
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');

  // Clone the request to include the token if available
  const clonedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        sessionStorage.clear();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
