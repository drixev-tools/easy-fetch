// easyFetchClients.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as clientModule from '../src/createClient';
import {
  easyFetchAuth,
  easyFetchWithHeaders,
  easyFetchWithTimeout,
} from '../src/clients';

// 👇 mock createClient so we can verify its arguments
vi.mock('./createClient', () => ({
  createClient: vi.fn(() => ({ request: vi.fn() })),
}));

describe('easyFetch client factories', () => {
  it('should call createClient with token', () => {
    const spy = vi.spyOn(clientModule, 'createClient');

    easyFetchAuth('http://api', 'token123');

    expect(spy).toHaveBeenCalledWith({
      baseUrl: 'http://api',
      token: 'token123',
    });

    spy.mockRestore(); // cleanup
  });

  it('easyFetchWithTimeout should call createClient with baseUrl and timeout', () => {
    const baseUrl = 'https://timeout.test';
    const timeout = 5000;

    const spy = vi.spyOn(clientModule, 'createClient');

    easyFetchWithTimeout(baseUrl, timeout);

    expect(spy).toHaveBeenCalledWith({ baseUrl, timeout });

    spy.mockRestore(); // cleanup
  });

  it('easyFetchWithHeaders should call createClient with baseUrl and headers', () => {
    const baseUrl = 'https://headers.test';
    const headers = { 'X-Custom': 'value' };

    const spy = vi.spyOn(clientModule, 'createClient');

    easyFetchWithHeaders(baseUrl, headers);

    expect(spy).toHaveBeenCalledWith({ baseUrl, headers });

    spy.mockRestore(); // cleanup
  });
});
