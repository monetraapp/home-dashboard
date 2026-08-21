# https://developers.home-assistant.io/docs/add-ons/configuration#add-on-dockerfile
#
# Build în două etape:
#   1. node  — compilează sursa Vite/React în asset-uri statice
#   2. baza HA + nginx — serveşte doar rezultatul; node nu ajunge în imaginea finală
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.23

# ----------------------------------------------------------------- 1. build
FROM node:22-alpine AS build

WORKDIR /build

# Instalăm dependenţele separat de restul surselor, ca stratul de npm ci
# să rămână în cache cât timp package-lock.json nu se schimbă.
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public

RUN npm run build

# --------------------------------------------------------------- 2. runtime
FROM ${BUILD_FROM}

RUN apk add --no-cache nginx

# Doar asset-urile compilate — fără node_modules, fără cod sursă.
COPY --from=build /build/dist /var/www

# Configul nginx şi serviciul s6
COPY rootfs /

LABEL \
  org.opencontainers.image.title="Home Assistant Add-on: Home Dashboard" \
  org.opencontainers.image.description="Dashboard propriu conectat live la Home Assistant prin WebSocket" \
  org.opencontainers.image.source="https://github.com/monetraapp/home-dashboard" \
  org.opencontainers.image.licenses="MIT"
