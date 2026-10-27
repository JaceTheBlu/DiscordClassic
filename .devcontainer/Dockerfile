FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Vencord ref to build against. Rebuild the container to pick up upstream changes.
ARG VENCORD_REF=main

# Drop the image's global pnpm so corepack uses the version pinned in Vencord's packageManager field.
RUN su node -c "npm uninstall -g pnpm" && corepack enable

USER node
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN git clone --depth 1 --branch "${VENCORD_REF}" https://github.com/Vendicated/Vencord /home/node/Vencord \
    && cd /home/node/Vencord \
    && pnpm install --frozen-lockfile
