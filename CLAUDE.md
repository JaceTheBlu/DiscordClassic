# DiscordClassic

Vencord userplugin (`index.tsx` at the root, loaded as `src/userplugins/DiscordClassic/index.tsx`). Hides Discord marketing and recent UI additions, one independent boolean setting per feature.

## Map

- `index.tsx`: settings (grouped by zone with `section(...)` heading components, `mode` = hide/block, `urlBlocking`), `RULES` (toggle -> CSS selector), `FILTERS` (toggle -> media URL regexes for experimental URL blocking), `apply()` re-run on every setting change, `patches` for options that need Discord's code changed (`freezeAnimations`, `restartNeeded`).
- Block mode (`mode` value `"filter"`, kept for stored settings): patches first (`$self.blocks(key)`), `filter.ts` only behind the `urlBlocking` toggle.
- `filter.ts`: experimental URL blocking. Intercepts `src` on img/video/source in the renderer so matching media is never requested. Not a main-process webRequest listener on purpose (Electron allows one per session).
- `diagnostics.ts`: `buildReport` scans the DOM for selector discovery, exposed as the **Copy selector report** toolbox action. Discovery only, it never picks selectors.
- `docs/selectors.md`: selector validation status and DevTools procedure. Read it before touching `RULES`.
- `README.md`: user facing install and option list.
- `update.ps1`: Windows update script (pull plugin, optional `-Vencord` pull, rebuild, optional `-Restart` of Discord). Must stay compatible with Windows PowerShell 5.1 (no `&&`, no `??`).
- `.devcontainer/`: build, lint and typecheck inside a real Vencord tree, see [.devcontainer/CLAUDE.md](.devcontainer/CLAUDE.md).

## Rules

- Code, comments and identifiers in English.
- Never claim a Discord selector or module name is correct without checking it in DevTools: they change every build. Mark unverified ones as such.
- Prefer stable attributes (`data-list-item-id`, `href`, `aria-label`). When none exists, `[class*='readablePrefix']`, never a full hashed class.
- Adding an option = one `toggle(displayName, description)` under the right `section` + one entry in `RULES` (+ `FILTERS` if it loads media) + one row in `docs/selectors.md` and in the README table.
- Patches: only from a match string proven in current Vencord code (e.g. an existing plugin's patch) or in Discord code captured by a selector report (`code` section), never written blind. Check the report's `patches` section after a Discord update.
- `FILTERS` patterns only from URLs seen in a selector report `media` section, never guessed.
- Defaults: off, except obvious marketing (Nitro, Shop, gift).
- Phase 2 (upstream PR to `Vendicated/Vencord`): replace key CSS rules with patches, move author to `Devs`, run `pnpm lint`.
