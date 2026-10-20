# Base image with Node.js and Debian Bookworm (for Python 3.11+)
FROM node:20-bookworm-slim

# Install Python 3, pip, venv, and OpenCV system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create virtual environment and install Python packages
COPY requirements.txt ./
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Build Next.js project
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production runtime configuration
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
