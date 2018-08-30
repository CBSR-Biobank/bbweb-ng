import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { hot, cold } from 'jasmine-marbles';
import { Observable, of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AuthStoreEffects } from './auth-store-module-effects';
import { AuthStoreActions } from '@app/root-store/auth-store';
import { AuthService } from '@app/core/services';
import { User } from '@app/domain/users';

describe('auth-store-module effects', () => {

  let effects: AuthStoreEffects;
  let actions: Observable<any>;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ],
      providers: [
        AuthStoreEffects,
        provideMockActions(() => actions)
      ]
    });

    effects = TestBed.get(AuthStoreEffects);
    authService = TestBed.get(AuthService);
  });

  describe('loginRequestEffect', () => {
    const credentials = {
      email: 'test@test.com',
      password: 'a random password'
    };
    const user = new User().deserialize({
      name: 'Random person',
      email: credentials.email,
    });

    it('should respond with login success', () => {
      const action = new AuthStoreActions.LoginRequestAction(credentials);
      const completion = new AuthStoreActions.LoginSuccessAction({ user });
      spyOn(authService, 'login').and.returnValue(of(user));

      actions = hot('--a-', { a: action });
      const expected = cold('--b', { b: completion });

      expect(effects.loginRequestEffect$).toBeObservable(expected);
    });

    it('should respond with login failure', () => {
      const error = {
        status: 401,
        error: {
          message: 'simulated error'
        }
      };
      const action = new AuthStoreActions.LoginRequestAction(credentials);
      const completion = new AuthStoreActions.LoginFailureAction({ error });
      spyOn(authService, 'login').and.returnValue(throwError(error));

      actions = hot('--a-', { a: action });
      const expected = cold('--b', { b: completion });

      expect(effects.loginRequestEffect$).toBeObservable(expected);
    });

  });

  describe('logoutRequestEffect', () => {

    it('should respond with logout success', () => {
      const action = new AuthStoreActions.LogoutRequestAction();
      const completion = new AuthStoreActions.LogoutSuccessAction();
      spyOn(authService, 'logout').and.returnValue(null);

      actions = hot('--a-', { a: action });
      const expected = cold('--b', { b: completion });

      expect(effects.logoutRequestEffect$).toBeObservable(expected);
      expect(authService.logout).toHaveBeenCalled();
    });

  });

  describe('registerRequestEffect', () => {
    const regInfo = {
      name: 'Random person',
      email: 'test@test.com',
      password: 'a random password'
    };
    const user = new User().deserialize({
      name: regInfo.name,
      email: regInfo.email,
    });

    it('should respond with register success', () => {
      const action = new AuthStoreActions.RegisterRequestAction(regInfo);
      const completion = new AuthStoreActions.RegisterSuccessAction({ user });
      spyOn(authService, 'register').and.returnValue(of(user));

      actions = hot('--a-', { a: action });
      const expected = cold('--b', { b: completion });

      expect(effects.registerRequestEffect$).toBeObservable(expected);
    });

    it('should respond with register failure', () => {
      const error = {
        status: 401,
        error: {
          message: 'simulated error'
        }
      };
      const action = new AuthStoreActions.RegisterRequestAction(regInfo);
      const completion = new AuthStoreActions.RegisterFailureAction({ error });
      spyOn(authService, 'register').and.returnValue(throwError(error));

      actions = hot('--a-', { a: action });
      const expected = cold('--b', { b: completion });

      expect(effects.registerRequestEffect$).toBeObservable(expected);
    });

  });

});