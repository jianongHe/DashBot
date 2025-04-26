FROM node:18-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM caddy:alpine

# 静态资源
COPY --from=build /app/dist /usr/share/caddy

# server 代码和依赖
COPY ./server /app/server

# Caddy 配置
COPY Caddyfile /etc/caddy/Caddyfile

# 安装 Node & npm
RUN apk add --no-cache nodejs npm

# 安装 server 依赖
WORKDIR /app/server
RUN npm install --production

EXPOSE 80 443

CMD node /app/server/server.js & caddy run --config /etc/caddy/Caddyfile