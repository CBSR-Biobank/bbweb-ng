/**
 * Options used to search for entities.
 */
export interface SearchParams {
  /** The filter to use on the entity attributes. */
  readonly filter?: string;

  /**
   * The field to sort the entities by. Use a minus sign prefix to sort in descending order.
   */
  readonly sort?: string;

  /**
   * If the total number of entities are greater than limit, then page selects which entities
   * should be returned. If an invalid value is used then the response is an error.
   */
  readonly page?: number;

  /** The number of entities to return per page. */
  readonly limit?: number;
}

export function searchParams2Term(searchParams: SearchParams): string {
  return JSON.stringify(searchParams);
}

export function searchParamsToHttpParams(searchParams: SearchParams): any {
  let params = {};
  ['filter', 'sort', 'page', 'limit'].forEach(key => {
    if (searchParams[key]) {
      params[key] = searchParams[key];
    }
  });
  return params;
}

export type EntityIds = Array<string>;

export interface SearchTermToEntityIdsHash {
  [searchTerm: string]: EntityIds;
}

export interface SearchTermToEntityIdsByEntityIdHash {
  [id: string]: { [searchTerm: string]: EntityIds };
}
