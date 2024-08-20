FROM node:lts-slim
WORKDIR /app
COPY . .

# Web UI
RUN npm --prefix web-frontend install
RUN npm run web:build

# API
RUN npm install
EXPOSE 3000

# Run application
CMD [ "node", "src/index.mjs" ]
