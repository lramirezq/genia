# 🚀 Guía Completa de Despliegue - Sistema GenIA

## 📋 Requisitos Previos

### 1. Herramientas Necesarias
```bash
# AWS CLI
aws --version  # >= 2.x

# AWS SAM CLI
sam --version  # >= 1.x

# Node.js
node --version  # >= 18.x
npm --version   # >= 9.x

# Git
git --version
```

### 2. Credenciales AWS
```bash
# Configurar credenciales
aws configure

# Verificar acceso
aws sts get-caller-identity
```

### 3. Permisos IAM Requeridos
- CloudFormation (crear/actualizar stacks)
- Lambda (crear/actualizar funciones)
- API Gateway (crear APIs)
- DynamoDB (crear tablas)
- S3 (crear buckets)
- Cognito (crear user pools)
- Bedrock (acceso a modelos)
- OpenSearch Serverless (crear colecciones)
- IAM (crear roles)
- CloudFront (crear distribuciones)

### 4. Habilitar Modelos de Bedrock
1. Ir a AWS Console → Bedrock → Model access
2. Habilitar:
   - `anthropic.claude-3-sonnet-20240229-v1:0`
   - `amazon.titan-embed-text-v1`
3. Esperar aprobación (puede tomar minutos)

---

## 🏗️ PARTE 1: Despliegue del Backend

### Paso 1: Clonar el Repositorio
```bash
git clone <repository-url>
cd sistema-genia
```

### Paso 2: Desplegar Backend con SAM
```bash
cd backend

# Build
sam build

# Deploy (primera vez - modo guiado)
sam deploy --guided

# Responder las preguntas:
# Stack Name: sistema-genia-dev
# AWS Region: us-east-1
# Parameter Environment: dev
# Confirm changes: Y
# Allow SAM CLI IAM role creation: Y
# Disable rollback: N
# Save arguments to configuration file: Y
# SAM configuration file: samconfig.toml
# SAM configuration environment: default
```

**Tiempo estimado:** 10-15 minutos

### Paso 3: Guardar Outputs del Backend
```bash
# Obtener outputs
aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --query 'Stacks[0].Outputs' \
  --output table

# Guardar estos valores:
# - ApiUrl: https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
# - UserPoolId: us-east-1_xxxxxxxxx
# - ClientId: xxxxxxxxxxxxxxxxxxxxxxxxxx
# - BucketName: dev-genia-docs-ACCOUNT_ID
```

---

## 🎨 PARTE 2: Despliegue del Frontend

### Paso 1: Configurar Frontend
```bash
cd ../frontend

# Editar src/config.js con los valores del backend
cat > src/config.js << 'EOF'
export default {
  apiUrl: 'https://xxxxx.execute-api.us-east-1.amazonaws.com/dev',  // ApiUrl del backend
  cognito: {
    userPoolId: 'us-east-1_xxxxxxxxx',  // UserPoolId del backend
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx'  // ClientId del backend
  }
}
EOF
```

### Paso 2: Build del Frontend
```bash
# Instalar dependencias
npm install

# Build para producción
npm run build
```

**Tiempo estimado:** 2-3 minutos

### Paso 3: Crear Infraestructura de Frontend (CloudFront + S3)
```bash
cd ..

# Desplegar stack de frontend
aws cloudformation create-stack \
  --stack-name sistema-genia-frontend-dev \
  --template-body file://frontend-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_IAM

# Esperar a que complete
aws cloudformation wait stack-create-complete \
  --stack-name sistema-genia-frontend-dev
```

**Tiempo estimado:** 15-20 minutos (CloudFront es lento)

### Paso 4: Obtener Información del Frontend
```bash
# Obtener outputs
aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs' \
  --output table

# Guardar estos valores:
# - FrontendBucketName: dev-genia-frontend-ACCOUNT_ID
# - CloudFrontDistributionId: EXXXXXXXXXXXXX
# - CloudFrontDomainName: dxxxxxxxxxxxxx.cloudfront.net
# - FrontendURL: https://dxxxxxxxxxxxxx.cloudfront.net
```

### Paso 5: Subir Frontend a S3
```bash
cd frontend

# Obtener nombre del bucket
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

# Subir archivos
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

# Invalidar caché de CloudFront
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

**Tiempo estimado:** 2-3 minutos + 5-10 minutos de propagación

---

## 👤 PARTE 3: Crear Usuario Administrador

### Opción A: Usando Script (Recomendado)
```bash
cd ..
chmod +x create-admin.sh

# Crear admin
./create-admin.sh admin@tuempresa.com TuPassword123!
```

### Opción B: Manual con AWS CLI
```bash
# Obtener User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Crear usuario admin
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@tuempresa.com \
  --user-attributes \
    Name=email,Value=admin@tuempresa.com \
    Name=given_name,Value=Admin \
    Name=family_name,Value=User \
    Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --temporary-password TempPass123!

# Establecer contraseña permanente
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@tuempresa.com \
  --password TuPassword123! \
  --permanent

# Crear rol de admin en DynamoDB
CATALOGS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CatalogsTable`].OutputValue' \
  --output text)

aws dynamodb put-item \
  --table-name sistema-genia-dev-user-roles \
  --item '{
    "userId": {"S": "admin@tuempresa.com"},
    "email": {"S": "admin@tuempresa.com"},
    "firstName": {"S": "Admin"},
    "lastName": {"S": "User"},
    "role": {"S": "admin"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}
  }'
```

---

## ✅ PARTE 4: Verificación

### 1. Verificar Backend
```bash
# Test de login
API_URL=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tuempresa.com","password":"TuPassword123!"}'

# Debe devolver tokens
```

### 2. Verificar Frontend
```bash
# Obtener URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
  --output text)

echo "Frontend disponible en: $FRONTEND_URL"

# Abrir en navegador
open $FRONTEND_URL  # macOS
# o
xdg-open $FRONTEND_URL  # Linux
```

### 3. Verificar Bedrock
```bash
# Listar modelos habilitados
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-sonnet`) || contains(modelId, `titan-embed`)].modelId'
```

---

## 🔄 Actualizaciones Futuras

### Actualizar Backend
```bash
cd backend
sam build && sam deploy --no-confirm-changeset
```

### Actualizar Frontend
```bash
cd frontend

# Build
npm run build

# Subir a S3
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

# Invalidar CloudFront
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

---

## 🗑️ Eliminación Completa

### Eliminar en orden inverso:

```bash
# 1. Vaciar bucket de frontend
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 rm s3://$BUCKET_NAME --recursive

# 2. Eliminar stack de frontend
aws cloudformation delete-stack --stack-name sistema-genia-frontend-dev
aws cloudformation wait stack-delete-complete --stack-name sistema-genia-frontend-dev

# 3. Vaciar bucket de documentos
DOCS_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

aws s3 rm s3://$DOCS_BUCKET --recursive

# 4. Eliminar stack de backend
aws cloudformation delete-stack --stack-name sistema-genia-dev
aws cloudformation wait stack-delete-complete --stack-name sistema-genia-dev
```

---

## 📊 Costos Estimados

### Mensual (uso moderado)
- **Frontend**: ~$9/mes
  - S3: $1
  - CloudFront: $8
- **Backend**: ~$255/mes
  - Lambda: $50
  - DynamoDB: $25
  - OpenSearch Serverless: $100
  - Bedrock: $80
- **Total**: ~$264/mes

### Por Uso
- Creación de catálogo: ~$0.10
- Chat con IA: ~$0.02 por consulta
- Almacenamiento documentos: $0.023/GB/mes

---

## 🐛 Troubleshooting

### Error: "Model access denied"
```bash
# Verificar acceso a modelos
aws bedrock list-foundation-models --region us-east-1

# Habilitar en consola: Bedrock → Model access
```

### Error: "Stack already exists"
```bash
# Eliminar stack existente
aws cloudformation delete-stack --stack-name sistema-genia-dev
aws cloudformation wait stack-delete-complete --stack-name sistema-genia-dev
```

### Error: "Bucket already exists"
```bash
# Los nombres de bucket son globales, cambiar en template.yaml:
# BucketName: !Sub "${Environment}-genia-docs-${AWS::AccountId}-v2"
```

### Frontend no carga
```bash
# Verificar archivos en S3
aws s3 ls s3://$BUCKET_NAME/

# Verificar CloudFront
aws cloudfront get-distribution --id $DISTRIBUTION_ID

# Invalidar caché
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Error CORS
```bash
# Verificar config.js tiene la URL correcta del backend
cat frontend/src/config.js

# Redesplegar backend si es necesario
cd backend && sam deploy --no-confirm-changeset
```

---

## 📞 Comandos Útiles

### Ver Logs
```bash
# Logs de Lambda
aws logs tail /aws/lambda/sistema-genia-dev-CreateCatalogFunction --follow

# Logs de CloudFront
aws cloudfront get-distribution --id $DISTRIBUTION_ID
```

### Ver Recursos
```bash
# Listar todos los stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Ver recursos de un stack
aws cloudformation describe-stack-resources --stack-name sistema-genia-dev
```

### Backup
```bash
# Backup de DynamoDB
aws dynamodb create-backup \
  --table-name sistema-genia-dev-catalogs \
  --backup-name backup-$(date +%Y%m%d)

# Backup de S3
aws s3 sync s3://$DOCS_BUCKET ./backup-s3/
```

---

## 🎯 Checklist de Despliegue

- [ ] AWS CLI configurado
- [ ] SAM CLI instalado
- [ ] Node.js 18+ instalado
- [ ] Modelos de Bedrock habilitados
- [ ] Backend desplegado (10-15 min)
- [ ] Outputs del backend guardados
- [ ] Frontend configurado (config.js)
- [ ] Frontend build completado
- [ ] Stack de frontend creado (15-20 min)
- [ ] Archivos subidos a S3
- [ ] CloudFront invalidado
- [ ] Usuario admin creado
- [ ] Login verificado
- [ ] Frontend accesible

---

## 📚 Archivos Importantes

- `backend/template.yaml` - Infraestructura del backend
- `frontend-infrastructure.yaml` - Infraestructura del frontend
- `frontend/src/config.js` - Configuración del frontend
- `create-admin.sh` - Script para crear admin
- `samconfig.toml` - Configuración de SAM
- `AGENT-CONFIGURATION.md` - Configuración de Agents
- `CHANGELOG.md` - Historial de cambios

---

**Tiempo Total de Despliegue:** ~30-40 minutos

**Versión:** 4.2.0  
**Última actualización:** 24 Octubre 2025
