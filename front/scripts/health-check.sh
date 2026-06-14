#!/bin/bash

# Health Check Script
# Verifies that the deployed application is healthy

set -e

# Configuration
URL=${1:-https://glassshop.com}
MAX_RETRIES=5
RETRY_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Health Check for $URL${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed."
    exit 1
fi

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local retry_count=0
    
    print_info "Checking $endpoint..."
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            print_success "$endpoint returned $response"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                print_warning "$endpoint returned $response. Retrying in $RETRY_DELAY seconds... ($retry_count/$MAX_RETRIES)"
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    print_error "$endpoint check failed after $MAX_RETRIES attempts"
    return 1
}

# Check main application
check_endpoint "$URL" 200

# Check health endpoint
check_endpoint "$URL/health" 200

# Check manifest
check_endpoint "$URL/manifest.json" 200

# Check service worker
check_endpoint "$URL/sw.js" 200

# Check if HTTPS is enforced
print_info "Checking HTTPS redirect..."
http_response=$(curl -s -o /dev/null -w "%{http_code}" -L "http://${URL#https://}" || echo "000")
if [ "$http_response" = "200" ]; then
    print_success "HTTP to HTTPS redirect working"
else
    print_warning "HTTP to HTTPS redirect may not be working properly"
fi

# Check security headers
print_info "Checking security headers..."
headers=$(curl -s -I "$URL")

check_header() {
    local header=$1
    if echo "$headers" | grep -qi "$header"; then
        print_success "$header header present"
    else
        print_warning "$header header missing"
    fi
}

check_header "X-Frame-Options"
check_header "X-Content-Type-Options"
check_header "X-XSS-Protection"
check_header "Strict-Transport-Security"
check_header "Content-Security-Policy"

# Check response time
print_info "Checking response time..."
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$URL")
response_time_ms=$(echo "$response_time * 1000" | bc)

if (( $(echo "$response_time < 2" | bc -l) )); then
    print_success "Response time: ${response_time_ms}ms (Good)"
elif (( $(echo "$response_time < 5" | bc -l) )); then
    print_warning "Response time: ${response_time_ms}ms (Acceptable)"
else
    print_error "Response time: ${response_time_ms}ms (Slow)"
fi

# Check if gzip compression is enabled
print_info "Checking compression..."
if curl -s -I -H "Accept-Encoding: gzip" "$URL" | grep -qi "Content-Encoding: gzip"; then
    print_success "Gzip compression enabled"
else
    print_warning "Gzip compression not detected"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Health check completed${NC}"
echo -e "${GREEN}========================================${NC}"

exit 0
