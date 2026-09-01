FROM node:20-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto

# Alpine's chromium package installs the binary at /usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /bot
COPY src/package.json .
RUN npm install --production
COPY src/ .

EXPOSE 4000
CMD ["node", "bot.js"]
