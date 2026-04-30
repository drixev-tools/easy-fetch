import { QueryParamsType } from '../types';

export function buildUrl(
  baseUrl: string,
  params?: Record<string, QueryParamsType>,
) {
  const url = new URL(baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      const stringValue = String(value);
      return url.searchParams.append(key, stringValue);
    });
  }

  return url.toString();
}
