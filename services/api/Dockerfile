FROM node:22.8.0-alpine3.20
LABEL maintainer="ezTeam <ezteam@couperin.org>"

EXPOSE 3000

ARG NODE_ENV production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

HEALTHCHECK --interval=1m --timeout=10s --retries=5 --start-period=20s \
  CMD wget -Y off --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD [ "npm", "start" ]