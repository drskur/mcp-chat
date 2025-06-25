FROM node:23-slim

# Install necessary system dependencies including uv for uvx support
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install uv for uvx support
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock ./

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "start"]