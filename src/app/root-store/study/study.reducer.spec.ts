import { PagedReply, PagedReplyEntityIds, SearchParams } from '@app/domain';
import { Study } from '@app/domain/studies';
import { Factory } from '@test/factory';
import * as StudyActions from './study.actions';
import { initialState, reducer } from './study.reducer';

interface SearchSharedBehavourContext {
  createSearchRequestAction?: (sp: SearchParams) => StudyActions.StudyActionsUnion;
  createSearchFailureAction?: (e: any) => StudyActions.StudyActionsUnion;
  stateKey?: string;
}

describe('Study Reducer', () => {

  let factory: Factory;

  beforeEach(() => {
    factory = new Factory();
  });

  describe('unknown action', () => {
    it('should return the initial state', () => {
      const action = {} as any;
      const result = reducer(initialState, action);
      expect(result).toBe(initialState);
    });
  });

  it('GetStudyCountsRequest', () => {
    const action = StudyActions.getStudyCountsRequest();
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState
    });
  });

  it('GetStudyCountsSuccess', () => {
    const studyCounts = factory.studyCounts();
    const action = StudyActions.getStudyCountsSuccess({ studyCounts });
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState,
      studyCounts
    });
  });

  it('GetStudyCountsFailure', () => {
    const payload = {
      error: {
        status: 404,
        error: {
          message: 'simulated error'
        }
      }
    };
    const action = StudyActions.getStudyCountsFailure(payload);
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState,
      error: {
        actionType: action.type,
        error: action.error
      }
    });
  });

  describe('studies search', () => {

    it('Search Success', () => {
      const study = factory.study();
      const pagedReply = factory.pagedReply<Study>([ study ]);
      const action = StudyActions.searchStudiesSuccess({ pagedReply });
      const state = reducer(
        {
          ...initialState,
          searchState: {
            ...initialState.searchState,
            lastSearch: pagedReply.searchParams
          }
        },
        action);

      const searchReply: { [ key: string]: PagedReplyEntityIds } = {};
      searchReply[pagedReply.searchParams.queryString()] = {
        searchParams: pagedReply.searchParams,
        offset: pagedReply.offset,
        total: pagedReply.total,
        entityIds: pagedReply.entities.map(e => e.id),
        maxPages: pagedReply.maxPages
      };

      expect(state.searchState.searchReplies).toEqual(searchReply);
      expect(state.searchState.searchActive).toBe(false);
      expect(state.ids).toContain(study.id);
      expect(state.entities[study.id]).toEqual(study);
    });

    describe('common', () => {

      const context: SearchSharedBehavourContext = {};

      beforeEach(() => {
        context.createSearchRequestAction =
          (searchParams: SearchParams) => StudyActions.searchStudiesRequest({ searchParams });
        context.createSearchFailureAction = (error: any) => StudyActions.searchStudiesFailure({ error });
        context.stateKey = 'searchState';
      });

      searchSharedBehaviour(context);

    });

  });

  describe('collection studies search', () => {

    it('Search Success', () => {
      const study = factory.study();
      const studiesData = [ factory.entityNameAndStateDto(study) ];
      const searchParams = new SearchParams();
      const action = StudyActions.searchCollectionStudiesSuccess({ studiesData });
      const state = reducer(
        {
          ...initialState,
          searchCollectionStudiesState: {
            ...initialState.searchCollectionStudiesState,
            lastSearch: searchParams
          }
        },
        action);

      const searchReply: { [ key: string]: string[] } = {};
      searchReply[searchParams.queryString()] = [ study.id ];

      expect(state.searchCollectionStudiesState.searchReplies).toEqual(searchReply);
      expect(state.searchCollectionStudiesState.searchActive).toBe(false);
      expect(state.ids).toContain(study.id);
      expect(state.entities[study.id]).toBeTruthy();
    });

    describe('common', () => {

      const context: SearchSharedBehavourContext = {};

      beforeEach(() => {
        context.createSearchRequestAction =
          (searchParams: SearchParams) => StudyActions.searchCollectionStudiesRequest({ searchParams });
        context.createSearchFailureAction =
          (error: any) => StudyActions.searchCollectionStudiesFailure({ error });
        context.stateKey = 'searchCollectionStudiesState';
      });

      searchSharedBehaviour(context);

    });
  });

  it('AddStudyRequest', () => {
    const study = factory.study();
    const payload = { study };
    const action = StudyActions.addStudyRequest(payload);
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState,
    });
  });

  it('AddStudySuccess', () => {
    const study = factory.study();
    const payload = { study };
    const action = StudyActions.addStudySuccess(payload);
    const state = reducer(undefined, action);

    expect(state.lastAddedId).toEqual(study.id);
    expect(state.ids).toContain(study.id);
    expect(state.entities[study.id]).toEqual(study);
  });

  it('AddStudyFailure', () => {
    const payload = {
      error: {
        status: 404,
        error: {
          message: 'simulated error'
        }
      }
    };
    const action = StudyActions.addStudyFailure(payload);
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState,
      searchState: {
        ...initialState.searchState,
        lastSearch: null
      },
      error: {
        actionType: action.type,
        error: action.error
      }
    });
  });

  it('GetStudyRequest', () => {
    const study = factory.study();
    const payload = { slug: study.slug };
    const action = StudyActions.getStudyRequest(payload);
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState,
    });
  });

  it('GetStudySuccess', () => {
    const study = factory.study();
    const payload = { study };
    const action = StudyActions.getStudySuccess(payload);
    const state = reducer(undefined, action);

    expect(state.ids).toContain(study.id);
    expect(state.entities[study.id]).toEqual(study);
  });

  it('GetStudyFailure', () => {
    const payload = {
      error: {
        status: 404,
        error: {
          message: 'simulated error'
        }
      }
    };
    const action = StudyActions.getStudyFailure(payload);
    const state = reducer(undefined, action);

    expect(state).toEqual({
      ...initialState,
      searchState: {
        ...initialState.searchState,
        lastSearch: null
      },
      error: {
        actionType: action.type,
        error: action.error
      }
    });
  });

  function searchSharedBehaviour(context: SearchSharedBehavourContext) {

    describe('shared behaviour', () => {

      it('Search Request', () => {
        const searchParams = new SearchParams();
        const action = context.createSearchRequestAction(searchParams);
        const state = reducer(undefined, action);

        const expectedState = { ...initialState };
        expectedState[context.stateKey] = {
          ...initialState[context.stateKey],
          lastSearch: searchParams,
          searchActive: true
        };

        expect(state).toEqual(expectedState);
      });

      it('Search Failure', () => {
        const error = {
          status: 404,
          error: {
            message: 'simulated error'
          }
        };
        const action = context.createSearchFailureAction({ ...error });
        const state = reducer(undefined, action);
        const searchState = {};

        searchState[context.stateKey] = {
          ...initialState[context.stateKey],
          lastSearch: null
        };

        expect(state).toEqual({
          ...initialState,
          ...searchState,
          error: {
            actionType: action.type,
            error
          }
        });
      });

    });
  }

});
