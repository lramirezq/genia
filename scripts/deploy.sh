#!/bin/bash

set -e

echo "🚀 Deploying Sistema GenIA..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check SAM CLI
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI not found. Please install it first."
    exit 1
fi

# Navigate to backend
cd "$(dirname "$0")/../backend"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building SAM application..."
sam build

echo "🚀 Deploying to AWS..."
sam deploy --guided

echo "✅ Deployment completed!"

# Get outputs
echo "📋 Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name sistema-genia-dev \
    --query 'Stacks[0].Outputs' \
    --output table

echo "🎉 Sistema GenIA deployed successfully!"