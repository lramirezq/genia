#!/bin/bash

# Script para desplegar frontend de Sistema GenIA
# Uso: ./deploy-frontend.sh [dev|staging|prod]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
ENVIRONMENT=${1:-dev}
STACK_NAME="sistema-genia-frontend-${ENVIRONMENT}"
REGION="us-east-1"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Sistema GenIA - Frontend Deployment${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Validar ambiente
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Environment must be dev, staging, or prod${NC}"
    exit 1
fi

# Paso 1: Desplegar infraestructura CloudFormation
echo -e "\n${YELLOW}[1/5] Desplegando infraestructura (S3 + CloudFront)...${NC}"
aws cloudformation deploy \
    --template-file frontend-infrastructure.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides Environment=${ENVIRONMENT} \
    --region ${REGION} \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Infraestructura desplegada${NC}"
else
    echo -e "${RED}✗ Error desplegando infraestructura${NC}"
    exit 1
fi

# Paso 2: Obtener outputs del stack
echo -e "\n${YELLOW}[2/5] Obteniendo información del stack...${NC}"
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

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
    --output text)

echo -e "${GREEN}✓ Bucket: ${BUCKET_NAME}${NC}"
echo -e "${GREEN}✓ Distribution: ${DISTRIBUTION_ID}${NC}"
echo -e "${GREEN}✓ URL: ${FRONTEND_URL}${NC}"

# Paso 3: Obtener configuración del backend
echo -e "\n${YELLOW}[3/5] Obteniendo configuración del backend...${NC}"
BACKEND_STACK="sistema-genia-${ENVIRONMENT}"

API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${BACKEND_STACK} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name ${BACKEND_STACK} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null || echo "")

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name ${BACKEND_STACK} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`ClientId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
    echo -e "${RED}✗ Error: No se pudo obtener configuración del backend${NC}"
    echo -e "${YELLOW}Asegúrate de que el stack ${BACKEND_STACK} esté desplegado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API URL: ${API_URL}${NC}"
echo -e "${GREEN}✓ User Pool: ${USER_POOL_ID}${NC}"
echo -e "${GREEN}✓ Client ID: ${CLIENT_ID}${NC}"

# Paso 4: Build del frontend
echo -e "\n${YELLOW}[4/5] Construyendo frontend...${NC}"
cd frontend

# Crear archivo de configuración
cat > src/config.js << EOF
export default {
  apiUrl: '${API_URL}',
  cognito: {
    userPoolId: '${USER_POOL_ID}',
    clientId: '${CLIENT_ID}'
  }
}
EOF

echo -e "${GREEN}✓ Configuración creada${NC}"

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    npm install
fi

# Build
echo -e "${YELLOW}Ejecutando build...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build completado${NC}"
else
    echo -e "${RED}✗ Error en build${NC}"
    exit 1
fi

# Paso 5: Subir a S3 y invalidar CloudFront
echo -e "\n${YELLOW}[5/5] Desplegando archivos a S3...${NC}"
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --region ${REGION}

# index.html sin cache
aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
    --cache-control "public, max-age=0, must-revalidate" \
    --region ${REGION}

echo -e "${GREEN}✓ Archivos subidos a S3${NC}"

# Invalidar cache de CloudFront
echo -e "\n${YELLOW}Invalidando cache de CloudFront...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}✓ Invalidación creada: ${INVALIDATION_ID}${NC}"

# Resumen final
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}Bucket: ${BUCKET_NAME}${NC}"
echo -e "${GREEN}Distribution: ${DISTRIBUTION_ID}${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Nota: La invalidación de CloudFront puede tomar 5-10 minutos${NC}"

cd ..
