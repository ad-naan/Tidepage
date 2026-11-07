import type { ApiFailure, ApiResponse } from "@/shared/contracts/api";
export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}
async function apiRequest<T>(
  path: `/api/v1/${string}`,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { Accept: "application/json", ...init.headers },
    signal: init.signal
      ? AbortSignal.any([
          init.signal,
          AbortSignal.timeout(init.body instanceof FormData ? 120_000 : 30_000),
        ])
      : AbortSignal.timeout(init.body instanceof FormData ? 120_000 : 30_000),
  });
  const body = (await response.json()) as ApiResponse<T> | ApiFailure;
  if (!response.ok || "error" in body) {
    const failure = body as ApiFailure;
    throw new ApiClientError(
      failure.error?.code ?? "HTTP_ERROR",
      failure.error?.message ?? "请求失败",
      response.status,
      failure.meta?.requestId,
    );
  }
  return (body as ApiResponse<T>).data;
}
export function apiGet<T>(
  path: `/api/v1/${string}`,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  return apiRequest(path, { method: "GET", signal: options.signal });
}

/**
 * 统一的变更请求入口（POST/PUT/PATCH/DELETE）。
 * 服务端 Cookie 鉴权的变更接口会同时做同源校验，浏览器 fetch
 * 同源携带 Origin 头即可通过；不要用于跨站调用。
 */
export async function apiSend<T>(
  path: `/api/v1/${string}`,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const multipart = body instanceof FormData;
  return apiRequest(path, {
    method,
    signal: options.signal,
    headers: {
      ...(body === undefined || multipart
        ? {}
        : { "Content-Type": "application/json" }),
    },
    ...(body === undefined
      ? {}
      : { body: multipart ? body : JSON.stringify(body) }),
  });
}
