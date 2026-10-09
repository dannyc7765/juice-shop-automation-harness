FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Dependency layer is cached until the lockfile changes
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npx", "playwright", "test"]
