# Production image for ultim-portal (static SPA: Next export -> out/ -> nginx).
# NEXT_PUBLIC_API_URL is baked into the bundle at build time — rebuild to change it.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL=https://api.ultim.local
ARG NEXT_PUBLIC_SCANNER_URL=https://facility-pass-pro.vercel.app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SCANNER_URL=$NEXT_PUBLIC_SCANNER_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/out /usr/share/nginx/html
# SPA fallback: query-param routes (/app/members/view?id=..) are static files,
# trailingSlash:true emits index.html per route — try_files covers refreshes.
RUN printf 'server {\n\
  listen 3000;\n\
  root /usr/share/nginx/html;\n\
  location / { try_files $uri $uri/ $uri.html /index.html; }\n\
  location /api/health { access_log off; return 200 "{\\"status\\":\\"ok\\"}"; add_header Content-Type application/json; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health | grep -q ok || exit 1
