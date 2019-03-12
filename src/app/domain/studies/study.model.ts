import { IEntityInfo, HasDescription, HasName, HasSlug, IEntitySet } from '@app/domain';
import { AnnotationType } from '@app/domain/annotations/annotation-type.model';
import { ConcurrencySafeEntity, IConcurrencySafeEntity } from '@app/domain/concurrency-safe-entity.model';
import { StudyState } from './study-state.enum';
import { IEntityInfoAndState } from '../entity-info-and-state.model';

export interface IStudy extends IConcurrencySafeEntity, HasSlug, HasName, HasDescription {

  /**
   * The annotation types associated with participants of this study.
   */
  annotationTypes: AnnotationType[];

  /**
   * The state can be one of: enabled, disabled, or retired.
   */
  state: StudyState;
}

export type IStudyInfo = IEntityInfo<IStudy>;

export type IStudyInfoAndState = IEntityInfoAndState<IStudy, StudyState>;

export type IStudyInfoSet = IEntitySet<IStudy>;

/*
 * A Study represents a collection of participants and specimens collected for a particular research study.
 */
export class Study extends ConcurrencySafeEntity implements IStudy {

  slug: string;
  name: string;
  description: string | null;
  annotationTypes: AnnotationType[] = [];
  state: StudyState;

  deserialize(input: any) {
    super.deserialize(input);

    if (((input.description === undefined))) {
      this.description = undefined;
    }

    if (input.annotationTypes) {
      this.annotationTypes = input.annotationTypes
        .map((at: any) => new AnnotationType().deserialize(at));
    }
    return this;
  }

  /**
   * Used to query the study's current state.
   *
   * @returns {boolean} <code>true</code> if the study is in <code>disabled</code> state.
   */
  isDisabled(): boolean {
    return (this.state === StudyState.Disabled);
  }

  /**
   * Used to query the study's current state.
   *
   * @returns {boolean} <code>true</code> if the study is in <code>enabled</code> state.
   */
  isEnabled(): boolean {
    return (this.state === StudyState.Enabled);
  }

  /**
   * Used to query the study's current state.
   *
   * @returns {boolean} <code>true</code> if the study is in <code>retired</code> state.
   */
  isRetired(): boolean {
    return (this.state === StudyState.Retired);
  }


}

export type StudyToAdd = Pick<Study, 'name' | 'description' >;
