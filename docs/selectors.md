# Selectors

Back to [CLAUDE.md](../CLAUDE.md).

Status of each `RULES` entry in `index.tsx`. "verified" means the selector report matched the expected elements on that build.

| Option | Selector | Status | Checked on (date, Discord build) |
| --- | --- | --- | --- |
| hideNitroTab | `[data-list-item-id$='___nitro']` | verified (href `/store`) | 2026-10-27, discord/1.0.9265 |
| hideShop | `[data-list-item-id$='___shop']` | verified (href `/shop`) | 2026-10-27, discord/1.0.9265 |
| hideGiftButton | `[aria-label='Send a gift']` | no match with a channel open: wrong selector or button absent | 2026-10-27, discord/1.0.9265 |
| hideQuests | `[data-list-item-id$='___quests'], svg[class*='questsIcon']` | verified (href `/quest-home`; icon in member activity) | 2026-10-27, discord/1.0.9265 |
| hideAvatarDecorations | `img[class*='avatarDecoration']` | verified, class based | 2026-10-27, discord/1.0.9265 |
| hideNameplates | `[class*='nameplated'] > [class*='container']:first-child` | verified, class based (first child of the `nameplated` row holds the background img) | 2026-10-27, discord/1.0.9265 |
| hideProfileFrames | `[class*='profileFrameContainer']` | verified, class based (`div.profileFrameContainer.custom-profile-frame`, role img, holds the frame layers; images from `collectibles-shop`) | 2026-10-27, discord/1.0.9265 |
| hideProfileEffects | `[class*='profileEffects']` | verified, class based (`div.profileEffects`, role img, holds `img.effect` from `cdn.discordapp.com/assets/content/<hash>`). No `FILTERS` entry: `assets/content` may serve other content too | 2026-10-27, discord/1.0.9265 |
| hideClanTags | `[class*='clanTag'], span[class*='guildTag']` | verified, class based (`clanTag` in DMs, `guildTag` in member list) | 2026-10-27, discord/1.0.9265 |

URL blocking patterns, experimental (seen in reports, 2026-10-27, discord/1.0.9265):

| Option | URL prefix |
| --- | --- |
| hideAvatarDecorations, hideNameplates | `https://cdn.discordapp.com/media/v1/collectibles-shop/` (shared, also used by Shop previews: filtering one blocks all) |
| hideClanTags | `https://cdn.discordapp.com/clan-badges/` |

Patches (no selector):

| Option | Patch | Status |
| --- | --- | --- |
| hideAvatarDecorations (Block mode) | `getAvatarDecorationURL` returns nothing, so no request | Same insertion point as Vencord's Decor plugin: incompatible with Decor. Likely working: report of 2026-10-27 12:33 shows no decoration element left in a member list that had 8. |
| hideClanTags (Block mode) | clan badge URL builder (`find: "/clan-badges/"`) returns nothing | Written from Discord's code in GG's report (module 685073, discord/1.0.9265). Working: report of 2026-10-27 shows badge placeholders and no `clan-badges` media. |
| hideProfileEffects, hideProfileFrames (Block mode) | profile collectibles parsed with `profileEffect`/`profileFrame` set to `undefined` (`find: "collectibles:void 0,profileEffect:void 0,profileFrame:void 0"`) | Written from Discord's code in GG's report (module 321191, discord/1.0.9265). Applies to every profile, yours included (locally). Working: report of 2026-10-27 18:51 shows 1 effect blocked, 0 effects in the DOM, module 321191 patched; GG confirmed frames gone too. |
| hideNameplates (Block mode) | member list rows get `nameplate: undefined` (`find: "onClickPremiumGuildIcon:"`) | Written from Discord's code in GG's report (module 66148, discord/1.0.9265). Member list only. The find matches 2 modules (row component and list), so the patch uses `all: true`; first version without it did not apply. Working: report of 2026-10-27 13:20 shows 0 nameplates in a member list, 12 counted as blocked, module 66148 patched. |
| freezeAnimations | `canAnimate:` -> `!1` (all modules), nameplates `animate`/`loop` -> `!1` | Inverse of Vencord's AlwaysAnimate patches (Vencord 1.15.13, main of 2026-10-24). Not yet tried in GG's client. |

Known but not handled yet:

- Gift button: `[aria-label='Send a gift']` never matched. Needs a report with the button visible, if it still exists.
- Display name style upsell popup ("Give their style a spin", next to a profile popout): gone since the profile effect/frame block (GG, 2026-10-27), no selector needed. If it comes back, take a report while it is open (`texts` section).
- Profile effects and frames: handled (`hideProfileEffects`, `hideProfileFrames`), CSS in Hide mode, patch in Block mode (see table above).
- Display name styles and chat bar GIF/sticker/emoji/apps buttons: not handled here, Discord has its own settings for them (`displayNameStylesEnabled`, `gifButtonEnabled`, `stickerButtonEnabled`, `emojiButtonEnabled`, `appsButtonEnabled` in AccessibilityStore, per Vencord's discord-types). The plugin's "Open Accessibility" button calls `SettingsRouter.openUserSettings("accessibility_panel")`, confirmed working by GG on 2026-10-27, and GG confirmed the name styles setting there.
- Profile themes (gradient profile background): not handled here, Vencord's built-in NoProfileThemes plugin already patches it (`find: "hasThemeColors(){"`).

## Selector report

The plugin can scan the page for you. Open the view to check (for example a server member list), then either:

- click the Vencord toolbox icon in the title bar, then **Copy selector report** (needs the VencordToolbox plugin), or
- run `Vencord.Plugins.plugins.DiscordClassic.copySelectorReport()` in the DevTools console.

A JSON report is copied to the clipboard (code in `diagnostics.ts`):

- `rules`: for each `RULES` entry, how many elements it matches right now, and a sample. `count: 0` means the selector is wrong or the element is not on screen.
- `texts`: for each phrase in `TEXTS`, the classes of up to 8 ancestors of every element showing it. For popups with no telling class.
- `buttons`: distinct `aria-label`s of buttons on screen (chat bar, toolbars).
- `code`: snippets of Discord's own code around CDN paths (`clan-badges`, `collectibles-shop`...), used to write Block mode patches.
- `patches`: how many modules each patch `find` matches (should be 1, unless the patch sets `all`) and which modules carry DiscordClassic patches.
- `blocked`: the blocked counter (`stats.ts`), per option, with the size estimate used.
- `media`: every img/video URL on screen, grouped by host and path prefix. Source for URL blocking patterns. `avgKb` is the average downloaded size when the browser exposes it: run the report in Hide mode (blocked files are never downloaded) to correct `ESTIMATED_KB` in `stats.ts`. Report of 2026-10-27 had no `avgKb` at all: Discord's CDN seems to hide sizes from resource timings, so the estimates stay guesses.
- `keywords`: elements whose class contains a known fragment (`nameplate`, `clan`, `decoration`, `quest`...), with hash suffixes removed, their stable attributes, and the closest ancestor (`anchor`) that has one.

The report can contain usernames (from `aria-label`) and the current channel path.

## How to validate by hand

1. Open Discord, press `Ctrl+Shift+I`.
2. Inspect the element, note the closest stable attribute (`data-list-item-id`, `href`, `aria-label`).
3. Test in the console: `document.querySelectorAll('<selector>')` must return only the expected elements.
4. Update the table above with the date and the build number (Settings, bottom left).
