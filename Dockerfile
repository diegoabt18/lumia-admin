# =============================================================================
# Lumia Admin — imagen de producción (Nuxt 4 SPA + BFF Nitro, preset node-server)
# =============================================================================

# ---- build ------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: `nuxt prepare` se ejecuta en el build; evita scripts de instalación de terceros.
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .
RUN npx nuxt build

# ---- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3100

# .output es autocontenido: no necesita node_modules en tiempo de ejecución.
COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
