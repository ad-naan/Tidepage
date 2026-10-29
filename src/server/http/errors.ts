export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
export const notFoundError = () =>
  new AppError("NOT_FOUND", "内容不存在或尚未发布", 404);
