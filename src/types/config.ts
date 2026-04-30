import { IRequestOptions } from './request';

export interface IEasyFetchOptions {
  baseUrl?: string;
  headers?: HeadersInit;
  timeout?: number;
  token?: string;
}

export interface IRequestConfig extends IRequestOptions {
  url?: string;
}
