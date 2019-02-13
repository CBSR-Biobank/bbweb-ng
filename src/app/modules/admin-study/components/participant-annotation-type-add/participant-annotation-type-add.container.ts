import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnnotationType } from '@app/domain/annotations';
import { Study } from '@app/domain/studies';
import { RootStoreState, StudyStoreActions, StudyStoreSelectors } from '@app/root-store';
import { select, Store } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { Subject, BehaviorSubject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-participant-annotation-type-add',
  templateUrl: './participant-annotation-type-add.container.html'
})
export class ParticipantAnnotationTypeAddContainerComponent implements OnInit, OnDestroy {

  study: Study;
  annotationType: AnnotationType;
  isSaving$ = new BehaviorSubject<boolean>(false);
  savedMessage: string;

  private annotationTypeToSave: AnnotationType;
  private unsubscribe$: Subject<void> = new Subject<void>();
  private parentStateRelativePath = '..';

  constructor(private route: ActivatedRoute,
              private router: Router,
              private store$: Store<RootStoreState.State>,
              private toastr: ToastrService) {
  }

  ngOnInit() {
    this.annotationType = new AnnotationType();

    this.store$.pipe(
      select(StudyStoreSelectors.selectAllStudies),
      takeUntil(this.unsubscribe$))
      .subscribe((studies: Study[]) => {
        const studyEntity = studies.find(s => s.slug === this.route.parent.parent.snapshot.params.slug);
        if (studyEntity) {
          this.study = (studyEntity instanceof Study)
            ? studyEntity :  new Study().deserialize(studyEntity);

          if (this.route.snapshot.params.annotationTypeId) {
            this.annotationType = this.study.annotationTypes
              .find(at => at.id === this.route.snapshot.params.annotationTypeId);
          }

          if (this.savedMessage) {
            this.isSaving$.next(false);
            this.toastr.success(this.savedMessage, 'Update Successfull');
            this.router.navigate([ this.parentStateRelativePath ], { relativeTo: this.route });
          }
        }
      });

    this.store$
      .pipe(
        select(StudyStoreSelectors.selectStudyError),
        filter(s => !!s),
        takeUntil(this.unsubscribe$))
      .subscribe((error: any) => {
        this.isSaving$.next(false);

        let errMessage = error.error.error ? error.error.error.message : error.error.statusText;
        if (errMessage.match(/EntityCriteriaError.*name already used/)) {
          errMessage = `The name is already in use: ${this.annotationTypeToSave.name}`;
        }
        this.toastr.error(errMessage, 'Add Error', { disableTimeOut: true });
        this.savedMessage = undefined;
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  onSubmit(annotationType: AnnotationType): void {
    this.isSaving$.next(true);
    this.annotationTypeToSave = annotationType;
    this.store$.dispatch(
      new StudyStoreActions.UpdateStudyAddOrUpdateAnnotationTypeRequest({
        study: this.study,
        annotationType: this.annotationTypeToSave
      }));

    this.savedMessage = this.annotationType.isNew()
      ? 'Annotation Added' : 'Annotation Updated';
  }

  onCancel(): void {
    this.router.navigate([ this.parentStateRelativePath ], { relativeTo: this.route });
  }

}
