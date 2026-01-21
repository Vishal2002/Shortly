FROM node:20-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify installation
RUN yt-dlp --version

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all packages (needed for workspace dependencies)
COPY packages ./packages
COPY apps/worker-download ./apps/worker-download

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages first
RUN cd packages/database && pnpm run build
RUN cd packages/types && pnpm run build
RUN cd packages/queue && pnpm run build

# Build worker
RUN cd apps/worker-download && pnpm run build

WORKDIR /app/apps/worker-download

CMD ["node", "dist/index.js"]