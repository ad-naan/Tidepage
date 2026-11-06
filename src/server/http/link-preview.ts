import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LinkPreview } from "@/shared/contracts/link-preview";
import { publicTarget } from "./public-url";

function clean(value: string, limit: number) {
  return value
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_, number: string) => {
      const code =
        number[0].toLowerCase() === "x"
          ? parseInt(number.slice(1), 16)
          : Number(number);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(
      /&(amp|quot|apos|lt|gt|nbsp);/gi,
      (_, name: string) =>
        ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " })[
          name.toLowerCase()
        ]!,
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export function parseLinkPreview(html: string, pageUrl: string): LinkPreview {
  const head = html.split(/<\/head\s*>/i)[0];
  const tags = new Map<string, string>();
  // Extract metadata only; no remote HTML or script is ever inserted into the page.
  for (const tag of head.match(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) ?? []) {
    const attrs = new Map<string, string>();
    for (const attr of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
    ))
      attrs.set(attr[1].toLowerCase(), attr[2] ?? attr[3] ?? attr[4]);
    const key = (attrs.get("property") || attrs.get("name"))?.toLowerCase();
    if (key && attrs.get("content") && !tags.has(key))
      tags.set(key, attrs.get("content")!);
  }
  const result: LinkPreview = {
    title: clean(
      tags.get("og:title") ||
        tags.get("twitter:title") ||
        head.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ||
        "",
      200,
    ),
    description: clean(
      tags.get("og:description") ||
        tags.get("twitter:description") ||
        tags.get("description") ||
        "",
      400,
    ),
    siteName: clean(tags.get("og:site_name") || new URL(pageUrl).hostname, 80),
  };
  const image =
    tags.get("og:image:secure_url") ||
    tags.get("og:image") ||
    tags.get("twitter:image");
  if (image) {
    try {
      const url = new URL(clean(image, 2048), pageUrl);
      if (url.protocol === "https:" && !url.username && !url.password)
        result.artworkUrl = url.href;
    } catch {
      /* Metadata can contain malformed URLs. */
    }
  }
  return result;
}

async function readPage(
  value: string,
  signal: AbortSignal,
  redirects = 0,
): Promise<LinkPreview> {
  const target = await publicTarget(value);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const request = (
      target.url.protocol === "https:" ? httpsRequest : httpRequest
    )(
      target.url,
      {
        signal,
        agent: false,
        family: target.family,
        // Pin the validated DNS result: no second resolution or DNS rebinding window.
        lookup: (_hostname, _options, callback) =>
          callback(null, target.address, target.family),
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
          "User-Agent": "Tidepage-LinkPreview/1.0",
        },
      },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode || 0)) {
          const location = response.headers.location;
          response.destroy();
          if (!location || redirects >= 3)
            return reject(new Error("Redirect limit"));
          // Every redirect is revalidated and pinned, including hostname changes.
          try {
            void readPage(
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
          !/^(text\/html|application\/xhtml\+xml)\b/i.test(
            response.headers["content-type"] || "",
          )
        ) {
          response.destroy();
          reject(new Error("Not an HTML page"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 512 * 1024) {
            response.destroy(new Error("Metadata exceeds limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve(
            parseLinkPreview(
              Buffer.concat(chunks).toString("utf8"),
              target.url.href,
            ),
          ),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}

const cache = new Map<string, { value: LinkPreview; expires: number }>();
const pending = new Map<string, Promise<LinkPreview>>();
export async function getLinkPreview(value: string): Promise<LinkPreview> {
  const url = new URL(value);
  url.hash = "";
  const key = url.href;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending.has(key)) return pending.get(key)!;
  if (pending.size >= 8) return { siteName: url.hostname };
  const task = (async () => {
    const signal = AbortSignal.timeout(5000);
    let result: LinkPreview;
    try {
      result = await Promise.race([
        readPage(key, signal).then(async (preview) => {
          if (preview.artworkUrl) {
            try {
              await publicTarget(preview.artworkUrl);
            } catch {
              delete preview.artworkUrl;
            }
          }
          return preview;
        }),
        new Promise<never>((_, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          }),
        ),
      ]);
    } catch {
      result = { siteName: url.hostname };
    }
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      value: result,
      expires: Date.now() + (result.title ? 3_600_000 : 60_000),
    });
    return result;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
