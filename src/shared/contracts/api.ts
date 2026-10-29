export type ApiResponse<T> = { data: T; meta: { requestId: string } };
export type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string };
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
