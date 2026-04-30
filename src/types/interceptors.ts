import { IRequestConfig } from './config';
import { IResponse } from './response';

export type RequestInterceptor = (
  config: IRequestConfig,
) => IRequestConfig | Promise<IRequestConfig>;

export type ResponseSuccessInterceptor = (
  response: IResponse,
) => Promise<IResponse>;

export type ResponseErrorInterceptor = (error: unknown) => Promise<unknown>;

export interface IRequestInterceptors {
  handlers: RequestInterceptor[];
  use(fn: RequestInterceptor): this;
}

export interface IResponseInteceptors {
  successHandlers: ResponseSuccessInterceptor[];
  errorHandlers: ResponseErrorInterceptor[];
  use(onSucess: ResponseSuccessInterceptor): this;
  useError(onError: ResponseErrorInterceptor): this;
}

export interface IInterceptors {
  request: IRequestInterceptors;
  response: IResponseInteceptors;
}
