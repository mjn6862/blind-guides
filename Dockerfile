# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/game-engine/package.json packages/game-engine/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/

RUN npm ci

COPY packages/ packages/
COPY apps/ apps/

RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json /app/
COPY packages/shared/package.json /app/packages/shared/
COPY packages/game-engine/package.json /app/packages/game-engine/
COPY apps/server/package.json ./

RUN cd /app && npm ci --omit=dev --workspace=@blind-guides/server

COPY --from=build /app/packages/shared/dist /app/packages/shared/dist
COPY --from=build /app/packages/game-engine/dist /app/packages/game-engine/dist
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/web/dist /app/apps/web/dist

EXPOSE 3001

# Persist game state on a mounted volume at /data
ENV STATIC_DIR=/app/apps/web/dist
VOLUME ["/app/apps/server/data"]

CMD ["node", "dist/index.js"]
