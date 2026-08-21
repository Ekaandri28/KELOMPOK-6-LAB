FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3006
CMD ["node", "--experimental-sqlite", "index.js"]
