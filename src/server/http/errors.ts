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

/**
 * 常用错误工厂。code 会映射到语言包 `apiErrors` 中的本地化文案；
 * 未登记的 code 回退到传入的 message。抛出后由 defineRoute 统一转换响应。
 */
export const notFoundError = () =>
  new AppError("NOT_FOUND", "内容不存在或尚未发布", 404);
export const validationError = (details?: unknown) =>
  new AppError("VALIDATION_ERROR", "请求参数不合法", 400, details);
export const unauthorizedError = (message = "请先登录") =>
  new AppError("UNAUTHORIZED", message, 401);
export const forbiddenError = (
  code = "FORBIDDEN",
  message = "没有执行此操作的权限",
) => new AppError(code, message, 403);
export const conflictError = (message = "资源状态冲突，请刷新后重试") =>
  new AppError("CONFLICT", message, 409);
export const tooManyRequestsError = (retryAfterSeconds: number) =>
  new AppError("RATE_LIMITED", "请求过于频繁，请稍后再试", 429, {
    retryAfterSeconds,
  });
