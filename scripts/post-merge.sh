#!/bin/bash
set -e

echo "Running post-merge setup..."

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Pushing DB schema..."
cd lib/db && DATABASE_URL="$DATABASE_URL" pnpm drizzle-kit push --force
cd ../..

echo "Post-merge setup complete."
