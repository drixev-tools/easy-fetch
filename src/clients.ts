import { createClient } from './createClient';

export const easyFetchAuth = (baseUrl: string, token: string) =>
  createClient({ baseUrl, token });

export const easyFetchWithTimeout = (baseUrl: string, timeout?: number) =>
  createClient({ baseUrl, timeout });

export const easyFetchWithHeaders = (
  baseUrl: string,
  headers?: Record<string, string>,
) => createClient({ baseUrl, headers });
