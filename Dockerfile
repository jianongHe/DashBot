FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM caddy:alpine

# 静态资源
COPY --from=build /app/dist /usr/share/caddy

# server.js 相关
COPY ./server /app/server

# Caddy 配置
COPY Caddyfile /etc/caddy/Caddyfile

# 安装 Node
RUN apk add --no-cache nodejs

EXPOSE 80 443

# 启动 Node 服务 和 Caddy
CMD node /app/server/server.js & caddy run --config /etc/caddy/Caddyfile
