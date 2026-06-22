import { HyroError, type ErrorCode } from '@hyro/core';

export interface HttpOptions {
  baseUrl: string;
  /** Bearer token: a JWT access token or an API key (`hyro_sk_…`). */
  token?: string | null;
  /** Injectable fetch (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Per‑request timeout in ms. */
  timeoutMs?: number;
  /** Extra default headers. */
  headers?: Record<string, string>;
  /** Hook invoked with the request id of every response. */
  onRequestId?: (requestId: string | null) => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Override the instance token for this call. */
  token?: string | null;
  signal?: AbortSignal;
  /** Expect no JSON body (204). */
  expectEmpty?: boolean;
}

/** Error thrown when the API returns a non‑2xx response. */
export class ApiError extends HyroError {
  readonly requestId?: string;
  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(code, statusCode, message, { details, expose: true });
    this.requestId = requestId;
  }
}

export class Http {
  private readonly baseUrl: string;
  private token: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;
  private readonly onRequestId?: (requestId: string | null) => void;

  constructor(options: HttpOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token ?? null;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.headers = options.headers ?? {};
    this.onRequestId = options.onRequestId;
    if (!this.fetchImpl) {
      throw new Error('No fetch implementation available (Node >= 18 required).');
    }
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : `/${path}`));
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  buildHeaders(extra?: RequestOptions, hasBody = false): Headers {
    const headers = new Headers(this.headers);
    headers.set('Accept', 'application/json');
    if (hasBody) headers.set('Content-Type', 'application/json');
    const token = extra?.token !== undefined ? extra.token : this.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const hasBody = options.body !== undefined && method !== 'GET';
    const url = this.buildUrl(path, options.query);
    const headers = this.buildHeaders(options, hasBody);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (cause) {
      clearTimeout(timeout);
      throw new ApiError(
        'internal',
        0,
        `Network error contacting HYRO API at ${this.baseUrl}`,
        { cause: String(cause) },
      );
    }
    clearTimeout(timeout);

    const requestId = res.headers.get('x-request-id');
    this.onRequestId?.(requestId);

    if (res.status === 204 || options.expectEmpty) {
      if (!res.ok) await this.throwFromResponse(res, requestId);
      return undefined as T;
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      if (!res.ok) {
        throw new ApiError('internal', res.status, text || res.statusText, undefined, requestId ?? undefined);
      }
      json = undefined;
    }

    if (!res.ok) {
      const errObj = (json as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })
        ?.error;
      throw new ApiError(
        (errObj?.code as ErrorCode) ?? 'internal',
        res.status,
        errObj?.message ?? res.statusText,
        errObj?.details,
        requestId ?? undefined,
      );
    }

    return json as T;
  }

  /** Stream a Server‑Sent Events endpoint as an async iterator of parsed events. */
  async *stream(
    path: string,
    options: RequestOptions = {},
  ): AsyncGenerator<{ event: string; data: string }> {
    const url = this.buildUrl(path, options.query);
    const headers = this.buildHeaders(options, false);
    headers.set('Accept', 'text/event-stream');

    const res = await this.fetchImpl(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
    const requestId = res.headers.get('x-request-id');
    this.onRequestId?.(requestId);
    if (!res.ok || !res.body) {
      await this.throwFromResponse(res, requestId);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        let event = 'message';
        const dataLines: string[] = [];
        for (const line of chunk.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length) yield { event, data: dataLines.join('\n') };
      }
    }
  }

  private async throwFromResponse(res: Response, requestId: string | null): Promise<never> {
    let message = res.statusText;
    let code: ErrorCode = 'internal';
    let details: Record<string, unknown> | undefined;
    try {
      const json = (await res.json()) as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
      if (json.error) {
        message = json.error.message ?? message;
        code = (json.error.code as ErrorCode) ?? code;
        details = json.error.details;
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(code, res.status, message, details, requestId ?? undefined);
  }
}
