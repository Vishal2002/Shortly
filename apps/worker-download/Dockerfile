FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

RUN yt-dlp --version

WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml package.json ./
COPY packages/database ./packages/database
COPY packages/types ./packages/types
COPY packages/queue ./packages/queue
COPY packages/config ./packages/config
COPY packages/storage ./packages/storage
COPY apps/worker-download ./apps/worker-download

RUN pnpm install --no-frozen-lockfile

RUN cd packages/database && pnpm run build
RUN cd packages/types && pnpm run build
RUN cd packages/queue && pnpm run build
RUN cd packages/storage && pnpm run build
RUN cd apps/worker-download && pnpm run build

WORKDIR /app/apps/worker-download

CMD ["node", "dist/index.js"]
