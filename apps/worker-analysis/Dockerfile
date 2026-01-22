# Use the same base as your download worker for consistency
FROM --platform=linux/arm64 node:20.19-alpine

# Install minimal system deps (if Prisma or anything needs them; usually not required here)
RUN apk update --no-cache && \
    apk add --no-cache \
        python3 \
        py3-pip \
        ffmpeg \
        ca-certificates \
        openssl \
        curl \
        wget \
        build-base \
        git \
        nodejs && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy monorepo config files first (for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/queue/package.json ./packages/queue/
COPY apps/worker-analysis/package.json ./apps/worker-analysis/

# Enable Corepack + prepare exact pnpm version (match your lockfile / local setup)
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate

# Install dependencies (frozen lock = reproducible)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/worker-analysis ./apps/worker-analysis

# Generate Prisma client
RUN cd packages/database && pnpm prisma generate

# Build shared packages (in dependency order)
RUN pnpm --filter @shortly/types build 2>/dev/null || true
RUN pnpm --filter @shortly/config build 2>/dev/null || true
RUN pnpm --filter @shortly/database build
RUN pnpm --filter @shortly/queue build

# Build the analysis worker
WORKDIR /app/apps/worker-analysis
RUN pnpm build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]