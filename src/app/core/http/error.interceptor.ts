import { Injectable, isDevMode } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '@app/core/services';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService,
              private router: Router) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(catchError(error => {
      if (error instanceof HttpErrorResponse) {

        switch (error.status) {
          case 401:
            if (isDevMode()) {
              this.router.navigateByUrl('/401');
            } else {
              // auto logout if 401 response returned from api
              this.authService.logout();

              // if not at the login or forgot password page then reload the page
              if ((location.pathname !== '/login') && (location.pathname !== '/forgot')) {
                location.reload();
              }
            }
            break;

          default:
            if (!request.url.includes('/api/participants/') || (request.method !== 'GET')) {
              this.router.navigateByUrl('/server-error');
            }
        }

      }

      return throwError(error);
    }));
  }
}
