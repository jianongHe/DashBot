FROM node:alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM caddy:alpine
COPY --from=build /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
