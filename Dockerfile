FROM node:22-alpine AS base

# Install build dependencies for native modules if required
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies first (leverage Docker caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client (uses relative imports to src/generated/prisma)
RUN npx prisma generate

# Expose Next.js default port
EXPOSE 3000

# Next.js dev server port is 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Default command for development
CMD ["npm", "run", "dev"]
