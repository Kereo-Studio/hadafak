# Build stage
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=build /usr/src/app/dist ./dist

# Create uploads directory (since it is referenced in main.ts)
RUN mkdir -p uploads && chown -R node:node /usr/src/app

USER node

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main"]
