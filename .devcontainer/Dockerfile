# Dev container image for HighScore.
#
# Based on the official VS Code TypeScript + Node image (Node 20 LTS, Debian
# Bookworm). The app's package.json targets Node 18 and the project requires
# Node >= 16, so Node 20 is a safe, supported upgrade from the EOL Node 16 the
# production Dockerfile still pins.
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Install the MongoDB shell (mongosh) so the database can be inspected from the
# dev container without leaving the workspace.
RUN curl -fsSL https://pgp.mongodb.com/server-7.0.asc \
      | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends mongodb-mongosh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
