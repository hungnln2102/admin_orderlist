#!/bin/bash

USER=$1
HOST=$2
DIR=$3

if [ -z "$USER" ] || [ -z "$HOST" ] || [ -z "$DIR" ]; then
  echo "Usage: ./deploy.sh <user> <host> <remote_dir>"
  echo "Example: ./deploy.sh root 123.45.67.89 /var/www/my-app"
  exit 1
fi

echo "Detailed steps:"
echo "1. Creating remote directory..."
ssh $USER@$HOST "mkdir -p $DIR"

echo "2. Copying files (this might take a while)..."
# Using tar to compress and transfer might be faster, but scp is simpler for now.
# Exclude node_modules, .git, .tmp
scp -r README.md docker-compose.yml $USER@$HOST:$DIR/
scp -r database $USER@$HOST:$DIR/

# Backend
echo "   Copying backend..."
ssh $USER@$HOST "mkdir -p $DIR/backend"
scp backend/package.json backend/package-lock.json backend/Dockerfile $USER@$HOST:$DIR/backend/
scp -r backend/src backend/config backend/middleware backend/routes backend/schema backend/image $USER@$HOST:$DIR/backend/
# Copy root backend files
scp backend/*.js backend/*.json $USER@$HOST:$DIR/backend/ 2>/dev/null
# Note: ignoring errors if some files don't exist

# Frontend
echo "   Copying frontend..."
ssh $USER@$HOST "mkdir -p $DIR/frontend"
scp frontend/package.json frontend/package-lock.json frontend/Dockerfile* frontend/vite.config.ts $USER@$HOST:$DIR/frontend/
scp -r frontend/src frontend/public $USER@$HOST:$DIR/frontend/ 2>/dev/null
scp frontend/*.js frontend/*.ts frontend/*.json frontend/*.html $USER@$HOST:$DIR/frontend/ 2>/dev/null

echo "3. Starting Docker containers..."
ssh $USER@$HOST "cd $DIR && docker-compose up -d --build"

echo "Deployment finished!"
echo "Check services at http://$HOST"
