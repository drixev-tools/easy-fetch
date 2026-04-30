import { HttpError } from './httpError';

export class EasyFetchError extends HttpError {
  code: string;
  original: unknown;

  constructor(props: {
    code: string;
    message: string;
    status?: number;
    body?: unknown;
    original: unknown;
  }) {
    const { code, message, status, body, original } = props;
    super(message, status ?? 0, body);
    this.code = code;
    this.original = original;
  }
}
