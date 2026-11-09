import { safeWebUrl } from "./editor-document";

export function referenceUrl(input: string) {
  const text = input.trim();
  const candidate = /^[\w-]+(?:\.[\w-]+)+(?:[/?#]|$)/u.test(text)
    ? `https://${text}`
    : text;
  if (
    /\s/.test(candidate) ||
    !safeWebUrl.max(2048).safeParse(candidate).success
  )
    return null;
  const url = new URL(candidate).href;
  return url.length <= 2048 ? url : null;
}
