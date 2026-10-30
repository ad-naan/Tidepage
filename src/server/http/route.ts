import "server-only";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { log } from "../observability/logger";
import { getCatalog, requestLocale } from "../i18n/messages";

export function jsonData<T>(
  data: T,
  requestId: string,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("X-Request-Id", requestId);
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return Response.json({ data, meta: { requestId } }, { ...init, headers });
}
export function defineRoute<
  P extends Record<string, string> = Record<string, string>,
>(
  handler: (
    request: Request,
    context: { params: Promise<P>; requestId: string },
  ) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    const requestId = randomUUID();
    const start = performance.now();
    try {
      const response = await handler(request, { ...context, requestId });
      response.headers.set("X-Request-Id", requestId);
      log("info", "http.request", {
        requestId,
        method: request.method,
        status: response.status,
        durationMs: Math.round(performance.now() - start),
      });
      return response;
    } catch (error) {
      const validation = error instanceof ZodError;
      const status = validation
        ? 400
        : error instanceof AppError
          ? error.status
          : 500;
      const code = validation
        ? "VALIDATION_ERROR"
        : error instanceof AppError
          ? error.code
          : "INTERNAL_ERROR";
      const messages = (await getCatalog(requestLocale(request))).apiErrors;
      const message = Object.hasOwn(messages, code)
        ? messages[code as keyof typeof messages]
        : error instanceof AppError
          ? error.message
          : messages.INTERNAL_ERROR;
      const details = validation
        ? error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          }))
        : error instanceof AppError
          ? error.details
          : undefined;
      log(status >= 500 ? "error" : "info", "http.failure", {
        requestId,
        method: request.method,
        status,
        code,
        durationMs: Math.round(performance.now() - start),
      });
      return Response.json(
        {
          error: {
            code,
            message,
            ...(details === undefined ? {} : { details }),
          },
          meta: { requestId },
        },
        {
          status,
          headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
        },
      );
    }
  };
}
