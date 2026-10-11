FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Vite mode selects the .env file: production (.env.production) or development (local PocketBase).
# VITE_VIEWER_DOMAIN, when given, overrides the .env value (e.g. the local viewer container).
ARG BUILD_MODE=production
ARG VITE_VIEWER_DOMAIN
RUN if [ -z "$VITE_VIEWER_DOMAIN" ]; then unset VITE_VIEWER_DOMAIN; fi \
  && npm run build -- --mode "$BUILD_MODE"

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
