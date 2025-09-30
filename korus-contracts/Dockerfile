# Dockerfile for building Solana programs
FROM projectserum/build:v0.27.0

# Install Anchor CLI version that matches our project
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked

# Set working directory
WORKDIR /workspace

# Copy the project
COPY . .

# Build command will be run when container starts
CMD ["anchor", "build"]