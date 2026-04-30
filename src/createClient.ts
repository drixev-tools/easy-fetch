import { EasyFetch } from './easyFetch';
import {
  IEasyFetchClient,
  IEasyFetchOptions,
  IInterceptors,
  IRequestConfig,
} from './types';

export type clienType = IEasyFetchClient & {
  setInterceptors: (interceptors: IInterceptors) => void;
  interceptors: IInterceptors;
};

export function createClient(config: IEasyFetchOptions = {}): clienType {
  const easyFetch = new EasyFetch(config);

  const client: clienType = {
    get: (url?: string, options?: IRequestConfig) =>
      easyFetch.request({ ...options, url, method: 'GET' }),
    post: (url: string, options?: IRequestConfig) =>
      easyFetch.request({ ...options, url, method: 'POST' }),
    put: (url: string, options?: IRequestConfig) =>
      easyFetch.request({ ...options, url, method: 'PUT' }),
    patch: (url: string, options?: IRequestConfig) =>
      easyFetch.request({ ...options, url, method: 'PATCH' }),
    delete: (url: string, options?: IRequestConfig) =>
      easyFetch.request({ ...options, url, method: 'DELETE' }),
    get interceptors() {
      return easyFetch.interceptors;
    },
    setInterceptors: easyFetch.setIntereptors,
  };

  return client;
}
