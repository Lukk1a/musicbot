# apps/bot/Dockerfile
FROM node:22-bookworm-slim AS base

# Install system dependencies for audio decoding and native compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm directly
RUN npm install -g pnpm@11.22.0

WORKDIR /app

# Copy root monorepo files for dependency resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .pnpmfile.cjs ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bot/package.json ./apps/bot/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/bot ./apps/bot

# Build shared package and bot
RUN pnpm --filter "@musicbot/shared" run build
RUN pnpm --filter "@musicbot/bot" run build

# Create data directory for SQLite persistence
RUN mkdir -p /app/apps/bot/database

WORKDIR /app/apps/bot

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "build/main.js"]
