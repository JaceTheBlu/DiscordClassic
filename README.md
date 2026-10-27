# DiscordClassic

Get the old, quieter Discord back. DiscordClassic is a [Vencord](https://github.com/Vendicated/Vencord) plugin that blocks or hides Discord's marketing (Nitro, Shop, gift upsells), recent additions like Quests, and the paid cosmetics other people show on their profile. One switch per feature, everything applies live.

<!--
Screenshots (to add in docs/screenshots/, then uncomment):
<p align="center">
  <img src="docs/screenshots/before-after.png" width="720" alt="Direct messages list before and after DiscordClassic">
  <img src="docs/screenshots/settings.png" width="480" alt="DiscordClassic settings page">
</p>
-->

> [!WARNING]
> **Use at your own risk.** Client mods, including Vencord and this plugin, are against [Discord's Terms of Service](https://discord.com/terms), and your account could be suspended. This plugin only changes what your own client shows or downloads: it sends no extra requests, automates nothing and unlocks no paid feature. Unofficial personal project, not affiliated with Discord Inc. or Vencord (do not ask Vencord support about it). Provided as is, see [LICENSE](LICENSE).

## Install (Windows)

1. Close Discord.
2. Open **PowerShell** (Start menu, type `PowerShell`, Enter). Not as administrator.
3. Paste this line and press Enter:

   ```powershell
   irm https://raw.githubusercontent.com/JaceTheBlu/DiscordClassic/main/install.ps1 | iex
   ```

4. Open Discord, then **User Settings > Vencord > Plugins > DiscordClassic** (gear icon) to choose what to remove.

Nothing to install beforehand: the script downloads a ready-made Vencord that already contains the plugin, then uses the official Vencord installer to patch Discord. If you already use Vencord, your settings and plugins are kept.

**Updates**: Vencord's updater (User Settings > Vencord > Updater) follows this repo, so new plugin versions arrive like normal Vencord updates. If Discord breaks after one of its own updates, run the install line again.

**Uninstall**: run this in PowerShell, Discord goes back to normal:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/JaceTheBlu/DiscordClassic/main/install.ps1))) -Uninstall
```

To patch Discord PTB or Canary instead of the first one found, add `-Branch ptb` (or `canary`) the same way. On macOS and Linux, use the [source install](#install-from-source).

## What it removes

| Zone | Option | Default |
| --- | --- | --- |
| Marketing | Nitro tab | on |
| Marketing | Shop tab | on |
| Marketing | Gift button (not confirmed working yet) | on |
| Recent additions | Quests | off |
| Other users' cosmetics | Avatar decorations (blockable) | off |
| Other users' cosmetics | Nameplates (blockable) | off |
| Other users' cosmetics | Server tags (blockable) | off |
| Other users' cosmetics | Profile frames (blockable) | off |
| Other users' cosmetics | Profile effects (blockable) | off |
| Other users' cosmetics | Freeze animations (restart needed) | off |

Each zone has **All / None** buttons. Only obvious marketing is on by default.

**Hide or Block**: two cards at the top of the settings pick the removal mode.
- *Hide* (default): Discord downloads everything, the plugin hides it.
- *Block*: works like an ad blocker. For options marked "(blockable)", Discord never fetches the content at all, the rest is hidden. A counter at the top of the settings shows how many files were blocked and roughly how much data was saved.
- *Experimental: block by URL* only shows in Block mode and is off by default. It may trigger Discord's anti-bot captchas: leave it off unless you know you need it.

**Already possible without this plugin**: profile themes (gradient backgrounds) with Vencord's built-in **NoProfileThemes** plugin; name fonts and glow, and the GIF, sticker, emoji and apps buttons of the chat bar in Discord's own **User Settings > Accessibility**. The **Handled elsewhere** section of the plugin settings has shortcuts to both.

Planned: orbs, activities, friends activity bar, extra badges.

## Something stopped working?

Discord changes its interface often, which can make an option stop removing its element. Open the Vencord toolbox (top right icon) > **Copy selector report** and send the copied text in an issue. It lists what each option matches. It can contain names shown on screen, so have a quick look before sharing it. Details: [docs/selectors.md](docs/selectors.md#selector-report).

## Install from source

For development, or on macOS and Linux. Needs [Git](https://git-scm.com/downloads), [Node.js](https://nodejs.org/) 22 or newer and pnpm (`npm i -g pnpm`).

```bash
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm install
git clone https://github.com/JaceTheBlu/DiscordClassic src/userplugins/DiscordClassic
pnpm build --dev   # or: pnpm watch
pnpm inject
```

All commands run from the Vencord root and work the same in bash and PowerShell. To update later, from the Vencord root in PowerShell:

```powershell
.\src\userplugins\DiscordClassic\update.ps1            # pull the plugin, rebuild
.\src\userplugins\DiscordClassic\update.ps1 -Vencord   # also pull Vencord
.\src\userplugins\DiscordClassic\update.ps1 -Restart   # restart Discord after the build
```

If PowerShell refuses to run scripts, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. On bash: `git -C src/userplugins/DiscordClassic pull && pnpm build --dev`.

### Dev container

Open this repo in VS Code and choose **Reopen in Container** (needs Docker). The container clones Vencord, installs its dependencies and mounts this repo at `src/userplugins/DiscordClassic`. Then, from `/home/node/Vencord`:

```bash
pnpm build --dev                                # build with the plugin
pnpm lint src/userplugins/DiscordClassic        # lint the plugin only
pnpm testTsc                                    # typecheck
```

The container cannot inject into Discord: run `pnpm inject` from a Vencord checkout on the host. To build against a specific Vencord version, set the `VENCORD_REF` build arg in `.devcontainer/devcontainer.json`.

The plugin sits at the repo root on purpose: Vencord only loads `src/userplugins/<folder>/index.tsx`, one level deep.

### Releases

[`.github/workflows/release.yml`](.github/workflows/release.yml) builds Vencord with this plugin on every push to `main` and every Monday (to pick up Vencord fixes), and publishes it as the `latest` release that `install.ps1` and the Vencord updater download.

## License

[GPL-3.0-or-later](LICENSE), like Vencord. Discord is a trademark of Discord Inc., mentioned only to describe what this plugin works with.
