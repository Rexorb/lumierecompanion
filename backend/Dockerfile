# syntax=docker/dockerfile:1

# Node 24 atende aos engines do Prisma 7.10.1 (^20.19 || ^22.12 || >=24.0).
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-bookworm-slim AS base

WORKDIR /app

# OpenSSL é exigido pelos engines do Prisma; ca-certificates mantém o fetch HTTPS.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Dependências completas (inclui dev) para compilar o NestJS.
# ---------------------------------------------------------------------------
FROM base AS deps
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Build: gera o Prisma Client e compila. Mantém as dependências completas para
# o alvo "migrate" (CLI do Prisma disponível para migrate deploy).
# ---------------------------------------------------------------------------
FROM deps AS build
ENV NODE_ENV=development

COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Explícito: não depende do postinstall do Prisma nem de um banco disponível.
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# Dependências estritamente de runtime. A CLI do Prisma fica fora da imagem de
# execução; migrations usam o alvo "migrate" separado.
# ---------------------------------------------------------------------------
FROM build AS prod-deps
ENV NODE_ENV=production
RUN npm prune --omit=dev \
    && npm uninstall --no-save prisma

# ---------------------------------------------------------------------------
# Runtime: somente dependências de produção, build e artefatos do Prisma.
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 3001

# Caminho real confirmado do build: dist/src/main.js (prisma.config.ts na raiz
# desloca a saída do tsc, portanto dist/main.js não existe).
CMD ["node", "dist/src/main.js"]

# ---------------------------------------------------------------------------
# Ferramenta de migrations (não é iniciada pelo Compose demo).
# Uso previsto na P3, após autorização:
#   docker build --target migrate -t lumiere-companion-demo-migrate ./backend
#   docker run --rm --env-file .env.demo -e DATABASE_URL=... lumiere-companion-demo-migrate
# ---------------------------------------------------------------------------
FROM build AS migrate
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]
