# Force arm64 platform
FROM --platform=linux/arm64 node:20.19-alpine

# Install system dependencies
# NOTE: We're installing nodejs separately even though base image has it
# because yt-dlp needs it available in PATH for JavaScript execution
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    ca-certificates \
    openssl \
    curl \
    wget \
    build-base \
    git \
    nodejs

# Update CA certificates (critical for SSL)
RUN update-ca-certificates

# Enable Corepack + PNPM
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate

# Install yt-dlp and configure for Node.js runtime
RUN wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Verify installations and set yt-dlp to use Node.js
RUN yt-dlp --version && \
    node --version && \
    echo "yt-dlp will use Node.js runtime"

WORKDIR /app

# Copy package files for dependency caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json* ./
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json* ./packages/types/
COPY packages/queue/package.json ./packages/queue/
COPY packages/storage/package.json ./packages/storage/
COPY packages/config/package.json* ./packages/config/
COPY apps/worker-download/package.json ./apps/worker-download/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/worker-download ./apps/worker-download

# Generate Prisma client
RUN cd packages/database && pnpm prisma generate

# Build packages
RUN pnpm --filter @shortly/types build 2>/dev/null || true
RUN pnpm --filter @shortly/config build 2>/dev/null || true
RUN pnpm --filter @shortly/database build
RUN pnpm --filter @shortly/queue build
RUN pnpm --filter @shortly/storage build

# Build worker
WORKDIR /app/apps/worker-download
RUN pnpm build

ENV NODE_ENV=production

# Create temp directory
RUN mkdir -p /tmp && chmod 1777 /tmp

CMD ["node", "dist/index.js"]