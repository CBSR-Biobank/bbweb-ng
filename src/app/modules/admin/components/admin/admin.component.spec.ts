import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store, StoreModule, combineReducers } from '@ngrx/store';

import { AdminComponent } from './admin.component';
import { authReducer } from '@app/root-store/auth-store/auth-store-module-reducer';
import { AuthStoreActions, AuthStoreState } from '@app/root-store/auth-store';
import { User, UserRole } from '@app/domain/users';
import { RoleIds } from '@app/domain/access';

describe('AdminComponent', () => {
  let store: Store<AuthStoreState.State>;
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({
          'auth': authReducer
        })
      ],
      declarations: [AdminComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    });

    store = TestBed.get(Store);
    fixture = TestBed.createComponent(AdminComponent);

    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display cards when user has the correct permissions', function() {
    const roles = [
      new UserRole().deserialize({ id: RoleIds.StudyAdministrator }),
      new UserRole().deserialize({ id: RoleIds.CentreAdministrator }),
      new UserRole().deserialize({ id: RoleIds.UserAdministrator })
    ];

    roles.forEach(role => {
      const user = new User().deserialize({ roles: [role] });
      const action = new AuthStoreActions.LoginSuccessAction({ user });
      store.dispatch(action);

      fixture.detectChanges();
      const cards = fixture.debugElement.queryAll(By.css('.card'));
      expect(cards).toBeTruthy();
    });
  });
});
