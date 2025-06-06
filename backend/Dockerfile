FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Clean npm cache and install dependencies
RUN npm cache clean --force && \
    npm install --production --no-optional

# Install puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy source code
COPY . .

# Create uploads and logs directories
RUN mkdir -p uploads/receipts uploads/invoice_pdfs logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

CMD ["npm", "start"]