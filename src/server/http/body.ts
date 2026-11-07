import "server-only";
import { AppError } from "./errors";

export async function boundedBody(
  request: Pick<Request, "headers" | "body">,
  maxBytes: number,
) {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes)
    throw new AppError("BODY_TOO_LARGE", "", 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new AppError("BODY_TOO_LARGE", "", 413);
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export async function boundedJson(request: Request, maxBytes: number) {
  try {
    return JSON.parse(
      new TextDecoder().decode(await boundedBody(request, maxBytes)),
    ) as unknown;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("VALIDATION_ERROR", "", 400);
  }
}
