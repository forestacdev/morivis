FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
RUN npx esbuild --bundle --outfile=./dist/index.js --platform=node --target=node20 \
    --external:playwright --external:playwright-core ./src/dev.ts

FROM node:20-slim
WORKDIR /app

# Playwright Chromium の依存ライブラリ
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libcups2 libdbus-1-3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist/index.js ./index.js
COPY --from=build /app/node_modules ./node_modules

# Chromium ブラウザをインストール
RUN npx playwright install chromium

EXPOSE 3000
CMD ["node", "index.js"]
