// Default to relative '/api' so production uses same-origin behind IIS rewrite.
// In development, set VITE_API_BASE_URL to 'http://localhost:5000/api'.
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const buildHeaders = (body?: unknown, baseHeaders?: HeadersInit) => {
  if (body instanceof FormData) {
    return baseHeaders;
  }
  return {
    'Content-Type': 'application/json',
    ...(baseHeaders || {}),
  };
};

export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      credentials: 'include',
      ...options,
      headers: buildHeaders(options.body, options.headers),
    });

    const contentType = response.headers.get('content-type') ?? '';
    const hasJson = contentType.includes('application/json');
    const data = hasJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(
        hasJson && data?.error?.message ? data.error.message : response.statusText
      ) as Error & { status?: number; details?: unknown };
      error.status = response.status;
      // Include all response data as details (for verification redirects, etc.)
      if (hasJson && data) {
        error.details = data.error?.details || data;
      }
      throw error;
    }

    return data as T;
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const http = new HttpClient();
