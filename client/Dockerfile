
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN yarn build


FROM node:20-alpine AS runner

RUN yarn global add serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000


CMD ["serve", "-s", "dist", "-l", "3000"]
