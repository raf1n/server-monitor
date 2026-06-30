FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/ ./scripts/
COPY apps/ ./apps/
COPY packages/ ./packages/
RUN pnpm install
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_SOCKET_URL=
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ARG VITE_ENV=production
ENV VITE_ENV=$VITE_ENV
RUN pnpm --filter @server-monitor/frontend build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/frontend/dist ./dist
RUN npm install -g serve
EXPOSE 5173
CMD ["serve", "dist", "-p", "5173", "--no-clipboard", "--single"]
