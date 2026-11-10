###################
# BUILD FOR LOCAL DEVELOPMENT
###################
FROM node:22-slim AS development

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

USER node

###################
# BUILD FOR PRODUCTION
###################
FROM node:22-slim AS build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

RUN npm run build

RUN npm ci --omit=dev && npm cache clean --force

USER node

###################
# PRODUCTION
###################
FROM node:22-slim AS production

WORKDIR /usr/src/app

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

ENV NODE_ENV production

EXPOSE 3001

CMD [ "node", "dist/main.js" ]
