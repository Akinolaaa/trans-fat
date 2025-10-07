# ---- Base Stage ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- Build Stage ----
FROM base AS build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN yarn prisma generate
RUN yarn build

# ---- Production Stage ----
FROM node:22-alpine AS production
WORKDIR /app

# Copy node_modules & dist from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma 
COPY package.json yarn.lock ./

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000
CMD ["node", "dist/index.js"]