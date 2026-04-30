import { IRequestOptions } from './request';
import { IResponse } from './response';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface IEasyFetchClient {
  get<T>(url?: string, options?: IRequestOptions): Promise<IResponse<T>>;
  post<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>>;
  put<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>>;
  delete<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>>;
  patch<T>(url: string, options?: IRequestOptions): Promise<IResponse<T>>;
}
