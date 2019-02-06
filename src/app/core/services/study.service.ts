import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PagedReply, SearchParams } from '@app/domain';
import { AnnotationType } from '@app/domain/annotations';
import { ApiReply } from '@app/domain/api-reply.model';
import { Study, StudyCounts, StudyToAdd } from '@app/domain/studies';
import { Observable } from 'rxjs';
import { map, delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StudyService {

  readonly BASE_URL = '/api/studies';

  constructor(private http: HttpClient) {
  }

  private stateActions = [ 'disable', 'enable', 'retire', 'unretire' ];

  /**
  * Retrieves the counts of all Studies from the server indexed by state.
  */
  counts(): Observable<StudyCounts> {
    return this.http.get<ApiReply>(`${this.BASE_URL}/counts`)
      .pipe(
        map((reply: ApiReply) => {
          if (reply && reply.data) {
            return {
              ...reply.data
            };
          }
          throw new Error('expected a study object');
        }));
  }

  /**
  * Retrieves a Study from the server.
  *
  * @param {string} slug the slug of the study to retrieve.
  */
  get(slug: string): Observable<Study> {
    return this.http.get<ApiReply>(`${this.BASE_URL}/${slug}`)
      .pipe(map(this.replyToStudy));
  }

  /**
   * Used to search studies.
   *
   * <p>A paged API is used to list studies. See below for more details.</p>
   *
   * @param searchParams - The options to use to search for studies.
   *
   * @returns The studies within a PagedReply.
   */
  search(searchParams: SearchParams): Observable<PagedReply<Study>> {
    return this.http.get<ApiReply>(`${this.BASE_URL}/search`,
                                   { params: searchParams.httpParams() })
      .pipe(
        // delay(1000),
        map((reply: ApiReply) => {
          if (reply && reply.data && reply.data.items) {
            const entities: Study[] = reply.data.items.map((obj: any) => new Study().deserialize(obj));
            return {
              searchParams,
              entities,
              offset: reply.data.offset,
              total: reply.data.total,
              maxPages: reply.data.maxPages
            };
          }
          throw new Error('expected a paged reply');
        }));
  }

  add(study: StudyToAdd): Observable<Study> {
    const json = {
      name: study.name,
      description: study.description ? study.description : null
    };
    return this.http.post<ApiReply>(`${this.BASE_URL}/`, json)
      .pipe(
        delay(2000),
        map(this.replyToStudy));
  }

  update(study: Study, attributeName: string, value: string): Observable<Study> {
    let url: string;
    let json = { expectedVersion: study.version };

    switch (attributeName) {
      case 'name':
        json = { ...json, name: value } as any;
        url = `${this.BASE_URL}/name/${study.id}`;
        break;
      case 'description':
        json = { ...json, description: value } as any;
        url = `${this.BASE_URL}/description/${study.id}`;
        break;
      case 'state':
        if (!this.stateActions.includes(value)) {
          throw new Error('invalid state change for study: ' + value);
        }
        url = `${this.BASE_URL}/${value}/${study.id}`;
        break;

      default:
        throw new Error('invalid attribute name for update: ' + attributeName);
    }

    return this.http.post<ApiReply>(url, json).pipe(map(this.replyToStudy));
  }

  addOrUpdateAnnotationType(study: Study, annotationType: AnnotationType): Observable<Study> {
    const json = {
      ...annotationType,
      expectedVersion: study.version
    };
    let url = `${this.BASE_URL}/pannottype/${study.id}`;
    if (!annotationType.isNew()) {
      url += '/' + annotationType.id;
    }
    return this.http.post<ApiReply>(url, json).pipe(
      // delay(2000),
      map(this.replyToStudy));
  }

  removeAnnotationType(study: Study, annotationTypeId: string): Observable<Study> {
    const url = `${this.BASE_URL}/pannottype/${study.id}/${study.version}/${annotationTypeId}`;
    return this.http.delete<ApiReply>(url)
      .pipe(map(this.replyToStudy));
  }

  enableAllowed(studyId: string): Observable<any> {
    return this.http.get<ApiReply>(`${this.BASE_URL}/enableAllowed/${studyId}`)
      .pipe(
        // delay(1000),
        map((reply: ApiReply) => {
          if (reply && (reply.data !== undefined)) {
            return {
              studyId,
              allowed: reply.data
            };
          }
          throw new Error('expected a valid response');
        }));
  }

  private replyToStudy(reply: ApiReply): Study {
    if (reply && reply.data) {
      return new Study().deserialize(reply.data);
    }
    throw new Error('expected a study object');
  }
}
