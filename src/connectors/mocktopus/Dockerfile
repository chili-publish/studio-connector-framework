FROM node:22-alpine
RUN npm install -g @chili-publish/connector-cli
WORKDIR /connector
COPY package.json .
RUN npm install
