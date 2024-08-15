FROM node:lts-slim
WORKDIR /app
COPY . .
RUN npm --prefix web-frontend install
RUN export API_URL=http://localhost:3000/api && npm --prefix web-frontend run build
RUN npm install
EXPOSE 3000

CMD ./run.sh