# DiscordClassic

A [Vencord](https://github.com/Vendicated/Vencord) userplugin that hides Discord marketing and recent additions to get a "classic" interface back. One plugin, one independent toggle per feature.

> Status: phase 1 (personal userplugin). Selectors are not validated yet, see [docs/selectors.md](docs/selectors.md).

## Options

| Option | Default | Method |
| --- | --- | --- |
| Hide Nitro tab | on | CSS |
| Hide Shop tab | on | CSS |
| Hide gift button | on | CSS |
| Hide Quests | off | CSS |
| Hide avatar decorations | off | CSS |

Planned: profile effects, profile themes, orbs, activities, friends activity bar, extra badges, chat bar buttons (GIF, stickers, apps), static animated banners (patch).

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

Update later with `git -C src/userplugins/DiscordClassic pull`, then rebuild.

Then enable **DiscordClassic** in Vencord settings. Toggles apply live, no restart needed.

The plugin sits at the repo root on purpose: Vencord only loads `src/userplugins/<folder>/index.tsx`, one level deep.
