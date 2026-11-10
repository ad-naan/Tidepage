/** Workspace routes manage scrolling in their own container. */
export function isQuietNavigationPath(path: string) {
  return /^\/(?:[^/]+\/)?admin(?:\/|$)/.test(path);
}
