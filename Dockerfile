FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server/default-content.json ./server/default-content.json
COPY public ./public
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=127.0.0.1 PORT=3180 DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server/index.mjs server/service.mjs server/default-content.json ./server/
COPY --chown=node:node scripts/setup.mjs ./scripts/setup.mjs
COPY --chown=node:node public/stickers ./public/stickers
COPY --chown=node:node package.json ./package.json
RUN mkdir /app/data && chown node:node /app/data && chmod 700 /app/data
USER node
CMD ["node", "server/index.mjs"]
