# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/admin-test/package.json ./apps/admin-test/
COPY apps/vendor/package.json ./apps/vendor/
COPY packages/core/package.json ./packages/core/
COPY packages/cli/package.json ./packages/cli/
COPY packages/client/package.json ./packages/client/
COPY packages/types/package.json ./packages/types/
COPY packages/dashboard-sdk/package.json ./packages/dashboard-sdk/
COPY packages/dashboard-shared/package.json ./packages/dashboard-shared/
COPY packages/registry/package.json ./packages/registry/
COPY packages/admin/package.json ./packages/admin/
COPY packages/vendor/package.json ./packages/vendor/
COPY packages/create-mercur-app/package.json ./packages/create-mercur-app/
COPY packages/docs/package.json ./packages/docs/
COPY packages/providers/payout-stripe-connect/package.json ./packages/providers/payout-stripe-connect/
COPY integration-tests/package.json ./integration-tests/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build all packages
RUN bun run build --filter=@mercurjs/core --filter=@mercurjs/cli --filter=@mercurjs/client --filter=@mercurjs/dashboard-sdk --filter=@mercurjs/dashboard-shared

# Production stage
FROM oven/bun:1 AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/turbo.json ./

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 9000

# Healthcheck
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Start command
CMD ["bun", "run", "start"]
