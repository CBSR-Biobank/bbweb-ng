import {
  PagedReply,
  SearchParams,
  searchParams2Term,
  SearchTermToEntityIdsHash,
  SearchTermToPagedReplyHash
} from '@app/domain';
import { Study, StudyStateInfo } from '@app/domain/studies';
import { StudyCounts } from '@app/domain/studies/study-counts.model';
import { SearchState } from '@app/root-store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import * as StudyActions from './study.actions';

export interface EnableAllowdIds {
  [slug: string]: boolean;
}

export interface State extends EntityState<Study> {
  lastAddedId: string;
  searchState: SearchState<SearchTermToPagedReplyHash, SearchParams>;
  searchCollectionStudiesState: SearchState<SearchTermToEntityIdsHash, SearchParams>;
  studyCounts?: StudyCounts;
  enableAllowedIds?: EnableAllowdIds;
  error?: any;
}

export const adapter: EntityAdapter<Study> = createEntityAdapter<Study>();

export const initialState: State = adapter.getInitialState({
  lastAddedId: null,
  searchState: {
    lastSearch: null,
    replies: {},
    searchActive: false
  },
  searchCollectionStudiesState: {
    lastSearch: null,
    replies: {},
    searchActive: false
  },
  studyCounts: {} as any,
  enableAllowedIds: {},
  error: null
});

export function reducer(state = initialState, action: StudyActions.StudyActionsUnion): State {
  switch (action.type) {
    case StudyActions.getStudyCountsRequest.type:
    case StudyActions.getStudyRequest.type:
    case StudyActions.addStudyRequest.type:
    case StudyActions.getEnableAllowedRequest.type: {
      return {
        ...state,
        error: null
      };
    }

    case StudyActions.getStudyCountsSuccess.type: {
      return {
        ...state,
        studyCounts: action.studyCounts
      };
    }

    case StudyActions.searchStudiesRequest.type: {
      return {
        ...state,
        searchState: searchRequest(state.searchState, action.searchParams),
        error: null
      };
    }

    case StudyActions.searchStudiesFailure.type: {
      return {
        ...state,
        searchState: searchFailure(state.searchState),
        error: {
          actionType: action.type,
          error: action.error
        }
      };
    }

    case StudyActions.searchStudiesSuccess.type: {
      return adapter.upsertMany(action.pagedReply.entities, {
        ...state,
        searchState: searchStudiesSuccess(state.searchState, action.pagedReply)
      });
    }

    case StudyActions.searchCollectionStudiesRequest.type: {
      return {
        ...state,
        searchCollectionStudiesState: searchRequest(state.searchCollectionStudiesState, action.searchParams),
        error: null
      };
    }

    case StudyActions.searchCollectionStudiesFailure.type: {
      return {
        ...state,
        searchCollectionStudiesState: searchFailure(state.searchCollectionStudiesState),
        error: {
          actionType: action.type,
          error: action.error
        }
      };
    }

    case StudyActions.searchCollectionStudiesSuccess.type: {
      const studyStateData = action.studiesData.map(dto => new StudyStateInfo().deserialize(dto));
      if (state.searchCollectionStudiesState.lastSearch === undefined) {
        throw new Error('last search is undefined');
      }
      const searchTerm = searchParams2Term(state.searchCollectionStudiesState.lastSearch);
      const newIds = {};
      newIds[searchTerm] = action.studiesData.map(dto => dto.id);
      const newState = {
        ...state,
        searchCollectionStudiesState: {
          ...state.searchCollectionStudiesState,
          replies: {
            ...state.searchCollectionStudiesState.replies,
            ...newIds
          },
          searchActive: false
        }
      };
      return adapter.upsertMany(studyStateData as Study[], newState);
    }

    case StudyActions.addStudyRequest.type: {
      return {
        ...state,
        lastAddedId: null,
        error: null
      };
    }

    case StudyActions.addStudySuccess.type: {
      return adapter.addOne(action.study, {
        ...state,
        lastAddedId: action.study.id
      });
    }

    case StudyActions.updateStudyRequest.type:
    case StudyActions.updateStudyAddOrUpdateAnnotationTypeRequest.type:
    case StudyActions.updateStudyRemoveAnnotationTypeRequest.type: {
      return {
        ...state,
        error: null
      };
    }

    case StudyActions.updateStudySuccess.type: {
      return adapter.updateOne(
        {
          id: action.study.id,
          changes: action.study
        },
        state
      );
    }

    case StudyActions.getStudySuccess.type: {
      return adapter.upsertOne(action.study, state);
    }

    case StudyActions.getStudyFailure.type: {
      return {
        ...state,
        error: {
          actionType: action.type,
          error: action.error
        }
      };
    }

    case StudyActions.getEnableAllowedSuccess.type: {
      const enableAllowedIds = { ...state.enableAllowedIds };
      enableAllowedIds[action.studyId] = action.allowed;
      return {
        ...state,
        enableAllowedIds
      };
    }

    case StudyActions.getStudyCountsFailure.type:
    case StudyActions.addStudyFailure.type:
    case StudyActions.updateStudyFailure.type:
    case StudyActions.getEnableAllowedFailure.type:
      return {
        ...state,
        error: {
          error: action.error,
          actionType: action.type
        }
      };
  }
  return state;
}

function searchRequest<T, S>(state: SearchState<T, S>, searchTerm: S): SearchState<T, S> {
  return {
    ...state,
    lastSearch: searchTerm,
    searchActive: true
  };
}

function searchStudiesSuccess(
  state: SearchState<SearchTermToPagedReplyHash, SearchParams>,
  pagedReply: PagedReply<Study>
): SearchState<SearchTermToPagedReplyHash, SearchParams> {
  const searchTerm = searchParams2Term(state.lastSearch);
  const newReply = {};
  newReply[searchTerm] = {
    entityIds: pagedReply.entities.map(study => study.id),
    searchParams: pagedReply.searchParams,
    offset: pagedReply.offset,
    total: pagedReply.total,
    maxPages: pagedReply.maxPages
  };
  return {
    ...state,
    replies: {
      ...state.replies,
      ...newReply
    },
    searchActive: false
  };
}

function searchFailure<T, S>(state: SearchState<T, S>): SearchState<T, S> {
  return {
    ...state,
    lastSearch: null,
    searchActive: false
  };
}

export const { selectIds, selectEntities, selectAll, selectTotal } = adapter.getSelectors();
