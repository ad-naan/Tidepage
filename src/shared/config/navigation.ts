/** Workspace routes keep their shell visible instead of using the editorial page transition. */
export function isQuietNavigationPath(path: string) {
  return /^\/(?:[^/]+\/)?admin(?:\/|$)/.test(path);
}
