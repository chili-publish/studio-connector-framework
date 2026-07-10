FROM node:20-alpine
RUN npm install -g @chili-publish/connector-cli
WORKDIR /connector
COPY package.json .
RUN npm install
