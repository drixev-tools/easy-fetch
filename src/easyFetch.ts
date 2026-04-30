import {
  IEasyFetchOptions,
  IInterceptors,
  IRequestConfig,
  IResponse,
} from './types';
import { parseBody, prepareBody, retryRequest } from './helpers';
import { buildUrl } from './helpers/build-url';
import {
  RequestInterceptor,
  ResponseSuccessInterceptor,
  ResponseErrorInterceptor,
} from './types/interceptors';
import { HttpError } from './handlers/httpError';
import { EasyFetchError } from './handlers/easyFetchError';

export class EasyFetch {
  private baseUrl?: string;
  private httpHeaders?: HeadersInit;
  private timeout?: number;
  private token?: string;

  public interceptors: IInterceptors;

  constructor(options: IEasyFetchOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.httpHeaders = options.headers;
    this.timeout = options.timeout ?? 0;
    this.token = options.token;

    this.interceptors = {
      request: {
        handlers: [],
        use(fn: RequestInterceptor) {
          this.handlers.push(fn);
          return this;
        },
      },
      response: {
        successHandlers: [],
        errorHandlers: [
          async (error: unknown) => {
            if (error instanceof Error && error.name === 'AbortError') {
              return new EasyFetchError({
                code: 'TIMEOUT_ERROR',
                message: 'Request timed out',
                original: error,
              });
            }

            if (error instanceof HttpError) {
              return new EasyFetchError({
                code: error.code,
                message: error.message,
                status: error.status,
                body: error.body,
                original: error,
              });
            }

            //network or unexpected error
            return new EasyFetchError({
              code: 'UNKNOW_ERROR',
              message:
                error instanceof Error
                  ? error.message || 'Unknowm error'
                  : 'Unknowm error',
              original: error,
            });
          },
        ],
        use(onSuccess: ResponseSuccessInterceptor) {
          this.successHandlers.push(onSuccess);
          return this;
        },
        useError(onError: ResponseErrorInterceptor) {
          this.errorHandlers.push(onError);
          return this;
        },
      },
    };
  }

  setIntereptors(interceptors: IInterceptors) {
    Object.assign(this.interceptors, interceptors);
  }

  async request<T = unknown>(config: IRequestConfig): Promise<IResponse<T>> {
    // build url with parameters
    if (!config.url?.startsWith('http') && this.baseUrl === '') {
      throw new Error('No baseUrl provided and relative url used');
    }

    if (!config.url?.startsWith('http')) {
      config.url = this.baseUrl + (config.url || '');
    }

    // meger headers
    const headers = new Headers(config.headers || {});

    // global headers
    if (this.httpHeaders) {
      for (const [key, value] of Object.entries(this.httpHeaders)) {
        headers.set(key, value);
      }
    }

    // token
    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    //auto JSON only if body is a plain object
    if (
      !headers.has('Content-Type') &&
      config.body &&
      typeof config.body === 'object' &&
      !(config.body instanceof FormData)
    ) {
      headers.set('Content-Type', 'application/json');
    }

    config.headers = headers;

    // add request interceptors
    for (const interceptor of this.interceptors?.request?.handlers ?? []) {
      config = (await interceptor(config)) ?? config;
    }

    //build url
    const finalUrl = buildUrl(config.url ?? '', config.queryParams);
    config.url = finalUrl;

    // setup timeout and signal
    const controller = new AbortController();
    const signal = controller.signal;

    const effectiveTimeout = config.timeout ?? this.timeout;

    const timeoutId: ReturnType<typeof setTimeout> | null = effectiveTimeout
      ? setTimeout(() => controller.abort(), effectiveTimeout)
      : null;

    // fetching
    try {
      const response = await retryRequest(
        () =>
          fetch(finalUrl, {
            ...(config as RequestInit),
            method: config.method,
            headers: config.headers,
            body: prepareBody(config),
            signal: config.signal ?? signal,
          }),
        config.retries,
        config.retryDelay,
        config.retryOnStatus,
      )
        .then(async (res: Response) => {
          const contentType = res.headers.get('Content-Type') || '';

          if (!res.ok) {
            const body = await parseBody(res, contentType);
            throw new HttpError(res.statusText, res.status, body);
          }

          const data = await parseBody<T>(res, contentType);

          let result: IResponse<T> = {
            ...res,
            config,
            data,
          };

          for (const interceptor of this.interceptors?.response
            ?.successHandlers ?? []) {
            result = (await interceptor(result)) as IResponse<T>;
          }

          return result;
        })
        .catch(async (error) => {
          for (const interceptor of this.interceptors?.response.errorHandlers ??
            []) {
            error = await interceptor(error);
          }
          throw error;
        });

      return response;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
