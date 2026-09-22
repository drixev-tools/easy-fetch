export type QueryParamsType = string | number | boolean;

export interface IRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null;
  queryParams?: Record<string, QueryParamsType>;
  responseType?: 'json' | 'text' | 'blob';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryOnStatus?: number[];
  meta?: object;
}
