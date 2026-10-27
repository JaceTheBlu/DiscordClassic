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

Update later with `git -C src/userplugins/DiscordClassic pull`, then rebuild.

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
