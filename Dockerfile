FROM node:20-bookworm-slim AS builder

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json bun.lock* turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/
COPY packages/cli/package.json ./packages/cli/
COPY packages/client/package.json ./packages/client/
COPY packages/types/package.json ./packages/types/
COPY packages/dashboard-sdk/package.json ./packages/dashboard-sdk/
COPY packages/dashboard-shared/package.json ./packages/dashboard-shared/
COPY packages/providers/payout-stripe-connect/package.json ./packages/providers/payout-stripe-connect/

RUN bun install --frozen-lockfile

COPY . .

RUN cd apps/api && bun run build

FROM node:20-bookworm-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/cli ./packages/cli
COPY --from=builder /app/packages/client ./packages/client
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/dashboard-sdk ./packages/dashboard-sdk
COPY --from=builder /app/packages/dashboard-shared ./packages/dashboard-shared
COPY --from=builder /app/packages/providers ./packages/providers
COPY --from=builder /app/package.json ./
COPY --from=builder /app/turbo.json ./

ENV NODE_ENV=production

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

CMD ["sh", "-c", "cd apps/api && bun run seed && bun run start"]
