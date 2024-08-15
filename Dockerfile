FROM node:lts-slim
WORKDIR /app
COPY . .

# Web UI
RUN npm --prefix web-frontend install
ENV API_URL=http://localhost:3000/api
RUN npm run web:build
EXPOSE 4321

# API
RUN npm install
EXPOSE 3000

# Run both API and Web UI
CMD ./run.sh
