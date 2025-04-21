# 用 caddy 官方 image
FROM caddy:2-alpine

# 将当前目录下的所有文件复制到 Caddy 的 web 根目录
COPY . /usr/share/caddy

# 可选：提供一个自定义 Caddyfile（如果你需要自定义路由的话）
COPY Caddyfile /etc/caddy/Caddyfile
