FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
RUN npx esbuild --bundle --outfile=./dist/index.js --platform=node --target=node20 ./src/dev.ts

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist/index.js ./index.js
EXPOSE 3000
CMD ["node", "index.js"]
