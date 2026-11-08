import "server-only";
import { request as httpsRequest } from "node:https";
import { publicTarget } from "./public-url";

const maxBytes = 2 * 1024 * 1024;

/** Bounded HTTPS JSON fetch, with DNS pinning and validation at every redirect. */
export async function readPublicJson(
  value: string,
  signal: AbortSignal,
  redirects = 0,
): Promise<unknown> {
  const target = await publicTarget(value);
  signal.throwIfAborted();
  if (target.url.protocol !== "https:") throw new Error("HTTPS required");
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      target.url,
      {
        signal,
        agent: false,
        family: target.family,
        lookup: (_hostname, _options, callback) =>
          callback(null, target.address, target.family),
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "identity",
          "User-Agent": "Tidepage-Music/1.0",
        },
      },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
          const location = response.headers.location;
          response.destroy();
          if (!location || redirects >= 3)
            return reject(new Error("Redirect limit"));
          try {
            void readPublicJson(
              new URL(location, target.url).href,
              signal,
              redirects + 1,
            ).then(resolve, reject);
          } catch (error) {
            reject(error);
          }
          return;
        }
        if (
          response.statusCode !== 200 ||
          !/^application\/json\b/i.test(
            response.headers["content-type"] ?? "",
          ) ||
          ![undefined, "identity"].includes(
            response.headers["content-encoding"],
          ) ||
          Number(response.headers["content-length"] ?? 0) > maxBytes
        ) {
          response.destroy();
          reject(new Error("Invalid JSON response"));
          return;
        }
        void (async () => {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of response) {
            const bytes = Buffer.from(chunk);
            size += bytes.length;
            if (size > maxBytes) throw new Error("Response too large");
            chunks.push(bytes);
          }
          return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
        })().then(resolve, reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}
