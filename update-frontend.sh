#!/bin/bash

# Script para actualizar solo el código del frontend (sin infraestructura)
# Uso: ./update-frontend.sh [dev|staging|prod]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT=${1:-dev}
STACK_NAME="sistema-genia-frontend-${ENVIRONMENT}"
REGION="us-east-1"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Sistema GenIA - Frontend Update${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Obtener bucket y distribution
echo -e "\n${YELLOW}[1/3] Obteniendo configuración...${NC}"
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${RED}✗ Error: Stack no encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Bucket: ${BUCKET_NAME}${NC}"
echo -e "${GREEN}✓ Distribution: ${DISTRIBUTION_ID}${NC}"

# Build
echo -e "\n${YELLOW}[2/3] Construyendo frontend...${NC}"
cd frontend
npm run build
echo -e "${GREEN}✓ Build completado${NC}"

# Deploy
echo -e "\n${YELLOW}[3/3] Desplegando a S3...${NC}"
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --region ${REGION}

aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
    --cache-control "public, max-age=0, must-revalidate" \
    --region ${REGION}

echo -e "${GREEN}✓ Archivos actualizados${NC}"

# Invalidar CloudFront
echo -e "\n${YELLOW}Invalidando CloudFront...${NC}"
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ ACTUALIZACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"

cd ..
