# syntax=docker/dockerfile:1
# 三个运行目标：
#   web      —— Next.js standalone 产物（compose: web）
#   realtime —— Socket.IO 网关，直接以 tsx 运行 services/realtime（compose: realtime）
#   tools    —— 一次性数据库迁移、检查和站主绑定，不启动 Web

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="/pnpm:${PATH}"
RUN npm install -g pnpm@12.16.1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# NEXT_PUBLIC_* 在构建时内联进客户端产物，必须在 build 前传入。
ARG NEXT_PUBLIC_REALTIME_URL=""
ENV NEXT_PUBLIC_REALTIME_URL=${NEXT_PUBLIC_REALTIME_URL}
RUN pnpm build

# ---------- 运维工具（不依赖 Next 构建） ----------
FROM deps AS tools
ENV NODE_ENV=production
COPY tsconfig.json ./
COPY src ./src
COPY services ./services
COPY scripts ./scripts
COPY drizzle ./drizzle
CMD ["pnpm", "db:check"]

# ---------- Next.js Web 应用 ----------
FROM base AS web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

# ---------- Realtime 网关 ----------
# tsx 是 devDependency，运行期需要，因此复制完整 node_modules。
FROM base AS realtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY services ./services
EXPOSE 3101
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3101/healthz || exit 1
CMD ["node", "--import", "tsx", "services/realtime/main.ts"]
