FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Invalidate cache only when dependency lockfiles change
COPY package*.json ./

# Install exact lockfile dependencies
RUN npm ci

# Copy application and test assets
COPY . .

# Ensure artifact output folders exist and have write permissions
RUN mkdir -p .auth allure-results test-results && chmod -R 777 .auth allure-results test-results

CMD ["npx", "playwright", "test"]