# ============================================================
# Stage 1: TypeScript MCP Server Build
# ============================================================
FROM node:22-alpine AS ts-builder
WORKDIR /build
COPY mcp-server-ts/package*.json ./
RUN npm ci
COPY mcp-server-ts/tsconfig.json ./
COPY mcp-server-ts/src/ ./src/
RUN npm run build
RUN npm prune --production

# ============================================================
# Stage 2: Main Python Image
# ============================================================
# Base image pinned by digest — tags are mutable, digests aren't. Re-resolve
# with: docker buildx imagetools inspect python:3.12-slim-bookworm --format '{{.Manifest.Digest}}'
FROM python:3.12-slim-bookworm@sha256:d50fb7611f86d04a3b0471b46d7557818d88983fc3136726336b2a4c657aa30b

# MCP Registry ownership label
LABEL io.modelcontextprotocol.server.name="io.github.ulbi/stealthy-auto-browse"

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Timezone - override with -e TZ=Your/Timezone
ENV TZ=UTC

# Install tzdata for proper timezone support
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Base utils
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl gnupg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# X11 and display
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb xauth dbus dbus-x11 x11-xserver-utils xcvt \
    && rm -rf /var/lib/apt/lists/*

# VNC
RUN apt-get update && apt-get install -y --no-install-recommends \
    x11vnc novnc websockify \
    && rm -rf /var/lib/apt/lists/*

# Window manager (title bars + resize handles for popup windows)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openbox \
    && rm -rf /var/lib/apt/lists/*

# noVNC auto-connect redirect
RUN echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=vnc.html?autoconnect=true&resize=scale"></head></html>' > /usr/share/novnc/index.html

# Firefox/Camoufox dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends firefox-esr fonts-liberation \
    && apt-get remove -y --purge firefox-esr \
    && rm -rf /var/lib/apt/lists/*

# UI automation tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    xdotool scrot python3-tk python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Screen recording (ffmpeg x11grab + libx264)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for TS MCP server
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages (system-level, needs root).
RUN pip install --no-cache-dir \
    "camoufox[geoip]==0.4.11" \
    "playwright==1.53.0" \
    pyautogui fastapi uvicorn fastmcp Pillow pyyaml "redis[hiredis]"

# Create non-root user and directories
RUN groupadd -g 1000 browser && useradd -u 1000 -g 1000 -m browser
RUN mkdir -p /app /userdata /loaders /recordings && chown -R browser:browser /app /userdata /loaders /recordings

# Allow browser user to write GeoIP db into camoufox package dir
RUN chown -R browser:browser /usr/local/lib/python3.12/site-packages/camoufox/

# Switch to non-root user for camoufox fetch + extensions
USER browser

# Download Camoufox browser
RUN python -m camoufox fetch

# Copy scripts and install extensions
COPY --chown=browser:browser scripts/ /scripts/
RUN python /scripts/install_extensions.py

# Copy app
COPY --chown=browser:browser app/ /app/

# Copy TypeScript MCP server build
COPY --chown=browser:browser mcp-server-ts/ /app/mcp-server-ts/
COPY --from=ts-builder /build/dist /app/mcp-server-ts/dist
COPY --from=ts-builder /build/node_modules /app/mcp-server-ts/node_modules

# Set working directory
WORKDIR /app

# Install gosu for privilege dropping in entrypoint
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Copy entrypoint (runs as root, drops to target user)
COPY --chmod=755 entrypoint.sh /entrypoint.sh

# Environment variables
ENV XVFB_RESOLUTION=1920x1080
ENV XVFB_DEPTH=24
ENV TS_MCP_PORT=8081

# Expose ports
EXPOSE 5900 8080 8081

ENTRYPOINT ["/entrypoint.sh"]
