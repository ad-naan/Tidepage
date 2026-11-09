import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LinkPreview } from "@/shared/contracts/link-preview";
import { publicTarget } from "./public-url";
import { readHtmlHead } from "./html-head";
import { log } from "@/server/observability/logger";

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function first(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function string(value: unknown) {
  return typeof value === "string" ? value : "";
}

function structuredMedia(head: string, acceptedTypes: RegExp) {
  for (const [, json] of head.matchAll(
    /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi,
  )) {
    try {
      const data: unknown = JSON.parse(json);
      const items: unknown[] = [data];
      for (const item of items) {
        if (Array.isArray(item)) {
          for (const entry of item) items.push(entry);
          continue;
        }
        const fields = record(item);
        const type = fields["@type"];
        const types = Array.isArray(type) ? type : [type];
        const mediaType = types
          .map((type) => string(type).replace(/^https?:\/\/schema\.org\//, ""))
          .find((type) => acceptedTypes.test(type));
        if (mediaType) return { fields, mediaType };
        if (fields["@graph"]) items.push(fields["@graph"]);
        if (fields.mainEntity) items.push(fields.mainEntity);
      }
    } catch {
      /* A malformed block does not prevent Open Graph or other blocks from working. */
    }
  }
  return undefined;
}

function entityNames(value: unknown) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => string(record(item).name) || string(item))
    .filter((name) => name && !/^https?:\/\//i.test(name))
    .join(", ");
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
  const type = clean(tags.get("og:type") || "", 80).toLowerCase();
  const media =
    !type ||
    type === "website" ||
    type === "video.movie" ||
    type.startsWith("music.")
      ? structuredMedia(
          head,
          type === "video.movie"
            ? /^Movie$/
            : type.startsWith("music.")
              ? /^Music(?:Recording|Album|Playlist)$/
              : /^(?:Movie|MusicRecording|MusicAlbum|MusicPlaylist)$/,
        )
      : undefined;
  const fields = media?.fields;
  const album = record(first(fields?.inAlbum));
  const result: LinkPreview = {
    title: clean(
      string(fields?.name) ||
        tags.get("og:title") ||
        tags.get("twitter:title") ||
        head.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ||
        "",
      200,
    ),
    description: clean(
      tags.get("og:description") ||
        tags.get("twitter:description") ||
        string(fields?.description) ||
        tags.get("description") ||
        "",
      400,
    ),
    siteName: clean(tags.get("og:site_name") || new URL(pageUrl).hostname, 80),
  };
  if (media?.mediaType === "Movie" || type === "video.movie") {
    result.kind = "movie";
    const director = clean(string(record(first(fields?.director)).name), 200);
    const year = (
      string(fields?.datePublished) || tags.get("video:release_date")
    )?.match(/^(\d{4})(?:-|$)/)?.[1];
    if (director) result.creator = director;
    if (year) result.year = year;
  } else if (
    media?.mediaType.startsWith("Music") ||
    type.startsWith("music.")
  ) {
    result.kind = "music";
    const artist = clean(
      entityNames(fields?.byArtist) ||
        entityNames(album.byArtist) ||
        tags.get("music:musician_description") ||
        entityNames(tags.get("music:musician")),
      200,
    );
    const albumName = clean(string(album.name), 200);
    const year = (
      string(fields?.datePublished) || tags.get("music:release_date")
    )?.match(/^(\d{4})(?:-|$)/)?.[1];
    if (artist) result.creator = artist;
    if (albumName) result.album = albumName;
    if (year) result.year = year;
    if (
      artist &&
      result.title &&
      result.description?.startsWith(`${artist} · ${result.title} · `)
    )
      result.description = "";
  }
  const artwork = [first(fields?.image), first(album.image)];
  const images = [
    ...artwork.map((image) => [
      string(image) ||
        string(record(image).contentUrl) ||
        string(record(image).url),
      string(record(image).caption),
    ]),
    [tags.get("og:image:secure_url"), tags.get("og:image:alt")],
    [tags.get("og:image"), tags.get("og:image:alt")],
    [tags.get("twitter:image"), tags.get("twitter:image:alt")],
  ];
  for (const [image, alt] of images) {
    if (!image?.trim()) continue;
    try {
      const url = new URL(clean(image, 2048), pageUrl);
      if (url.protocol === "https:" && !url.username && !url.password) {
        result.artworkUrl = url.href;
        const artworkAlt = clean(alt || "", 300);
        if (artworkAlt) result.artworkAlt = artworkAlt;
        break;
      }
    } catch {
      /* Metadata can contain malformed URLs. */
    }
  }
  return result;
}

export async function readLinkPreview(
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
            void readLinkPreview(
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
        void readHtmlHead(response).then(
          (html) => resolve(parseLinkPreview(html, target.url.href)),
          reject,
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

const cache = new Map<string, { value: LinkPreview; expires: number }>();
const pending = new Map<string, Promise<LinkPreview>>();
async function within<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let aborted: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    aborted = () => reject(signal.reason);
    signal.addEventListener("abort", aborted, { once: true });
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    signal.removeEventListener("abort", aborted);
  }
}
export async function getLinkPreview(value: string): Promise<LinkPreview> {
  const url = new URL(value);
  url.hash = "";
  const key = url.href;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending.has(key)) return pending.get(key)!;
  if (pending.size >= 8) return { siteName: url.hostname };
  const task = (async () => {
    const signal = AbortSignal.timeout(8000);
    let result: LinkPreview;
    try {
      result = await within(readLinkPreview(key, signal), signal);
    } catch (error) {
      log("warn", "link_preview.fetch_failed", {
        component: "link-preview",
        code: signal.aborted
          ? "TIMEOUT"
          : error instanceof Error && error.message === "Not a public address"
            ? "DNS_BLOCKED"
            : error instanceof Error && error.name === "AbortError"
              ? "DNS_OR_NETWORK_TIMEOUT"
              : "FETCH_FAILED",
      });
      result = { siteName: url.hostname };
    }
    if (result.artworkUrl) {
      try {
        await within(
          publicTarget(result.artworkUrl),
          AbortSignal.timeout(2000),
        );
      } catch {
        delete result.artworkUrl;
        delete result.artworkAlt;
      }
    }
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      value: result,
      expires: Date.now() + (result.title ? 3_600_000 : 15_000),
    });
    return result;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
