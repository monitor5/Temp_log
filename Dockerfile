FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --ignore-scripts
COPY client/ client/
COPY server/ server/
RUN npm run build

FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace=server

FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797
LABEL org.opencontainers.image.title="Temp-Log" \
      org.opencontainers.image.source="https://github.com/monitor5/Temp_log"
ENV NODE_ENV=production PORT=4000 CLIENT_DIR=/app/public UPLOAD_DIR=/data/uploads
WORKDIR /app/server
COPY --from=runtime-deps /app/node_modules /app/node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/client/dist /app/public
COPY --from=build /app/package.json /app/package.json
COPY docker/healthcheck.cjs /app/healthcheck.cjs
RUN mkdir -p /data/uploads && chown -R node:node /data && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER 1000:1000
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD ["node", "/app/healthcheck.cjs"]
CMD ["node", "dist/index.js"]
