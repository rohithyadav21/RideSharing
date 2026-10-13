# Use official Node.js runtime (LTS)
FROM node:24-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy project files
COPY . .

# Seed initial database
RUN npm run seed

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
