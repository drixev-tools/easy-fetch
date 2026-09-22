import { createClient } from './createClient.js';

/**
 * @deprecated Single-option sugar over {@link createClient}; use
 * `createClient({ baseUrl, token })` directly instead. Kept for backwards
 * compatibility.
 */
export const easyFetchAuth = (baseUrl: string, token: string) =>
  createClient({ baseUrl, token });

/**
 * @deprecated Single-option sugar over {@link createClient}; use
 * `createClient({ baseUrl, timeout })` directly instead. Kept for backwards
 * compatibility.
 */
export const easyFetchWithTimeout = (baseUrl: string, timeout?: number) =>
  createClient({ baseUrl, timeout });

/**
 * @deprecated Single-option sugar over {@link createClient}; use
 * `createClient({ baseUrl, headers })` directly instead. Kept for backwards
 * compatibility.
 */
export const easyFetchWithHeaders = (
  baseUrl: string,
  headers?: Record<string, string>,
) => createClient({ baseUrl, headers });
