# Build stage runs on the builder's native arch (dist/ is arch-independent),
# so multi-arch CI builds skip QEMU-emulated npm installs.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Optional bake-in for source builds. The published GHCR image leaves these
# unset and relies on runtime injection via docker/40-runtime-env.sh.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# The stock nginx entrypoint runs /docker-entrypoint.d/*.sh before starting;
# 40- sorts after the image's own 10/15/20/30 scripts.
COPY --chmod=755 docker/40-runtime-env.sh /docker-entrypoint.d/40-runtime-env.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
