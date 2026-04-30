import { IRequestConfig } from '../types';

export async function retryRequest<T>(
  fn: () => Promise<T>,
  retries: number = 0,
  delay: number = 1000,
  retryOnStatus: number[] = [502, 503, 504],
) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();

      if (result instanceof Response && retryOnStatus.includes(result.status)) {
        lastError = new Error(`Retryable status ${result.status}`);
      } else {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError;
}

export function prepareBody(config: IRequestConfig): BodyInit | undefined {
  if (!config.body) return undefined;

  let contentType: string | null = null;

  if (config.headers instanceof Headers) {
    contentType = config.headers.get('content-type');
  } else if (
    typeof config.headers === 'object' &&
    config.headers !== null &&
    !Array.isArray(config.headers)
  ) {
    contentType = (config.headers as Record<string, string>)['content-type'];
  }

  if (typeof config.body == 'string' || config.body instanceof FormData) {
    return config.body;
  }

  if (contentType?.includes('application/json')) {
    return JSON.stringify(config.body);
  }

  return config.body as unknown as BodyInit;
}

export async function parseBody<T>(
  response: Response,
  contentType: string,
): Promise<T> {
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  if (contentType.includes('text/')) {
    return (await response.text()) as T;
  }

  if (
    contentType.includes('application/pdf') ||
    contentType.includes('application/octet-stream')
  ) {
    return (await response.blob()) as T;
  }

  // fallback
  return (await response.text()) as T;
}
