FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY apps/admin-test/package.json ./apps/admin-test/
COPY apps/vendor/package.json ./apps/vendor/
COPY packages/core/package.json ./packages/core/
COPY packages/cli/package.json ./packages/cli/
COPY packages/client/package.json ./packages/client/
COPY packages/types/package.json ./packages/types/
COPY packages/dashboard-sdk/package.json ./packages/dashboard-sdk/
COPY packages/dashboard-shared/package.json ./packages/dashboard-shared/
COPY packages/admin/package.json ./packages/admin/
COPY packages/vendor/package.json ./packages/vendor/
COPY packages/registry/package.json ./packages/registry/
COPY packages/create-mercur-app/package.json ./packages/create-mercur-app/
COPY packages/docs/package.json ./packages/docs/
COPY packages/providers/payout-stripe-connect/package.json ./packages/providers/payout-stripe-connect/
COPY integration-tests/package.json ./integration-tests/
COPY templates/basic/package.json ./templates/basic/
COPY templates/plugin/package.json ./templates/plugin/
COPY templates/registry/package.json ./templates/registry/

RUN bun install --frozen-lockfile

COPY . .

FROM oven/bun:latest AS production

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

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-experimental-strip-types"

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://localhost:9000/health').then(r => {if (!r.ok) process.exit(1)}).catch(() => process.exit(1))"

CMD ["sh", "-c", "cd apps/api && bun run start"]
