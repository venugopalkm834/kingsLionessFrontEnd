
# Stage 1: Build Angular application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Angular source code
COPY . .

# Build Angular application
RUN npm run build

# Stage 2: Run with Nginx
FROM nginx:alpine

# Copy Angular build output
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
