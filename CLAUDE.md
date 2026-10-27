# DiscordClassic

Vencord userplugin (`index.tsx` at the root, loaded as `src/userplugins/DiscordClassic/index.tsx`). Hides Discord marketing and recent UI additions, one independent boolean setting per feature.

## Map

- `index.tsx`: the whole plugin. `settings` declares the toggles, `RULES` maps each toggle to a CSS selector, `applyStyle` writes one `<style id="vc-discord-classic">` and re-runs on every setting change.
- `diagnostics.ts`: `buildReport` scans the DOM for selector discovery, exposed as the **Copy selector report** toolbox action. Discovery only, it never picks selectors.
- `docs/selectors.md`: selector validation status and DevTools procedure. Read it before touching `RULES`.
- `README.md`: user facing install and option list.
- `.devcontainer/`: build, lint and typecheck inside a real Vencord tree, see [.devcontainer/CLAUDE.md](.devcontainer/CLAUDE.md).

## Rules

- Code, comments and identifiers in English.
- Never claim a Discord selector or module name is correct without checking it in DevTools: they change every build. Mark unverified ones as such.
- Selectors on stable attributes only (`data-list-item-id`, `href`, `aria-label`), never hashed classes.
- Adding an option = one `toggle(...)` in `settings` + one entry in `RULES` + one row in `docs/selectors.md` and in the README table.
- Defaults: off, except obvious marketing (Nitro, Shop, gift).
- Phase 2 (upstream PR to `Vendicated/Vencord`): replace key CSS rules with patches, move author to `Devs`, run `pnpm lint`.
