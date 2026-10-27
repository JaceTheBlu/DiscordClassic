# .devcontainer

Back to [CLAUDE.md](../CLAUDE.md).

Dev container for building, linting and typechecking the plugin inside a real Vencord tree.

- `Dockerfile`: Node 22 image, clones Vencord (`VENCORD_REF`, default `main`) into `/home/node/Vencord` and runs `pnpm install`.
- `devcontainer.json`: mounts this repo at `/home/node/Vencord/src/userplugins/DiscordClassic`. Mounting (not symlinking) matters: esbuild and tsc resolve the `@api`/`@utils` aliases from the real file path, which must be inside Vencord.

Commands run from `/home/node/Vencord` (see README). Injecting into Discord is not possible from the container: it stays on the host.
