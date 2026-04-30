import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { EasyFetch } from '../src/easyFetch';
import { EasyFetchError } from '../src/handlers/easyFetchError';

describe('EasyFetch', () => {
  let client: EasyFetch;

  beforeEach(() => {
    client = new EasyFetch({ baseUrl: 'https://api.example.com' });
    vi.restoreAllMocks();
  });

  it('should parse JSON response', async () => {
    const mockData = { id: 1, name: 'Alice' };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    } as unknown as Response);

    const res = await client.request({
      url: '/user/1',
      method: 'GET',
    });

    expect(res.data).toEqual(mockData);
    expect(res?.status).toBe(200);
    expect(res?.statusText).toBe('OK');
  });

  it('should parse JSON response with params', async () => {
    const mockData = { id: 1, name: 'Alice' };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    } as unknown as Response);

    const res = await client.request({
      url: '/user/1',
      method: 'GET',
      queryParams: { param1: 'test1' },
    });

    expect(res.data).toEqual(mockData);
    expect(res?.status).toBe(200);
    expect(res?.statusText).toBe('OK');
    expect(res.config?.queryParams).toMatchObject({
      param1: 'test1',
    });
  });

  it('should parse text response', async () => {
    const mockText = 'hello world';

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => mockText,
    } as unknown as Response);

    const res = await client.request({ url: '/hello', method: 'GET' });

    expect(res.data).toBe(mockText);
  });

  it('should parse blob response', async () => {
    const mockBlob = new Blob(['test pdf'], { type: 'application/pdf' });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: async () => mockBlob,
    } as unknown as Response);

    const res = await client.request({ url: '/file.pdf', method: 'GET' });

    expect(res.data).toBeInstanceOf(Blob);
  });

  it('should fallback to text when content-type is unknown', async () => {
    const mockText = 'fallback';

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({}),
      text: async () => mockText,
    } as unknown as Response);

    const res = await client.request<string>({
      url: '/unknown',
      method: 'GET',
    });

    expect(res.data).toBe(mockText);
  });

  it('should modify config using request interceptor', async () => {
    // Create EasyFetch with empty base URL
    const client = new EasyFetch({ baseUrl: 'https://api.example.com' });

    // Add a request interceptor (chainable)
    client.interceptors?.request.use(async (config) => {
      config.headers = new Headers({ 'X-Test': '123' });
      return config;
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
    const res = await client.request<{ success: boolean }>({
      url: '/test',
      method: 'GET',
    });

    // Assertions
    expect(res.data.success).toBe(true);

    // Optional: Check that the interceptor modified the headers
    const lastCall = (globalThis.fetch as unknown as Mock).mock.calls[0][1];
    expect(lastCall.headers.get('X-Test')).toBe('123');
  });

  it('should modify config overriding and using request interceptor', async () => {
    // Create EasyFetch with empty base URL
    const client = new EasyFetch({ baseUrl: 'https://api.example.com' });
    client.setIntereptors({
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
    // Add a request interceptor (chainable)
    client.interceptors.request.use(async (config) => {
      config.headers = new Headers({ 'X-Test': '123' });
      return config;
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
    const res = await client.request<{ success: boolean }>({
      url: '/test',
      method: 'GET',
    });

    // Assertions
    expect(res.data?.success).toBe(true);

    // Optional: Check that the interceptor modified the headers
    const lastCall = (globalThis.fetch as unknown as Mock).mock.calls[0][1];
    expect(lastCall.headers.get('X-Test')).toBe('123');
  });

  it('should modify response using response success interceptor', async () => {
    client = new EasyFetch({ baseUrl: 'https://api.example.com' });

    client.setIntereptors({
      request: {
        handlers: [],
        use: function () {
          return this;
        },
      },
      response: {
        successHandlers: [
          async (res) => {
            res.data = Object.assign(res.data as object, { modified: true });
            return res;
          },
        ],
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

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ original: true }),
    } as unknown as Response);

    type typeResponse = { modified: boolean };

    const res = await client.request<typeResponse>({
      url: '/success',
      method: 'GET',
    });

    expect(res.data.modified).toBe(true);
  });

  it('should throw timeout error', async () => {
    const client = new EasyFetch({ baseUrl: 'https://api.example.com' });

    // simulate abort error directly
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.reject(
          Object.assign(new Error('Aborted'), { name: 'AbortError' }),
        ),
      );

    await expect(
      client.request({
        url: '/timeout',
        method: 'GET',
        timeout: 10,
      }),
    ).rejects.toMatchObject({
      message: 'Request timed out',
      code: 'TIMEOUT_ERROR',
    });
  });

  it('should throw url invalid with tbaseUrl is not defined and config.url doesnt start with http', async () => {
    const client = new EasyFetch();

    await expect(
      client.request({
        url: '/timeout',
        method: 'GET',
      }),
    ).rejects.toMatchObject({
      message: 'No baseUrl provided and relative url used',
    });
  });

  it('should throw timeout error when fetch never completes', async () => {
    const client = new EasyFetch({ baseUrl: 'https://api.example.com' });

    // mock fetch to reject on abort
    globalThis.fetch = vi.fn().mockImplementation((_, options) => {
      return new Promise((_, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        }
        // do nothing else → simulates never-resolving fetch
      });
    });

    const fetchPromise = client.request({
      url: '/timeout',
      method: 'GET',
      timeout: 10, // very small timeout
    });

    await expect(fetchPromise).rejects.toMatchObject({
      message: 'Request timed out',
      code: 'TIMEOUT_ERROR',
    });
  });

  it('should handle network error using error interceptor', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network failed'));

    await expect(
      client.request({ url: '/fail', method: 'GET' }),
    ).rejects.toThrow('Network failed');
  });

  it('should retry failed requests', async () => {
    const spy = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ retry: true }),
      } as unknown as Response);

    globalThis.fetch = spy;

    const res = await client.request<{ retry: boolean }>({
      url: '/retry',
      method: 'GET',
      retries: 1,
    });
    expect(res.data.retry).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('EasyFetch other cases', () => {
  let client: EasyFetch;

  beforeEach(() => {
    client = new EasyFetch({ baseUrl: 'https://api.example.com' });
    vi.resetAllMocks();
  });

  it('should merge global headers with request headers', async () => {
    const c = new EasyFetch({
      baseUrl: 'http://example.com',
      headers: { 'X-Global': '1' },
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);

    await c.request<{ ok: boolean }>({
      url: '/merge',
      method: 'GET',
      headers: { 'X-Req': '2' },
    });

    const callHeaders = (globalThis.fetch as Mock).mock.calls[0][1].headers;
    expect(callHeaders.get('X-Global')).toBe('1');
    expect(callHeaders.get('X-Req')).toBe('2');
  });

  it('should inject Authorization header when token provided', async () => {
    const c = new EasyFetch({ token: 'abc123' });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);

    await c.request<{ ok: boolean }>({
      url: 'https://examplelogin.com/auth',
      method: 'GET',
    });

    const callHeaders = (globalThis.fetch as Mock).mock.calls[0][1].headers;
    expect(callHeaders.get('Authorization')).toBe('Bearer abc123');
  });

  it('should set Content-Type to application/json automatically', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    await client.request({ url: '/json', method: 'POST', body: { a: 1 } });

    const callHeaders = (globalThis.fetch as Mock).mock.calls[0][1].headers;
    expect(callHeaders.get('Content-Type')).toBe('application/json');
    expect((globalThis.fetch as Mock).mock.calls[0][1].body).toBe(
      JSON.stringify({
        a: 1,
      }),
    );
  });

  it('should allow request interceptor to modify config', async () => {
    client.interceptors.request.use((config) => {
      config.url = config.url + '?intercepted=1';
      return config;
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ ok: true }),
    } as Response);

    await client.request<{ ok: boolean }>({ url: '/test', method: 'GET' });

    expect((globalThis.fetch as Mock).mock.calls[0][0]).toContain(
      'intercepted=1',
    );
  });

  it('should allow response interceptor to modify data', async () => {
    client.interceptors.response.use(async (res) => {
      return { ...res, data: { ...(res.data as object), modified: true } };
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ original: true }),
    } as Response);

    const res = await client.request<{ original: boolean; modified: boolean }>({
      url: '/test',
      method: 'GET',
    });

    expect(res.data.modified).toBe(true);
    expect(res.data.original).toBe(true);
  });

  it('should handle AbortError as timeout error', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    await expect(
      client.request({ url: '/timeout', method: 'GET', timeout: 1 }),
    ).rejects.toMatchObject({
      message: 'Request timed out',
      code: 'TIMEOUT_ERROR',
    });
  });

  it('should handle Response error', async () => {
    const response = {
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ error: 'bad' }),
      ok: false,
    } as Response;

    globalThis.fetch = vi.fn().mockResolvedValueOnce(response);

    await expect(
      client.request({ url: '/bad', method: 'GET' }),
    ).rejects.toMatchObject({
      message: 'Bad Request',
      status: 400,
      body: { error: 'bad' },
    });
  });

  it('should handle interceptor Response error', async () => {
    const response = {
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ error: 'bad' }),
      ok: false,
    } as Response;

    globalThis.fetch = vi.fn().mockResolvedValueOnce(response);

    client.interceptors.response.useError(async (error: unknown) => {
      return new EasyFetchError({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        ...error,
        code: 'ERROR_CAUGTH',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        message: error?.message + ' Caugth',
        original: error,
      });
    });

    await expect(
      client.request({ url: '/bad', method: 'GET' }),
    ).rejects.toMatchObject({
      code: 'ERROR_CAUGTH',
      message: 'Bad Request Caugth',
      status: 400,
      body: { error: 'bad' },
    });
  });

  it('should handle unknown error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce('weird error');

    await expect(
      client.request({ url: '/weird', method: 'GET' }),
    ).rejects.toMatchObject({
      message: 'Unknowm error',
      original: 'weird error',
    });
  });

  it('should parse text body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
      text: async () => 'hello',
    } as Response);

    const res = await client.request<string>({ url: '/txt', method: 'GET' });
    expect(res.data).toBe('hello');
  });

  it('should parse blob body', async () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/pdf' }),
      blob: async () => blob,
    } as Response);

    const res = await client.request<Blob>({ url: '/pdf', method: 'GET' });
    expect(res.data).toBe(blob);
  });
});
