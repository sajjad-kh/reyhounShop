#!/bin/bash

# GlassShop Deployment Script
# This script automates the deployment process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BUILD_DIR="dist"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GlassShop Deployment Script${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_info "Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

print_info "npm version: $(npm -v)"

# Install dependencies
print_info "Installing dependencies..."
npm ci

# Run type checking
print_info "Running type checking..."
if ! npm run typecheck; then
    print_error "Type checking failed. Please fix TypeScript errors."
    exit 1
fi

# Run linting
print_info "Running linting..."
if ! npm run lint; then
    print_error "Linting failed. Please fix linting errors."
    exit 1
fi

# Build for the specified environment
print_info "Building for $ENVIRONMENT..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build:production
elif [ "$ENVIRONMENT" = "staging" ]; then
    npm run build:staging
else
    print_error "Invalid environment: $ENVIRONMENT. Use 'production' or 'staging'."
    exit 1
fi

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed. $BUILD_DIR directory not found."
    exit 1
fi

print_info "Build completed successfully!"

# Display build statistics
print_info "Build statistics:"
du -sh $BUILD_DIR
find $BUILD_DIR -type f -name "*.js" -exec du -ch {} + | grep total
find $BUILD_DIR -type f -name "*.css" -exec du -ch {} + | grep total

# Optional: Deploy to server
if [ "$2" = "--deploy" ]; then
    print_info "Deploying to $ENVIRONMENT..."
    
    # Example deployment commands (customize based on your deployment method)
    
    # For AWS S3
    # aws s3 sync $BUILD_DIR/ s3://your-bucket-name/ --delete
    # aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
    
    # For Vercel
    # vercel --prod
    
    # For Netlify
    # netlify deploy --prod --dir=$BUILD_DIR
    
    # For traditional server (rsync)
    # rsync -avz --delete $BUILD_DIR/ user@server:/var/www/glassshop/
    
    print_warning "Deployment commands are commented out. Please configure your deployment method."
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment preparation completed!${NC}"
echo -e "${GREEN}========================================${NC}"

# Display next steps
print_info "Next steps:"
echo "  1. Review the build in the $BUILD_DIR directory"
echo "  2. Test the build locally: npm run preview:$ENVIRONMENT"
echo "  3. Deploy to $ENVIRONMENT environment"
echo "  4. Run smoke tests"
echo "  5. Monitor application health"

exit 0
