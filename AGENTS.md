<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:tidepage-ui-rules -->

## Tidepage component architecture

- Read `docs/frontend-architecture.md` and `docs/design-system.md` before changing UI structure or shared components.
- Do not recreate `src/components` or a mixed `primitives.tsx`. Use `shared/ui` for business-independent foundations, `modules/<domain>/ui` for business views, and `widgets/site-shell` for site composition.
- Reuse the existing shared Button, fields, links, Select, FilterTabs, Dialog, Disclosure, overlays, feedback, typography, and drawing components. Native controls belong only in their owning shared primitive; architecture checks enforce this.
- Co-locate view-specific CSS Modules. Keep routes focused on data, validation, SEO and view composition.
- UI components must not import widgets or routes. Shared must not import business modules. Do not mix server and client exports in a global UI barrel.
- All visible copy uses registered locale catalogs; never inline locale ternaries. Preserve reduced-motion and keyboard/focus behavior.
- Run `pnpm run check` and `pnpm run build` after structural changes; verify affected interactions in the browser.

<!-- END:tidepage-ui-rules -->
