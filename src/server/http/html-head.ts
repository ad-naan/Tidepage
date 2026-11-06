import "server-only";
import type { IncomingMessage } from "node:http";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

/** Read bounded metadata, stopping at </head> without downloading an entire article/app. */
export async function readHtmlHead(
  response: IncomingMessage,
  limit = 512 * 1024,
) {
  const encoding = response.headers["content-encoding"]?.toLowerCase();
  const transform =
    encoding === "gzip"
      ? createGunzip()
      : encoding === "br"
        ? createBrotliDecompress()
        : encoding === "deflate"
          ? createInflate()
          : null;
  if (encoding && encoding !== "identity" && !transform) {
    response.destroy();
    throw new Error("UNSUPPORTED_ENCODING");
  }
  const stream = transform ? response.pipe(transform) : response;
  const forwardError = (error: Error) => stream.destroy(error);
  if (transform) response.on("error", forwardError);
  const charset =
    response.headers["content-type"]?.match(
      /charset\s*=\s*["']?([^\s;"']+)/i,
    )?.[1] || "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  let html = "";
  let size = 0;
  try {
    for await (const value of stream) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      const bytes = chunk.subarray(0, Math.max(0, limit - size));
      size += bytes.length;
      html += decoder.decode(bytes, { stream: true });
      const end = html.search(/<\/head\s*>/i);
      if (end >= 0) return html.slice(0, end) + "</head>";
      if (size >= limit) break;
    }
    return html + decoder.decode();
  } finally {
    stream.destroy();
    response.destroy();
    if (transform) response.removeListener("error", forwardError);
  }
}
