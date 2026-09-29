FROM ghost:6.65.0-alpine@sha256:fea3264f902e656833a84656ac6e81a6ef644f87aa0940aa636d4300de62196e
# Runtime needs Node and Ghost, not installers, package managers, or root switching.
# pnpm uses hardlinks into node_modules; its download store can be discarded.
RUN rm -rf /usr/local/lib/ghost-cli /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack /var/lib/ghost/.pnpm-store \
    /usr/local/bin/ghost /usr/local/bin/gosu /usr/local/bin/npm \
    /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
LABEL org.opencontainers.image.title="Temp_log" \
      org.opencontainers.image.source="https://github.com/monitor5/Temp_log" \
      org.opencontainers.image.description="Personal Ghost blog with a minimal original theme"
COPY --chown=node:node theme/ /opt/temp-log/theme/
COPY --chmod=755 docker/start.sh /usr/local/bin/temp-log-start
USER 1000:1000
ENTRYPOINT ["temp-log-start"]
CMD ["node", "current/index.js"]
