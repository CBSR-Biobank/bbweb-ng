import { CUSTOM_ELEMENTS_SCHEMA, NgZone } from '@angular/core';
import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Study } from '@app/domain/studies';
import { StudyStoreActions, StudyStoreReducer } from '@app/root-store';
import { Factory } from '@test/factory';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Store, StoreModule } from '@ngrx/store';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { StudySummaryComponent } from './study-summary.component';
import { SpinnerStoreReducer } from '@app/root-store/spinner';

describe('StudySummaryComponent', () => {

  let component: StudySummaryComponent;
  let fixture: ComponentFixture<StudySummaryComponent>;
  let ngZone: NgZone;
  let store: Store<StudyStoreReducer.State>;
  let router: Router;
  let modalService: NgbModal;
  let factory: Factory;
  let study: Study;

  beforeEach(async(() => {
    factory = new Factory();
    study = new Study().deserialize(factory.study());

    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NgbModule,
        RouterTestingModule,
        StoreModule.forRoot({
          'study': StudyStoreReducer.reducer,
          'spinner': SpinnerStoreReducer.reducer
        }),
        ToastrModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              snapshot: {
                params: {
                  slug: study.slug
                }
              }
            },
            snapshot: {}
          }
        }
      ],
      declarations: [ StudySummaryComponent ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    ngZone = TestBed.get(NgZone);
    store = TestBed.get(Store);
    router = TestBed.get(Router);
    modalService = TestBed.get(NgbModal);
    fixture = TestBed.createComponent(StudySummaryComponent);
    component = fixture.componentInstance;

    ngZone.run(() => router.initialNavigation());
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('isEnableAllowed resolved correctly', () => {
    fixture.detectChanges();
    expect(component.isEnableAllowed).toBeUndefined();

    ngZone.run(() => store.dispatch(new StudyStoreActions.GetStudySuccess({ study })));
    fixture.detectChanges();

    [ true, false ].forEach(allowed => {
      store.dispatch(new StudyStoreActions.GetEnableAllowedSuccess({ studyId: study.id, allowed }));
      fixture.detectChanges();
      expect(component.isEnableAllowed).toBe(allowed);
    });
  });

  it('navigates to new path when study name is changed', () => {
    const studyWithNewName = new Study().deserialize({
      ...study,
      ...factory.nameAndSlug
    });

    const routerListener = jest.spyOn(router, 'navigate');

    ngZone.run(() => store.dispatch(new StudyStoreActions.GetStudySuccess({ study: studyWithNewName })));
    fixture.detectChanges();

    expect(routerListener.mock.calls.length).toBe(1);
    expect(routerListener.mock.calls[0][0]).toEqual([ '../..', studyWithNewName.slug, 'summary' ]);
  });

  describe('common behaviour', () => {

    /* tslint:disable:no-shadowed-variable */
    const componentModalFuncs = [
      (component) => component.updateName(),
      (component) => component.updateDescription()
    ];
    /* tslint:disable:no-shadowed-variable */

    it('functions should open a modal', fakeAsync(() => {
      const testData = [
        {
          componentFunc: (component) => component.updateName(),
          attribute: 'name',
          value: 'test'
        },
        {
          componentFunc: (component) => component.updateDescription(),
          attribute: 'description',
          value: 'test'
        }
      ];

      const storeListener = jest.spyOn(store, 'dispatch');
      const modalListener = jest.spyOn(modalService, 'open');

      ngZone.run(() => store.dispatch(new StudyStoreActions.GetStudySuccess({ study })));
      fixture.detectChanges();

      storeListener.mockClear();
      testData.forEach((testInfo, index) => {
        modalListener.mockReturnValue({
          componentInstance: {},
          result: Promise.resolve(testInfo.value)
        });

        testInfo.componentFunc(component);
        fixture.detectChanges();
        tick(1000);

        expect(storeListener.mock.calls.length).toBe(index + 1);
        expect(storeListener.mock.calls[index][0]).toEqual(new StudyStoreActions.UpdateStudyRequest({
          study,
          attributeName: testInfo.attribute,
          value: testInfo.value
        }));
      });
      expect(modalListener.mock.calls.length).toBe(componentModalFuncs.length);
    }));

    it('functions that should notify the user', fakeAsync(() => {
      const toastr = TestBed.get(ToastrService);

      jest.spyOn(toastr, 'success').mockReturnValue(null);
      jest.spyOn(store, 'dispatch');
      jest.spyOn(modalService, 'open').mockReturnValue({
        componentInstance: {},
        result: Promise.resolve('test')
      });

      ngZone.run(() => store.dispatch(new StudyStoreActions.GetStudySuccess({ study })));
      fixture.detectChanges();

      const componentUpdateFuncs = [
        (component) => component.disable(),
        (component) => component.enable(),
        (component) => component.retire(),
        (component) => component.unretire()
      ].concat(componentModalFuncs);

      componentUpdateFuncs.forEach(updateFunc => {
        updateFunc(component);
        fixture.detectChanges();
        tick(1000);
        expect(store.dispatch).toHaveBeenCalled();
        ngZone.run(() => store.dispatch(new StudyStoreActions.UpdateStudySuccess({ study })));
        tick(1000);
      });

      tick(1000);
      expect(toastr.success.mock.calls.length).toBe(componentUpdateFuncs.length);
    }));

    it('functions that change the study state', fakeAsync(() => {
      ngZone.run(() => store.dispatch(new StudyStoreActions.GetStudySuccess({ study })));
      fixture.detectChanges();

      const testData = [
        { componentFunc: (component) => component.disable(),  value: 'disable' },
        { componentFunc: (component) => component.enable(),   value: 'enable' },
        { componentFunc: (component) => component.retire(),   value: 'retire' },
        { componentFunc: (component) => component.unretire(), value: 'unretire' }
      ];

      const storeListener = jest.spyOn(store, 'dispatch');
      testData.forEach((testInfo, index) => {
        testInfo.componentFunc(component);
        fixture.detectChanges();
        tick(1000);

        expect(storeListener.mock.calls.length).toBe(index + 1);
        expect(storeListener.mock.calls[index][0]).toEqual(new StudyStoreActions.UpdateStudyRequest({
          study,
          attributeName: 'state',
          value: testInfo.value
        }));
      });
    }));
  });

});
