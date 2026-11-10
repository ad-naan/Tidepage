export const themeStorageKey = "adnaan-theme";
export const darkSchemeQuery = "(prefers-color-scheme: dark)";

/** Runs during HTML parsing, before the first render or hydration. */
export const themeBootstrap = `(() => {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(${JSON.stringify(themeStorageKey)})); } catch {}
  document.documentElement.dataset.theme =
    saved === "light" || saved === "dark" ? saved :
    matchMedia(${JSON.stringify(darkSchemeQuery)}).matches ? "dark" : "light";
})();`;
