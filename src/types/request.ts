export type QueryParamsType = string | number | boolean;

export interface IRequestOptions extends RequestInit {
  queryParams?: Record<string, QueryParamsType>;
  responseType?: 'json' | 'text' | 'blob';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryOnStatus?: [];
  meta?: object;
}
