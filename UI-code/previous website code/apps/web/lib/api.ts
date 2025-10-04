"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

type PathSegments = string[];

type QueryHook = <TData = unknown, TError = unknown, TVariables = unknown>(
  variables?: TVariables,
  options?: UseQueryOptions<TData, TError, TData, QueryKey>,
) => UseQueryResult<TData, TError>;

type MutationHook = <TData = unknown, TError = unknown, TVariables = unknown>(
  options?: UseMutationOptions<TData, TError, TVariables>,
) => UseMutationResult<TData, TError, TVariables>;

interface ApiErrorResponse {
  code?: string;
  message?: string;
  details?: unknown;
  issues?: Array<{ path: (string | number)[]; message: string }>;
}

class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getApiBaseUrl(): string {
  const envBase =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_BASE_URL ?? "";

  if (envBase) return envBase.replace(/\/$/, "");

  const defaultHost = "http://localhost";
  const port = process.env.API_PORT ?? "4000";
  return `${defaultHost}:${port}`;
}

async function buildHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("customer-auth-storage");
      if (!raw) return headers;
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.tokens?.accessToken;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore localStorage parsing issues
    }
  }

  return headers;
}

function toRoutePath(segments: PathSegments): string {
  return segments
    .map((segment) =>
      segment
        .replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
        .replace(/\./g, "-"),
    )
    .join("/");
}

async function callEndpoint<TInput, TOutput>(
  path: PathSegments,
  input: TInput,
): Promise<TOutput> {
  const baseUrl = getApiBaseUrl();
  const route = toRoutePath(path);
  const url = `${baseUrl}/api/${route}`;
  const headers = await buildHeaders();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(input ?? {}),
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as ApiErrorResponse | TOutput)
    : undefined;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | undefined;
    throw new ApiClientError(
      response.status,
      errorPayload?.code,
      errorPayload?.message || response.statusText,
      errorPayload?.details ?? errorPayload?.issues,
    );
  }

  return (payload as TOutput) ?? (undefined as TOutput);
}

function createUseQuery(path: PathSegments): QueryHook {
  return (variables, options) =>
    useQuery({
      queryKey: [path.join("."), variables],
      queryFn: () => callEndpoint(path, variables),
      ...(options as any),
    });
}

function createUseMutation(path: PathSegments): MutationHook {
  return (options) =>
    useMutation({
      mutationFn: (variables) => callEndpoint(path, variables),
      ...(options as any),
    });
}

const proxyHandler: ProxyHandler<{ segments: PathSegments }> = {
  get(target, prop) {
    if (prop === "useQuery") {
      return createUseQuery(target.segments);
    }

    if (prop === "useMutation") {
      return createUseMutation(target.segments);
    }

    if (prop === "useUtils") {
      return () => useQueryClient();
    }

    return createProxy([...target.segments, String(prop)]);
  },
};

function createProxy(segments: PathSegments) {
  return new Proxy({ segments }, proxyHandler);
}

export const api = createProxy([]) as Record<string, any>;
export function useApiUtils() {
  return useQueryClient();
}
export { getApiBaseUrl, ApiClientError };
