# Selectors

Back to [CLAUDE.md](../CLAUDE.md).

Status of each `RULES` entry in `index.tsx`. Nothing is verified yet.

| Option | Selector | Status | Checked on (date, Discord build) |
| --- | --- | --- | --- |
| hideNitroTab | `[data-list-item-id$="___nitro"]` | unverified | |
| hideShop | `[data-list-item-id$="___shop"]` | unverified | |
| hideGiftButton | `[aria-label="Send a gift"]` | unverified, depends on client language | |
| hideQuests | `[data-list-item-id$="___quests"]` | unverified | |
| hideAvatarDecorations | `[class*="avatarDecoration"]` | unverified, class based (fragile) | |

## How to validate

1. Open Discord, press `Ctrl+Shift+I`.
2. Inspect the element, note the closest stable attribute (`data-list-item-id`, `href`, `aria-label`).
3. Test in the console: `document.querySelectorAll('<selector>')` must return only the expected elements.
4. Update the table above with the date and the build number (Settings, bottom left).
