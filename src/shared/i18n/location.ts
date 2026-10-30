/** Build a language-neutral href without losing filters, repeated parameters or an anchor. */
export function localeSwitchHref(
  pathname: string,
  search: string,
  hash: string,
): string {
  const path = pathname || "/";
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Expected an internal pathname");
  const query = new URLSearchParams(search);
  let href = path;
  if (query.size > 0) href += `?${query.toString()}`;
  if (hash.startsWith("#")) href += hash;
  return href;
}
