# 🚀 Guía de Deployment Completo - Sistema GenIA

## 📋 Índice
1. [Pre-requisitos](#pre-requisitos)
2. [Deployment Backend](#deployment-backend)
3. [Deployment Frontend](#deployment-frontend)
4. [Configuración Inicial](#configuración-inicial)
5. [Verificación](#verificación)
6. [Troubleshooting](#troubleshooting)

---

## Pre-requisitos

### Herramientas Necesarias
```bash
# AWS CLI
aws --version  # >= 2.0

# AWS SAM CLI
sam --version  # >= 1.0

# Node.js
node --version  # >= 18.0
npm --version   # >= 9.0

# Git
git --version
```

### Configuración AWS
```bash
# Configurar credenciales
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1
# Default output format: json

# Verificar configuración
aws sts get-caller-identity
```

### Habilitar Servicios AWS

1. **Amazon Bedrock**
   - Ir a: https://console.aws.amazon.com/bedrock/
   - Solicitar acceso a:
     - Claude 3 Sonnet
     - Titan Embeddings G1 - Text

2. **Verificar Límites**
   ```bash
   # Lambda concurrent executions
   aws service-quotas get-service-quota \
     --service-code lambda \
     --quota-code L-B99A9384 \
     --region us-east-1
   
   # OpenSearch Serverless collections
   aws service-quotas get-service-quota \
     --service-code aoss \
     --quota-code L-8F1A8E46 \
     --region us-east-1
   ```

---

## Deployment Backend

### Paso 1: Clonar Repositorio
```bash
git clone <repository-url>
cd sistema-genia
```

### Paso 2: Desplegar Backend con SAM
```bash
cd backend

# Build
sam build

# Deploy (primera vez)
sam deploy \
  --stack-name sistema-genia-dev \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3 \
  --guided

# Responder:
# - Stack Name: sistema-genia-dev
# - AWS Region: us-east-1
# - Parameter Environment: dev
# - Confirm changes: Y
# - Allow SAM CLI IAM role creation: Y
# - Disable rollback: N
# - Save arguments to config: Y

# Deployments subsecuentes (más rápido)
sam build && sam deploy --no-confirm-changeset
```

### Paso 3: Guardar Outputs del Backend
```bash
# Obtener valores importantes
aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output table

# Guardar en archivo
aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' > backend-outputs.json
```

**Outputs esperados:**
- `ApiUrl`: URL del API Gateway
- `UserPoolId`: ID del Cognito User Pool
- `ClientId`: ID del Cognito App Client
- `BucketName`: Nombre del bucket S3 de documentos

---

## Deployment Frontend

### Opción 1: Deployment Automatizado (Recomendado)

```bash
# Desde la raíz del proyecto
./deploy-frontend.sh dev

# Para otros ambientes
./deploy-frontend.sh staging
./deploy-frontend.sh prod
```

**El script hace:**
1. ✅ Despliega infraestructura CloudFormation (S3 + CloudFront)
2. ✅ Obtiene configuración del backend automáticamente
3. ✅ Crea archivo de configuración del frontend
4. ✅ Ejecuta build de Vue.js
5. ✅ Sube archivos a S3
6. ✅ Invalida cache de CloudFront

### Opción 2: Deployment Manual

#### Paso 1: Desplegar Infraestructura
```bash
aws cloudformation deploy \
  --template-file frontend-infrastructure.yaml \
  --stack-name sistema-genia-frontend-dev \
  --parameter-overrides Environment=dev \
  --region us-east-1
```

#### Paso 2: Obtener Outputs
```bash
# Bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

# Distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

# Frontend URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
  --output text)

echo "Bucket: $BUCKET_NAME"
echo "Distribution: $DISTRIBUTION_ID"
echo "URL: $FRONTEND_URL"
```

#### Paso 3: Configurar Frontend
```bash
cd frontend

# Crear archivo de configuración
cat > src/config.js << EOF
export default {
  apiUrl: 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev',
  cognito: {
    userPoolId: 'us-east-1_XXXXXXXXX',
    clientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX'
  }
}
EOF
```

#### Paso 4: Build y Deploy
```bash
# Instalar dependencias
npm install

# Build
npm run build

# Subir a S3
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# index.html sin cache
aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
  --cache-control "public, max-age=0, must-revalidate"

# Invalidar CloudFront
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

---

## Configuración Inicial

### Crear Usuario Administrador

```bash
# Variables
USER_POOL_ID="us-east-1_XXXXXXXXX"  # Del output del backend
ADMIN_EMAIL="admin@tuempresa.com"
ADMIN_PASSWORD="AdminPass123!"

# Crear usuario en Cognito
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
  --region us-east-1

# Establecer password permanente
aws cognito-idp admin-set-user-password \
  --user-pool-id ${USER_POOL_ID} \
  --username ${ADMIN_EMAIL} \
  --password ${ADMIN_PASSWORD} \
  --permanent \
  --region us-east-1

# Crear rol en DynamoDB
TABLE_NAME="sistema-genia-dev-UserRoles"

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
  --region us-east-1

echo "✓ Usuario admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
```

---

## Verificación

### 1. Verificar Backend
```bash
# Health check
API_URL="https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev"
curl ${API_URL}/health

# Test login
curl -X POST ${API_URL}/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@tuempresa.com",
    "password": "AdminPass123!"
  }'
```

### 2. Verificar Frontend
```bash
# Abrir en navegador
open https://YOUR-CLOUDFRONT-DOMAIN.cloudfront.net

# O con dominio personalizado
open https://genia.tuempresa.com
```

### 3. Verificar Integración Completa

**Flujo de Prueba:**
1. ✅ Abrir frontend en navegador
2. ✅ Login con admin@tuempresa.com
3. ✅ Crear un usuario nuevo
4. ✅ Crear un catálogo (esperar 5-10 min)
5. ✅ Subir documentos
6. ✅ Sincronizar documentos
7. ✅ Asignar permisos
8. ✅ Hacer pregunta en chat

---

## Configuración de Dominio Personalizado (Opcional)

### Paso 1: Crear Certificado SSL en ACM
```bash
# IMPORTANTE: Debe ser en us-east-1 para CloudFront
aws acm request-certificate \
  --domain-name genia.tuempresa.com \
  --validation-method DNS \
  --region us-east-1

# Obtener ARN del certificado
CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[?DomainName==`genia.tuempresa.com`].CertificateArn' \
  --output text)

echo "Certificate ARN: ${CERT_ARN}"
```

### Paso 2: Validar Certificado
```bash
# Obtener registros DNS para validación
aws acm describe-certificate \
  --certificate-arn ${CERT_ARN} \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# Agregar registro CNAME en tu DNS provider
# Esperar validación (puede tomar 5-30 minutos)
```

### Paso 3: Redesplegar con Dominio
```bash
aws cloudformation deploy \
  --template-file frontend-infrastructure.yaml \
  --stack-name sistema-genia-frontend-dev \
  --parameter-overrides \
    Environment=dev \
    DomainName=genia.tuempresa.com \
    CertificateArn=${CERT_ARN} \
  --region us-east-1
```

### Paso 4: Configurar DNS
```bash
# Obtener CloudFront domain
CF_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
  --output text)

echo "Crear registro CNAME:"
echo "genia.tuempresa.com -> ${CF_DOMAIN}"
```

---

## Troubleshooting

### Error: "Stack already exists"
```bash
# Actualizar stack existente
aws cloudformation update-stack \
  --stack-name sistema-genia-frontend-dev \
  --template-body file://frontend-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev
```

### Error: "Access Denied" en S3
```bash
# Verificar bucket policy
aws s3api get-bucket-policy \
  --bucket ${BUCKET_NAME}

# Verificar OAC de CloudFront
aws cloudfront get-origin-access-control \
  --id ${OAC_ID}
```

### Frontend muestra página en blanco
```bash
# Verificar archivos en S3
aws s3 ls s3://${BUCKET_NAME}/ --recursive

# Verificar logs de CloudFront
aws cloudfront get-distribution \
  --id ${DISTRIBUTION_ID} \
  --query 'Distribution.DistributionConfig.Logging'

# Verificar consola del navegador (F12)
# Buscar errores de CORS o configuración
```

### CloudFront muestra contenido antiguo
```bash
# Invalidar cache completo
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"

# Verificar estado de invalidación
aws cloudfront get-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --id ${INVALIDATION_ID}
```

### Error de CORS en API
```bash
# Verificar configuración CORS en API Gateway
aws apigateway get-rest-api \
  --rest-api-id ${API_ID}

# Verificar que el frontend use la URL correcta
cat frontend/src/config.js
```

---

## Comandos Útiles

### Ver logs de Lambda
```bash
# Logs recientes (últimos 5 minutos)
aws logs tail /aws/lambda/sistema-genia-dev-InvokeAgentFunction \
  --follow \
  --region us-east-1

# Logs con filtro
aws logs filter-log-events \
  --log-group-name "/aws/lambda/sistema-genia-dev-InvokeAgentFunction" \
  --start-time $(($(date +%s) - 300))000 \
  --filter-pattern "ERROR" \
  --region us-east-1
```

### Monitorear CloudFront
```bash
# Métricas de CloudFront
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=${DISTRIBUTION_ID} \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Backup y Restore
```bash
# Backup de frontend
aws s3 sync s3://${BUCKET_NAME}/ ./frontend-backup/

# Restore
aws s3 sync ./frontend-backup/ s3://${BUCKET_NAME}/
aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"
```

---

## Costos Estimados

### Frontend (S3 + CloudFront)
| Servicio | Costo Mensual | Notas |
|----------|---------------|-------|
| S3 Storage | $0.50 | ~20GB frontend assets |
| S3 Requests | $0.10 | GET requests |
| CloudFront | $8.50 | 100GB transfer |
| **Total Frontend** | **~$9/mes** | |

### Sistema Completo
| Componente | Costo Mensual |
|------------|---------------|
| Backend | $255 |
| Frontend | $9 |
| **TOTAL** | **~$264/mes** |

---

## Checklist de Deployment

### Pre-deployment
- [ ] AWS CLI configurado
- [ ] SAM CLI instalado
- [ ] Node.js 18+ instalado
- [ ] Bedrock habilitado
- [ ] Límites de servicio verificados

### Backend
- [ ] Stack de backend desplegado
- [ ] Outputs guardados
- [ ] Usuario admin creado
- [ ] API funcionando

### Frontend
- [ ] Stack de frontend desplegado
- [ ] Configuración creada
- [ ] Build exitoso
- [ ] Archivos en S3
- [ ] CloudFront invalidado

### Verificación
- [ ] Login funciona
- [ ] Crear usuario funciona
- [ ] Crear catálogo funciona
- [ ] Upload documentos funciona
- [ ] Chat funciona

---

*Guía de Deployment v1.0 - Sistema GenIA*
