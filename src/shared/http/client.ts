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
