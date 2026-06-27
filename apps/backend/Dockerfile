FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/ ./apps/backend/
COPY apps/agent/ ./apps/agent/
COPY packages/ ./packages/
RUN pnpm install
RUN pnpm --filter @server-monitor/shared build
RUN pnpm --filter @server-monitor/agent bundle
RUN pnpm --filter @server-monitor/backend build
RUN pnpm deploy --filter @server-monitor/backend /app/deploy

FROM node:22-alpine AS prod
WORKDIR /app
COPY --from=builder /app/deploy ./
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/packages/shared/dist ./node_modules/@server-monitor/shared/dist
COPY --from=builder /app/apps/agent/dist ./agent-dist
ENV AGENT_DIST_DIR=/app/agent-dist
EXPOSE 3000
CMD ["node", "dist/main"]
