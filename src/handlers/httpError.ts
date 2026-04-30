export class HttpError extends Error {
  status: number;
  body: unknown;
  code: string = 'HTTP_ERROR';

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}
