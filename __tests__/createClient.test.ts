import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { createClient } from '../src/createClient';

describe('createClient', () => {
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    client = createClient({ baseUrl: 'https://api.example.com' });
  });

  it('should perform a GET request and return data', async () => {
    // Mock fetch
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    } as unknown as Response);

    const res = await client.get('/test');

    expect(res.data).toEqual({ success: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('should modify request using request interceptor', async () => {
    client.interceptors.request.use(async (config) => {
      config.headers = new Headers({ 'X-Test': '123' });
      return config;
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ intercepted: true }),
    } as unknown as Response);

    const res = await client.get('/test');

    // check fetch headers
    const lastCall = (globalThis.fetch as unknown as Mock).mock.calls[0][1];
    expect(lastCall.headers.get('X-Test')).toBe('123');
    expect(res.data).toEqual({ intercepted: true });
  });

  it('should modify response using response interceptor', async () => {
    // Add a request interceptor to track startTime
    client.interceptors.request.use((config) => {
      config.meta = { startTime: Date.now() };
      return config;
    });

    client.interceptors?.response.use(async (res) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      res.modified = true;
      res.meta = {
        requestUrl: res.config?.url,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        duration: Date.now() - res.config?.meta?.startTime,
      };
      //Object.assign(clonedRes, { modified: true, ...res });
      return res;
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ original: true }),
      clone: function () {
        return this;
      }, // simple clone for interceptor
    } as unknown as Response);

    const res = await client.get<{ original: boolean }>('/test');

    // response interceptor should modify data
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expect(res.modified).toBe(true);
    expect(res.data.original).toBe(true);
  });

  it('should handle POST requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ created: true }),
    } as unknown as Response);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-errors
    const res = await client.post('/create', { body: { name: 'test' } });
    expect(res.data).toEqual({ created: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/create',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should handle PUT requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ created: true }),
    } as unknown as Response);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-errors
    const res = await client.put('/update', { body: { name: 'test' } });
    expect(res.data).toEqual({ created: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/update',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('should handle DELETE requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ created: true }),
    } as unknown as Response);

    const res = await client.delete('/delete', { queryParams: { id: '123' } });
    expect(res.data).toEqual({ created: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/delete?id=123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('should override the interceptors', async () => {
    client.setInterceptors({
      request: {
        handlers: [
          async (config) => {
            config.headers = new Headers({ 'X-Test': '123' });
            return config;
          },
        ],
        use: function (fn) {
          this.handlers.push(fn);
          return this;
        },
      },
      response: {
        successHandlers: [],
        errorHandlers: [],
        use: function (onSuccess) {
          this.successHandlers.push(onSuccess);
          return this;
        },
        useError: function (onError) {
          this.errorHandlers.push(onError);
          return this;
        },
      },
    });

    // Mock fetch
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    } as unknown as Response);

    // Perform request
    const res = await client.get<{ success: boolean }>('/test');

    // Assertions
    expect(res.data?.success).toBe(true);

    // Optional: Check that the interceptor modified the headers
    const lastCall = (globalThis.fetch as unknown as Mock).mock.calls[0][1];
    expect(lastCall.headers.get('X-Test')).toBe('123');
  });
});
