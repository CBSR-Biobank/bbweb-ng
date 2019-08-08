import { EntityIds, PagedReply, PagedReplyEntityIds } from '@app/domain';
import { CollectionEventType, IStudy } from '@app/domain/studies';
import { EventTypeStoreReducer, EventTypeStoreSelectors } from '@app/root-store';
import { Factory } from '@test/factory';

describe('EventTypeStore selectors', () => {
  const factory = new Factory();

  describe('selectSearchRepliesAndEntities', () => {
    let eventType: CollectionEventType;
    let pagedReply: PagedReply<CollectionEventType>;
    let replies: { [key: string]: PagedReplyEntityIds };

    beforeEach(() => {
      eventType = new CollectionEventType().deserialize(factory.collectionEventType());
      pagedReply = factory.pagedReply<CollectionEventType>([eventType]);
      replies = {};
      replies[factory.defaultStudy().id] = {} as any;
      replies[factory.defaultStudy().id][JSON.stringify(pagedReply.searchParams)] = {
        searchParams: pagedReply.searchParams,
        offset: pagedReply.offset,
        total: pagedReply.total,
        entityIds: pagedReply.entities.map(e => e.id),
        maxPages: pagedReply.maxPages
      };
    });

    it('returns entities', () => {
      const state = initialStateWithEntity(eventType, {
        searchState: {
          lastSearch: {
            studyId: factory.defaultStudy().id,
            params: pagedReply.searchParams
          },
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toEqual({
        entities: [eventType],
        hasNoEntitiesToDisplay: false,
        hasNoResultsToDisplay: false,
        hasResultsToDisplay: true,
        total: pagedReply.total,
        maxPages: pagedReply.maxPages,
        showPagination: false
      });
    });

    it('when search is active returns undefined', () => {
      const state = initialStateWithEntity(eventType, {
        searchState: {
          searchActive: true,
          lastSearch: pagedReply.searchParams,
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toBeUndefined();
    });

    it('when there have been no previous searches returns undefined', () => {
      const state = initialStateWithEntity(eventType, {
        searchState: {
          lastSearch: null,
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toBeUndefined();
    });

    it('when the search was never completed returns undefined', () => {
      const state = initialStateWithEntity(eventType, {
        searchState: {
          lastSearch: {
            studyId: factory.defaultStudy().id,
            params: { sort: 'name' }
          },
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toBeUndefined();
    });
  });

  describe('selectNamesSearchRepliesAndEntities', () => {
    let study: IStudy;
    let eventType: CollectionEventType;
    const searchParams = {};
    let replies: { [key: string]: EntityIds };

    beforeEach(() => {
      eventType = new CollectionEventType().deserialize(factory.collectionEventType());
      study = factory.defaultStudy();
      replies = {};
      replies[study.id] = {} as any;
      replies[study.id][JSON.stringify(searchParams)] = [eventType.id];
    });

    it('returns entities', () => {
      const state = initialStateWithEntity(eventType, {
        namesSearchState: {
          lastSearch: {
            studyId: study.id,
            params: searchParams
          },
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectLastNamesSearchEntities(state)).toEqual([eventType]);
    });

    it('when search is active returns undefined', () => {
      const state = initialStateWithEntity(eventType, {
        namesSearchState: {
          searchActive: true,
          lastSearch: searchParams,
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toBeUndefined();
    });

    it('when there have been no previous searches returns undefined', () => {
      const state = initialStateWithEntity(eventType, {
        namesSearchState: {
          lastSearch: null,
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toBeUndefined();
    });

    it('when the search was never completed returns undefined', () => {
      const state = initialStateWithEntity(eventType, {
        namesSearchState: {
          lastSearch: {
            studyId: factory.defaultStudy().id,
            params: { sort: 'name' }
          },
          replies
        }
      });

      expect(EventTypeStoreSelectors.selectSearchRepliesAndEntities(state)).toBeUndefined();
    });
  });

  it('selectLastAdded', () => {
    const eventType = new CollectionEventType().deserialize(factory.collectionEventType());
    const state = initialStateWithEntity(eventType, { lastAddedId: eventType.id });

    expect(EventTypeStoreSelectors.selectLastAdded(state)).toEqual(eventType);
  });

  function initialStateWithEntity(eventType: CollectionEventType, additionalState: any) {
    const state = {
      'event-type': {
        ...EventTypeStoreReducer.initialState,
        ids: [eventType.id],
        entities: {},
        ...additionalState
      }
    };

    state['event-type'].entities[eventType.id] = eventType;
    return state;
  }
});
