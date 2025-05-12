# Use Caddy as base image
FROM caddy:2-alpine

# Copy static assets
COPY ./dist /usr/share/caddy

# Copy Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port 80
EXPOSE 80

# Caddy will automatically start and serve the content 