import {
  PagedReplyEntityIds,
  PagedReplyInfo,
  pagedReplyToInfo,
  SearchParams,
  searchParams2Term
} from '@app/domain';
import { Membership } from '@app/domain/access';
import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store';
import * as fromMembership from './membership.reducer';

export const getLastAddedId = (state: fromMembership.State): string => state.lastAddedId;

export const getSearchActive = (state: fromMembership.State): boolean => state.searchActive;

export const getLastSearch = (state: fromMembership.State): SearchParams => state.lastSearch;

export const getError = (state: fromMembership.State): any => state.error;

export const getSearchReplies = (state: fromMembership.State): { [url: string]: PagedReplyEntityIds } =>
  state.searchReplies;

export const selectMembershipState = createFeatureSelector<fromMembership.State>('membership');

export const selectMembershipLastAddedId: MemoizedSelector<object, string> = createSelector(
  selectMembershipState,
  getLastAddedId
);

export const selectMembershipSearchActive: MemoizedSelector<object, boolean> = createSelector(
  selectMembershipState,
  getSearchActive
);

export const selectMembershipLastSearch: MemoizedSelector<object, SearchParams> = createSelector(
  selectMembershipState,
  getLastSearch
);

export const selectMembershipError: MemoizedSelector<object, any> = createSelector(
  selectMembershipState,
  getError
);

export const selectMembershipSearchReplies: MemoizedSelector<
  object,
  { [url: string]: PagedReplyEntityIds }
> = createSelector(
  selectMembershipState,
  getSearchReplies
);

export const selectAllMemberships: MemoizedSelector<object, Membership[]> = createSelector(
  selectMembershipState,
  fromMembership.selectAll
);

export const selectAllMembershipEntities = createSelector(
  selectMembershipState,
  fromMembership.selectEntities
);

export const selectMembershipSearchRepliesAndEntities = createSelector(
  selectMembershipSearchActive,
  selectMembershipLastSearch,
  selectMembershipSearchReplies,
  createSelector(
    selectMembershipState,
    fromMembership.selectEntities
  ),
  (
    searchActive: boolean,
    lastSearch: SearchParams,
    searchReplies: { [url: string]: PagedReplyEntityIds },
    entities: any
  ): PagedReplyInfo<Membership> => {
    if (searchActive || lastSearch === null) {
      return undefined;
    }

    const searchTerm = searchParams2Term(lastSearch);
    const reply = searchReplies[searchTerm];
    if (reply === undefined) {
      return undefined;
    }

    return {
      ...pagedReplyToInfo(reply),
      entities: reply.entityIds.map(id => entities[id])
    };
  }
);

export const selectMembershipLastAdded = createSelector(
  selectMembershipLastAddedId,
  selectAllMembershipEntities,
  (id: string, entities: { [id: string]: Membership }): Membership => {
    return entities[id];
  }
);
