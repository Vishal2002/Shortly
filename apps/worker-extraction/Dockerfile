# Use the same base as your other workers
FROM --platform=linux/arm64 node:20.19-alpine

# Install system dependencies
# FFmpeg is critical for this worker!
RUN apk add --no-cache \
    python3 \
    ffmpeg \
    ca-certificates \
    openssl \
    curl \
    wget \
    build-base \
    git \
    nodejs \
    fontconfig \
    ttf-dejavu \
    font-noto \
    font-noto-emoji \
    font-noto-extra \
    font-liberation \
    font-inconsolata \
    msttcorefonts-installer

# Or create a fonts cache
RUN fc-cache -f -v

# Update CA certificates
RUN update-ca-certificates

# Enable Corepack + PNPM
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate

# Verify FFmpeg installation
RUN ffmpeg -version && \
    node --version && \
    echo "FFmpeg ready for clip extraction"

WORKDIR /app

# Copy package files for dependency caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json* ./
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json* ./packages/types/
COPY packages/queue/package.json ./packages/queue/
COPY packages/storage/package.json ./packages/storage/
COPY packages/config/package.json* ./packages/config/
COPY apps/worker-extraction/package.json ./apps/worker-extraction/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/worker-extraction ./apps/worker-extraction

# Generate Prisma client
RUN cd packages/database && pnpm prisma generate

# Build packages
RUN pnpm --filter @shortly/types build 2>/dev/null || true
RUN pnpm --filter @shortly/config build 2>/dev/null || true
RUN pnpm --filter @shortly/database build
RUN pnpm --filter @shortly/queue build
RUN pnpm --filter @shortly/storage build

# Build worker
WORKDIR /app/apps/worker-extraction
RUN pnpm build

ENV NODE_ENV=production

# Create temp directory for processing
RUN mkdir -p /tmp && chmod 1777 /tmp

CMD ["node", "dist/index.js"]