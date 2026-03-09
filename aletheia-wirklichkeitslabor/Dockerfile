FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.mjs ./
COPY app.js ./
COPY styles.css ./
COPY index.html ./
COPY assets ./assets

ENV HOST=0.0.0.0
ENV PORT=8787

EXPOSE 8787

CMD ["npm", "start"]
