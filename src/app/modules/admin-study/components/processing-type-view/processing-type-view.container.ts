import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AnnotationType } from '@app/domain/annotations';
import { CollectionEventType, ProcessingType, ProcessingTypeInputEntity, Study } from '@app/domain/studies';
import { ModalInputTextareaOptions, ModalInputTextOptions } from '@app/modules/modals/models';
import { EventTypeStoreActions, EventTypeStoreSelectors, ProcessingTypeStoreActions, ProcessingTypeStoreSelectors, RootStoreState, StudyStoreSelectors } from '@app/root-store';
import { SpinnerStoreSelectors } from '@app/root-store/spinner';
import { AnnotationTypeRemoveComponent } from '@app/shared/components/annotation-type-remove/annotation-type-remove.component';
import { AnnotationTypeViewComponent } from '@app/shared/components/annotation-type-view/annotation-type-view.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Dictionary } from '@ngrx/entity';
import { Action, createSelector, select, Store } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { filter, map, shareReplay, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { ProcessingInputSpecimenModalComponent } from '../processing-input-specimen-modal/processing-input-specimen-modal.component';
import { ProcessingOutputSpecimenModalComponent } from '../processing-output-specimen-modal/processing-output-specimen-modal.component';
import { ProcessingTypeRemoveComponent } from '../processing-type-remove/processing-type-remove.component';

interface StoreData {
  study: Study;
  processingType?: ProcessingType;
  processingTypes: ProcessingType[];
  eventTypes: CollectionEventType[];
}

@Component({
  selector: 'app-processing-type-view',
  templateUrl: './processing-type-view.container.html'
})
export class ProcessingTypeViewContainerComponent implements OnInit, OnDestroy {

  @ViewChild('updateNameModal') updateNameModal: TemplateRef<any>;
  @ViewChild('updateDescriptionModal') updateDescriptionModal: TemplateRef<any>;
  @ViewChild('updateEnabledModal') updateEnabledModal: TemplateRef<any>;
  @ViewChild('processingTypeInUseModal') processingTypeInUseModal: TemplateRef<any>;

  isLoading$: Observable<boolean>;

  processingType$: Observable<ProcessingType>;
  allowChanges$: Observable<boolean>;
  processingTypeId: string;
  isAddingAnnotation = false;
  updateNameModalOptions: ModalInputTextOptions = {
    required: true,
    minLength: 2
  };
  updateDescriptionModalOptions: ModalInputTextareaOptions = {
    rows: 20,
    cols: 10
  };
  inputEntity: ProcessingTypeInputEntity;

  private data$: Observable<StoreData>;
  private dataSubject = new BehaviorSubject(null);
  private inputEntityRequested = false;
  private updatedMessage$ = new Subject<string>();
  private unsubscribe$ = new Subject<void>();

  constructor(private store$: Store<RootStoreState.State>,
              private router: Router,
              private route: ActivatedRoute,
              private modalService: NgbModal,
              private toastr: ToastrService) {}

  ngOnInit() {
    this.processingTypeId = this.route.snapshot.data.processingType.id;
    this.route.data.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(data => {
      if (this.processingTypeId !== data.processingType.id) {
        // user selected a different event type
        this.processingTypeId = data.processingType.id;
        this.inputEntityRequested = false;
        this.updatedMessage$.next(null);
      }
    });

    const entitiesSelector = createSelector(
      StudyStoreSelectors.selectAllStudyEntities,
      ProcessingTypeStoreSelectors.selectAllProcessingTypes,
      EventTypeStoreSelectors.selectAllEventTypes,
      (studies: Dictionary<Study>,
       processingTypes: ProcessingType[],
       eventTypes: CollectionEventType[]): StoreData => {
        const studyId = this.route.snapshot.data.processingType.studyId;
        const studyEntity = studies[studyId];
        let study: Study;

        if (studyEntity) {
          study = (studyEntity instanceof Study) ? studyEntity :  new Study().deserialize(studyEntity);
        }

        return {
          study,
          processingTypes: processingTypes.filter(pt => pt.studyId === studyId),
          eventTypes: eventTypes.filter(et => et.studyId === studyId)
        };
      });

    this.data$ = combineLatest([ this.route.data, this.store$.pipe(select(entitiesSelector)) ]).pipe(
      map(([ routeData, entities ]) => {
        const processingType = this.getProcessingType(routeData.processingType.id, entities.processingTypes);

        if (processingType !== undefined) {
          this.inputEntity = this.queryForInputEntity(processingType,
                                                      entities.eventTypes,
                                                      entities.processingTypes);
        }

        return {
          ...entities,
          processingType
        };
      }),
      takeUntil(this.unsubscribe$),
      shareReplay());

    this.data$.pipe(takeUntil(this.unsubscribe$)).subscribe(this.dataSubject);
    this.processingType$ = this.data$.pipe(map(entities => entities.processingType));
    this.allowChanges$ = this.data$.pipe(
      map(entities => (entities && entities.study) ? entities.study.isDisabled() : false));
    this.isLoading$ = this.data$.pipe(
      map(data => (data === undefined) || (data.processingType === undefined)));

    this.data$.pipe(
      withLatestFrom(this.updatedMessage$),
      takeUntil(this.unsubscribe$)
    ).subscribe(([ data, msg ]) => {
      if (msg === null) { return; }

      if (data.processingType !== undefined) {
        this.toastr.success(msg, 'Update Successfull');
        if (data.processingType.slug !== this.route.parent.snapshot.params.processingTypeSlug) {
          // name was changed and new slug was assigned
          //
          // need to change state since slug is used in URL and by breadcrumbs
          this.router.navigate([
            '/admin/studies',
            data.study.slug,
            'processing',
            'view',
            data.processingType.slug
          ]);
        }
      } else {
        this.toastr.success(msg, 'Remove Successfull');
        this.router.navigate([ '/admin/studies', data.study.slug, 'processing' ]);
      }

      this.updatedMessage$.next(null);
    });

    this.store$.pipe(
      select(ProcessingTypeStoreSelectors.selectError),
      filter(error => !!error),
      withLatestFrom(this.updatedMessage$),
      takeUntil(this.unsubscribe$)
    ).subscribe(([error, _msg]) => {
      let errMessage = error.error.error ? error.error.error.message : error.error.statusText;
      if (errMessage.indexOf('already exists') > -1) {
        errMessage = 'A processing step with that name already exists. Please use another name.';
      }
      this.toastr.error(errMessage, 'Update Error', { disableTimeOut: true });
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  updateName() {
    this.whenStudyDisabled((_study, processingType) => {
      this.modalService.open(this.updateNameModal, { size: 'lg' }).result
        .then((value) => {
          this.store$.dispatch(new ProcessingTypeStoreActions.UpdateProcessingTypeRequest({
            processingType,
            attributeName: 'name',
            value
          }));
          this.updatedMessage$.next('Step name was updated');
        })
        .catch(() => undefined);
    });
  }

  updateDescription() {
    this.whenStudyDisabled((_study, processingType) => {
      this.modalService.open(this.updateDescriptionModal, { size: 'lg' }).result
        .then((value) => {
          this.store$.dispatch(new ProcessingTypeStoreActions.UpdateProcessingTypeRequest({
            processingType,
            attributeName: 'description',
            value: value ? value : undefined
          }));
          this.updatedMessage$.next('Step description was updated');
        })
        .catch(() => undefined);
    });
  }

  updateEnabled() {
    this.whenStudyDisabled((_study, processingType) => {
      this.modalService.open(this.updateEnabledModal, { size: 'lg' }).result
        .then(value => {
          this.store$.dispatch(new ProcessingTypeStoreActions.UpdateProcessingTypeRequest({
            processingType,
            attributeName: 'enabled',
            value
          }));
          this.updatedMessage$.next('Enabled was updated');
        })
        .catch(() => undefined);
    });
  }

  addAnnotationType() {
    this.whenStudyDisabled(() => {
      this.router.navigate([ 'annotationAdd' ], { relativeTo: this.route });
    });
  }

  viewAnnotationType(annotationType: AnnotationType): void {
    const modalRef = this.modalService.open(AnnotationTypeViewComponent, { size: 'lg' });
    modalRef.componentInstance.annotationType = annotationType;

    // nothing is done with this modal's result
    modalRef.result
      .then(() => undefined)
      .catch(() => undefined);
  }

  editAnnotationType(annotationType: AnnotationType): void {
    this.whenStudyDisabled(() => {
      this.router.navigate([ 'annotation', annotationType.id ], { relativeTo: this.route });
    });
  }

  removeAnnotationType(annotationType: AnnotationType): void {
    this.whenStudyDisabled((_study, processingType) => {
      const modalRef = this.modalService.open(AnnotationTypeRemoveComponent);
      modalRef.componentInstance.annotationType = annotationType;
      modalRef.result
        .then(() => {
          this.store$.dispatch(
            new ProcessingTypeStoreActions.UpdateProcessingTypeRemoveAnnotationTypeRequest({
              processingType,
              annotationTypeId: annotationType.id
            }));

          this.updatedMessage$.next('Annotation removed');
        })
        .catch(() => undefined);
    });
  }

  updateInputSpecimen() {
    this.whenStudyDisabled((study, processingType) => {
      const modalRef = this.modalService.open(ProcessingInputSpecimenModalComponent,
                                              { size: 'lg' });
      modalRef.componentInstance.study = study;
      modalRef.componentInstance.processingType = processingType;
      modalRef.result
        .then(input => {
          if (input === 'Cancel') { return; }

          this.store$.dispatch(new ProcessingTypeStoreActions.UpdateProcessingTypeRequest({
            processingType,
            attributeName: 'inputSpecimenProcessing',
            value: input
          }));

          this.updatedMessage$.next('Input specimen updated');
        })
        .catch(() => undefined);
    });
  }

  updateOutputSpecimen() {
    this.whenStudyDisabled((study, processingType) => {
      const modalRef = this.modalService.open(ProcessingOutputSpecimenModalComponent,
                                              { size: 'lg' });
      modalRef.componentInstance.study = study;
      modalRef.componentInstance.processingType = processingType;
      modalRef.componentInstance.eventTypes = this.dataSubject.value.eventTypes;
      modalRef.componentInstance.processingTypes = this.dataSubject.value.processingTypes;
      modalRef.result
        .then(output => {
          if (output === 'Cancel') { return; }

          this.store$.dispatch(new ProcessingTypeStoreActions.UpdateProcessingTypeRequest({
            processingType,
            attributeName: 'outputSpecimenProcessing',
            value: output
          }));

          this.updatedMessage$.next('Output specimen updated');
        })
        .catch(() => undefined);
    });
  }

  removeProcessingType() {
    this.whenStudyDisabled((_study, processingType) => {
      if (processingType.inUse) {
        this.modalService.open(this.processingTypeInUseModal, { size: 'lg' });
        return;
      }

      const modalRef = this.modalService.open(ProcessingTypeRemoveComponent, { size: 'lg' });
      modalRef.componentInstance.processingType = processingType;
      modalRef.result
        .then(() => {
          this.store$.dispatch(new ProcessingTypeStoreActions.RemoveProcessingTypeRequest({
            processingType
          }));
          this.updatedMessage$.next('Processing step removed');
        })
        .catch(() => undefined);
    });
  }

  addProcessingTypeSelected() {
    this.whenStudyDisabled((study, _processingType) => {
      // relative route does not work here, why?
      this.router.navigate([ `/admin/studies/${study.slug}/processing/add` ]);
    });
  }

  processingTypeSelected(processingType: ProcessingType) {
    const study = this.dataSubject.value.study;
    // relative route does not work here, why?
    this.router.navigate([ `/admin/studies/${study.slug}/processing/${processingType.slug}` ]);
  }

  private queryForInputEntity(
    processingType: ProcessingType,
    eventTypes: CollectionEventType[],
    processingTypes: ProcessingType[]
  ): ProcessingTypeInputEntity {
    const inputEntity =
      (processingType.input.definitionType === 'collected')
      ? eventTypes.find(et => et.id === processingType.input.entityId)
      : processingTypes.find(pt => pt.id === processingType.input.entityId);

    if (inputEntity) { return inputEntity; }

    if (this.inputEntityRequested) { return undefined; }

    let action: Action;
    // then entity has not been retrieved from the server yet
    if (processingType.input.definitionType === 'collected') {
      action = EventTypeStoreActions.getEventTypeByIdRequest({
        studyId: processingType.studyId,
        eventTypeId: processingType.input.entityId
      });
    } else {
      action = new ProcessingTypeStoreActions.GetProcessingTypeByIdRequest({
        studyId: processingType.studyId,
        processingTypeId: processingType.input.entityId
      });
    }
    this.inputEntityRequested = true;
    this.store$.dispatch(action);
    return undefined;
  }

  private getProcessingType(id: string, processingTypes: ProcessingType[]): ProcessingType {
    const ptEntity = processingTypes.find((pt: ProcessingType) => pt.id === id);
    if (ptEntity) {
      return (ptEntity instanceof ProcessingType)
        ? ptEntity : new ProcessingType().deserialize(ptEntity);
    }
    return undefined;
  }

  private whenStudyDisabled(fn: (study: Study, processingType: ProcessingType) => void) {
    const study = this.dataSubject.value.study;
    if (!study.isDisabled()) {
      throw new Error('modifications not allowed');
    }

    fn(study, this.dataSubject.value.processingType);
  }

}
