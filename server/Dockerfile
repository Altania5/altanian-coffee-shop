# ============================================
# Altanian Coffee Backend - Dockerfile
# ============================================

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5002/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })" || exit 1

# Start the application
CMD ["npm", "start"]
