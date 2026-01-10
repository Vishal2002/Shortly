#!/bin/bash

echo "🔍 Verifying Shorty setup..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
  echo "❌ Docker is not running"
  exit 1
fi

# Check PostgreSQL
if docker ps | grep -q shortly-postgres; then
  echo "✅ PostgreSQL is running"
else
  echo "❌ PostgreSQL is not running"
  exit 1
fi

# Check Redis
if docker ps | grep -q shortly-redis; then
  echo "✅ Redis is running"
else
  echo "❌ Redis is not running"
  exit 1
fi

# Check MinIO
if docker ps | grep -q shortly-minio; then
  echo "✅ MinIO is running"
else
  echo "❌ MinIO is not running"
  exit 1
fi

# Check if packages are built
if [ -d "packages/types/dist" ]; then
  echo "✅ Types package built"
else
  echo "❌ Types package not built"
  exit 1
fi

if [ -d "packages/logger/dist" ]; then
  echo "✅ Logger package built"
else
  echo "❌ Logger package not built"
  exit 1
fi

echo ""
echo "🎉 Setup verified successfully!"
echo ""
echo "Next steps:"
echo "1. Open Prisma Studio: pnpm db:studio"
echo "2. View logs: pnpm docker:logs"
echo "3. Access services:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis Commander: http://localhost:8081"
echo "   - MinIO Console: http://localhost:9001"
