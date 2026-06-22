# ============================================================================
# HYRO web (Next.js) — production image for self-hosting (VPS / Railway / Fly).
# On Vercel you do NOT need this — just set Root Directory = web.
#   docker build -t hyro-web web && docker run -p 3000:3000 hyro-web
# ============================================================================
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
# Next standalone output bundles the server + minimal node_modules.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
