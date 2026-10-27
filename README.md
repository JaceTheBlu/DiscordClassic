# DiscordClassic

> [!WARNING]
> **Use at your own risk.**
> - Client modifications, including Vencord and this plugin, are against [Discord's Terms of Service](https://discord.com/terms). Your account could be suspended. If it matters a lot to you, do not use client mods.
> - This plugin only changes what your own client displays or downloads. It sends no extra requests to Discord, automates nothing, and does not unlock paid features.
> - This is an unofficial, personal project. It is not affiliated with, endorsed by or supported by Discord Inc. or the Vencord project. Do not ask Vencord support for help with it.
> - Provided as is, without any warranty (see [LICENSE](LICENSE)).

Discord is a trademark of Discord Inc., mentioned only to describe what this plugin works with.

A [Vencord](https://github.com/Vendicated/Vencord) userplugin that blocks or hides Discord marketing and recent additions to get a "classic" interface back. One plugin, one independent toggle per feature.

> Status: phase 1 (personal userplugin). Selector validation status: [docs/selectors.md](docs/selectors.md).

## Options

Settings are grouped by zone, each with a short explanation in the Vencord settings.

**Removal mode**: *Hide* (default) hides elements with CSS, Discord still downloads them. *Block* works like an ad blocker: for options marked "(blockable)", Discord's code is patched so the content is never fetched, and the rest is hidden. *Experimental: block by URL* extends Block to options with no patch yet, by hooking browser functions; it may trigger Discord's anti-bot captchas, keep it off unless you need it.

**Blocked counter**: like uBlock Origin's badge, the top of the settings page shows a dashboard of what Block mode kept Discord from downloading: files, estimated data saved, and one bar per option, for this session or since install. Each file counts once per session. The data figure uses average file sizes, so treat it as an order of magnitude. Time saved is not measured.

| Zone | Option | Default |
| --- | --- | --- |
| Marketing | Nitro tab | on |
| Marketing | Shop tab | on |
| Marketing | Gift button | on |
| Recent additions | Quests | off |
| Other users' cosmetics | Avatar decorations (blockable) | off |
| Other users' cosmetics | Nameplates (blockable) | off |
| Other users' cosmetics | Server tags (blockable) | off |
| Other users' cosmetics | Profile frames (blocked only with "block by URL") | off |
| Other users' cosmetics | Profile effects | off |
| Other users' cosmetics | Freeze animations (patch, restart needed) | off |

Profile themes (gradient profile backgrounds): enable Vencord's built-in **NoProfileThemes** plugin.

Discord itself can turn off some of these, no plugin needed (setting names from Vencord's typings of Discord's AccessibilityStore, look under User Settings > Accessibility): display name styles (fonts and glow on names), and the GIF, sticker, emoji and apps buttons of the chat bar.

The plugin settings have a **Handled elsewhere** section with buttons to both. Each zone has All / None buttons (Freeze animations is left out, it needs a restart). The removal mode is picked with two cards at the top, and "Experimental: block by URL" only shows in Block mode.

Planned: profile effects, orbs, activities, friends activity bar, extra badges, chat bar buttons (GIF, stickers, apps).

## Selector report

Selectors break when Discord updates. Toolbox menu > **Copy selector report** copies a JSON report of what each rule matches and of candidate elements, see [docs/selectors.md](docs/selectors.md#selector-report).

## Install

Vencord must be built from source.

```bash
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm install
git clone https://github.com/JaceTheBlu/DiscordClassic src/userplugins/DiscordClassic
pnpm build --dev   # or: pnpm watch
pnpm inject
```

All commands run from the Vencord root and work the same in bash and PowerShell.

Update later, from the Vencord root in PowerShell:

```powershell
.\src\userplugins\DiscordClassic\update.ps1            # pull the plugin, rebuild
.\src\userplugins\DiscordClassic\update.ps1 -Vencord   # also pull Vencord
.\src\userplugins\DiscordClassic\update.ps1 -Restart   # restart Discord after the build
```

If PowerShell refuses to run scripts, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. On bash: `git -C src/userplugins/DiscordClassic pull && pnpm build --dev`.

Then enable **DiscordClassic** in Vencord settings. Toggles apply live, no restart needed.

## Dev container

Open this repo in VS Code and choose **Reopen in Container** (needs Docker). The container clones Vencord, installs its dependencies and mounts this repo at `src/userplugins/DiscordClassic`. Then, from `/home/node/Vencord`:

```bash
pnpm build --dev                                # build with the plugin
pnpm lint src/userplugins/DiscordClassic        # lint the plugin only
pnpm testTsc                                    # typecheck
```

The container cannot inject into Discord: run `pnpm inject` from a Vencord checkout on the host to test in the real client. To build against a specific Vencord version, set the `VENCORD_REF` build arg in `.devcontainer/devcontainer.json`.

The plugin sits at the repo root on purpose: Vencord only loads `src/userplugins/<folder>/index.tsx`, one level deep.

## License

[GPL-3.0-or-later](LICENSE), like Vencord. The source file headers follow Vencord's lint rule.
