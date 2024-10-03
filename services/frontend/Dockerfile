FROM node:22.8.0-alpine3.20 as build

LABEL maintainer="ezTeam <ezteam@couperin.org>"

ARG NODE_ENV production

ENV NUXT_PUBLIC_ENVIRONMENT=${NUXT_PUBLIC_ENVIRONMENT} \
    NUXT_PUBLIC_ELASTIC_ENV=${NUXT_PUBLIC_ELASTIC_ENV} \
    NUXT_PUBLIC_VERSION=${NUXT_PUBLIC_VERSION} \
    NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22.8.0-alpine3.20
EXPOSE 3000
ENV NODE_ENV production
COPY --from=build /usr/src/app/.output /usr/src/app

HEALTHCHECK --interval=1m --timeout=10s --retries=5 --start-period=20s \
  CMD wget -Y off --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD [ "node", "/usr/src/app/server/index.mjs" ]