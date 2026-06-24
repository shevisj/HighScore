ARG NODE_VERSION=20.18.1

FROM node:${NODE_VERSION}-alpine as build
WORKDIR /opt

# Prevent mongodb-memory-server (a test-only dependency) from downloading a
# mongod binary while building the production image.
ENV MONGOMS_DISABLE_POSTINSTALL=1

COPY package.json package-lock.json tsconfig.json tsconfig.compile.json .barrelsby.json ./

RUN npm install

COPY ./config ./config
COPY ./src ./src
COPY ./public ./public
COPY ./views ./views

RUN npm run build

FROM node:${NODE_VERSION}-alpine as runtime
ENV WORKDIR /opt
WORKDIR $WORKDIR
ENV MONGOMS_DISABLE_POSTINSTALL=1

RUN apk update && apk add build-base git curl
RUN npm install -g pm2

COPY --from=build /opt .

RUN npm install

COPY processes.config.js .

EXPOSE 8081
ENV HIGHSCORE_PORT 8081
ENV NODE_ENV production

CMD ["pm2-runtime", "start", "processes.config.js", "--env", "production"]
