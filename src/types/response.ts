import { IRequestConfig } from './config';

export interface IResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config?: IRequestConfig;
  meta?: object;
}
