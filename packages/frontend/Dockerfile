FROM node:23-slim

# Install necessary system dependencies including uv for uvx support
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for uvx support
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml* ./

RUN npm i -g pnpm@latest

# Install dependencies and rebuild native modules
RUN pnpm install --no-frozen-lockfile && \
    pnpm rebuild lightningcss

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "start"]