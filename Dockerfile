# ============================================================================
# HYRO Cloud API — production image
# Builds @hyro/core + @hyro/sdk + @hyro/api and runs the Fastify server.
# Works on Render, Railway, Fly.io, or any container host.
#   docker build -t hyro-api .
#   docker run -p 8080:8080 --env-file .env hyro-api
# ============================================================================

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install deps with good layer caching (manifests first).
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/sdk/package.json packages/sdk/
COPY packages/api/package.json packages/api/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp-base/package.json packages/mcp-base/
COPY web/package.json web/
RUN npm ci

# Copy sources and build only what the API needs.
COPY packages/core packages/core
COPY packages/sdk packages/sdk
COPY packages/api packages/api
COPY packages/mcp-base packages/mcp-base
RUN npm run build -w @hyro/core \
 && npm run build -w @hyro/sdk \
 && npm run build -w @hyro/mcp-base \
 && npm run build -w @hyro/api \
 && npm prune --omit=dev

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Workspace symlinks in node_modules point at packages/* — copy both.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/sdk/package.json ./packages/sdk/package.json
COPY --from=build /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=build /app/packages/api/package.json ./packages/api/package.json
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/migrations ./packages/api/migrations
COPY --from=build /app/packages/mcp-base/package.json ./packages/mcp-base/package.json
COPY --from=build /app/packages/mcp-base/dist ./packages/mcp-base/dist

# Run as the non-root node user.
USER node

EXPOSE 8080
# Platform may inject PORT; the server honors it (see config.ts).
CMD ["node", "packages/api/dist/server.js"]
