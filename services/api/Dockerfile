FROM node:node:22.4
LABEL maintainer="ezTeam <ezteam@couperin.org>"

EXPOSE 3000

ENV NODE_ENV production

ARG TIMEZONE
ARG REDIS_HOST
ARG REDIS_PORT
ARG REDIS_PASSWORD
ARG ELASTIC_NODES
ARG ELASTIC_USERNAME
ARG ELASTIC_PASSWORD
ARG ELASTIC_APIKEY
ARG ELASTIC_REQUIRED_STATUS
ARG ADMIN_APIKEY

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

HEALTHCHECK --interval=1m --timeout=10s --retries=5 --start-period=20s \
  CMD wget -Y off --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD [ "npm", "start" ]