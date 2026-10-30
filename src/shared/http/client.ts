import type { ApiFailure, ApiResponse } from "../contracts/api";
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
export async function apiGet<T>(
  path: `/api/v1/${string}`,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    signal: options.signal,
    headers: { Accept: "application/json" },
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
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = (await response.json()) as ApiResponse<T> | ApiFailure;
  if (!response.ok || "error" in payload) {
    const failure = payload as ApiFailure;
    throw new ApiClientError(
      failure.error?.code ?? "HTTP_ERROR",
      failure.error?.message ?? "请求失败",
      response.status,
      failure.meta?.requestId,
    );
  }
  return (payload as ApiResponse<T>).data;
}
