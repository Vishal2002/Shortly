# Shortly

YouTube Shorts automation platform - Turn long videos into viral Shorts automatically.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Setup

\`\`\`bash
# Install dependencies
pnpm install

# Start local services (PostgreSQL, Redis, MinIO)
pnpm docker:up

# Setup database
pnpm db:push
pnpm db:seed

# Build packages
turbo run build

# Start development
pnpm dev
\`\`\`

### Available Commands

\`\`\`bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm test             # Run tests
pnpm lint             # Lint code
pnpm format           # Format code

pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes

pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
pnpm docker:logs      # View Docker logs
\`\`\`

### Local Services

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Redis Commander: http://localhost:8081
- MinIO Console: http://localhost:9001

### Project Structure

\`\`\`
shortflow/
├── apps/                    # Applications
│   ├── api/                # NestJS API
│   ├── web/                # Next.js frontend
│   └── worker-*/           # Worker services
├── packages/               # Shared packages
│   ├── database/           # Prisma
│   ├── types/              # TypeScript types
│   ├── logger/             # Winston logger
│   └── config/             # Shared configs
└── infrastructure/         # Infrastructure
    ├── docker/             # Docker configs
    └── terraform/          # IaC
\`\`\`

## Next Steps

Ready to build the API? See [docs/api-setup.md](docs/api-setup.md)
