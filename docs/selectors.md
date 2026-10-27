# Selectors

Back to [CLAUDE.md](../CLAUDE.md).

Status of each `RULES` entry in `index.tsx`. Nothing is verified yet.

| Option | Selector | Status | Checked on (date, Discord build) |
| --- | --- | --- | --- |
| hideNitroTab | `[data-list-item-id$='___nitro']` | unverified | |
| hideShop | `[data-list-item-id$='___shop']` | unverified | |
| hideGiftButton | `[aria-label='Send a gift']` | unverified, depends on client language | |
| hideQuests | `[data-list-item-id$='___quests']` | unverified | |
| hideAvatarDecorations | `[class*='avatarDecoration']` | unverified, class based (fragile) | |

## Selector report

The plugin can scan the page for you. Open the view to check (for example a server member list), then either:

- click the Vencord toolbox icon in the title bar, then **Copy selector report** (needs the VencordToolbox plugin), or
- run `Vencord.Plugins.plugins.DiscordClassic.copySelectorReport()` in the DevTools console.

A JSON report is copied to the clipboard (code in `diagnostics.ts`):

- `rules`: for each `RULES` entry, how many elements it matches right now, and a sample. `count: 0` means the selector is wrong or the element is not on screen.
- `keywords`: elements whose class contains a known fragment (`nameplate`, `clan`, `decoration`, `quest`...), with hash suffixes removed, their stable attributes, and the closest ancestor (`anchor`) that has one.

The report can contain usernames (from `aria-label`) and the current channel path.

## How to validate by hand

1. Open Discord, press `Ctrl+Shift+I`.
2. Inspect the element, note the closest stable attribute (`data-list-item-id`, `href`, `aria-label`).
3. Test in the console: `document.querySelectorAll('<selector>')` must return only the expected elements.
4. Update the table above with the date and the build number (Settings, bottom left).
