FROM node:20-slim
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY . .

# Docker内ではlocalhost:9000をhost.docker.internalに書き換え
RUN sed -i "s|http://localhost:9000|http://host.docker.internal:9000|g" .env.development

EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host"]
