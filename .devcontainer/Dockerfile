FROM node:20

ARG TZ
ENV TZ="$TZ"

# Base tools, firewall tooling (needed by init-firewall.sh),
# and python3 with age for encryption.
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  man-db \
  unzip \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  jq \
  curl \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

# /usr/local/lib/node_modules (npm's default global prefix) is root-owned in
# this base image. Point global installs at a folder the node user actually
# owns instead of installing as root.
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share/npm-global
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

WORKDIR /workspace

USER node

# Install Claude Code directly via npm (rather than the devcontainer feature)
# so it doesn't silently overwrite the custom init-firewall.sh below.
RUN npm install -g @anthropic-ai/claude-code

# Copy and set up the firewall script. It needs to run as root, so give the
# node user passwordless sudo for just this one command.
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node
