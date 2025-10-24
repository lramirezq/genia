#!/bin/bash

# Script para crear usuario administrador
# Uso: ./create-admin.sh email@example.com Password123!

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ADMIN_EMAIL=$1
ADMIN_PASSWORD=$2
ENVIRONMENT=${3:-dev}
REGION="us-east-1"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}Uso: ./create-admin.sh email@example.com Password123! [environment]${NC}"
    exit 1
fi

echo -e "${GREEN}Creando usuario administrador...${NC}"
echo -e "Email: ${ADMIN_EMAIL}"
echo -e "Environment: ${ENVIRONMENT}"

# Obtener User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name sistema-genia-${ENVIRONMENT} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

if [ -z "$USER_POOL_ID" ]; then
    echo -e "${RED}Error: No se pudo obtener User Pool ID${NC}"
    exit 1
fi

echo -e "${GREEN}User Pool: ${USER_POOL_ID}${NC}"

# Crear usuario en Cognito
echo -e "\n${YELLOW}[1/2] Creando usuario en Cognito...${NC}"
aws cognito-idp admin-create-user \
    --user-pool-id ${USER_POOL_ID} \
    --username ${ADMIN_EMAIL} \
    --user-attributes \
        Name=email,Value=${ADMIN_EMAIL} \
        Name=email_verified,Value=true \
        Name=given_name,Value=Admin \
        Name=family_name,Value=Sistema \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS \
    --region ${REGION} 2>/dev/null || echo "Usuario ya existe, continuando..."

# Establecer password permanente
aws cognito-idp admin-set-user-password \
    --user-pool-id ${USER_POOL_ID} \
    --username ${ADMIN_EMAIL} \
    --password ${ADMIN_PASSWORD} \
    --permanent \
    --region ${REGION}

echo -e "${GREEN}✓ Usuario creado en Cognito${NC}"

# Crear rol en DynamoDB
echo -e "\n${YELLOW}[2/2] Guardando rol en DynamoDB...${NC}"
TABLE_NAME="sistema-genia-${ENVIRONMENT}-UserRoles"

aws dynamodb put-item \
    --table-name ${TABLE_NAME} \
    --item '{
        "userId": {"S": "'${ADMIN_EMAIL}'"},
        "email": {"S": "'${ADMIN_EMAIL}'"},
        "firstName": {"S": "Admin"},
        "lastName": {"S": "Sistema"},
        "role": {"S": "admin"},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
    }' \
    --region ${REGION}

echo -e "${GREEN}✓ Rol guardado en DynamoDB${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ USUARIO ADMIN CREADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Email: ${ADMIN_EMAIL}${NC}"
echo -e "${GREEN}Password: ${ADMIN_PASSWORD}${NC}"
echo -e "${GREEN}========================================${NC}"
