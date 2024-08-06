FROM node:lts-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000

CMD [ "node", "src/index.js" ]
