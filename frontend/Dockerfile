FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Be resilient to slow / flaky networks when fetching from the npm registry
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000
RUN npm install

COPY . .

EXPOSE 8010

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8010"]
