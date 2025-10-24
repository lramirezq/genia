# 📦 Resumen de Deployment - Sistema GenIA

## 🎯 Archivos Creados

### Infraestructura
```
sistema-genia/
├── frontend-infrastructure.yaml    # CloudFormation S3 + CloudFront
├── backend/template.yaml          # SAM template (existente)
└── .env.example                   # Configuración de ambientes
```

### Scripts de Deployment
```
sistema-genia/
├── deploy-frontend.sh             # Deployment completo frontend
├── update-frontend.sh             # Actualizar solo código
└── create-admin.sh                # Crear usuario admin
```

### Documentación
```
sistema-genia/
├── README.md                      # Inicio rápido
├── DEPLOYMENT-GUIDE.md            # Guía completa paso a paso
├── DOCUMENTACION-SISTEMA-GENIA.md # Arquitectura y features
├── GUIA-PRESENTACION.md           # Para demos y ventas
└── DIAGRAMAS-TECNICOS.md          # Diagramas técnicos
```

---

## 🚀 Deployment en 3 Pasos

### Paso 1: Backend (10 min)
```bash
cd backend
sam build && sam deploy --guided
```

### Paso 2: Frontend (5 min)
```bash
./deploy-frontend.sh dev
```

### Paso 3: Usuario Admin (1 min)
```bash
./create-admin.sh admin@empresa.com AdminPass123!
```

**Total: ~16 minutos** ⚡

---

## 📊 Arquitectura Desplegada

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              CloudFront Distribution                │
│         (CDN Global + SSL + Caching)                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              S3 Bucket (Frontend)                   │
│         Vue.js 3 SPA + Assets                       │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ API Calls
                       ▼
┌─────────────────────────────────────────────────────┐
│              API Gateway (Backend)                  │
│         23 Endpoints + JWT Auth                     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Lambda         DynamoDB       Bedrock
   (20 funcs)     (3 tables)    (Claude 3)
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
              S3 + OpenSearch
           (Docs + Vectors)
```

---

## 🔧 Recursos AWS Creados

### Frontend Stack
- ✅ S3 Bucket (website hosting)
- ✅ CloudFront Distribution
- ✅ Origin Access Control (OAC)
- ✅ Bucket Policy

### Backend Stack (existente)
- ✅ 20 Lambda Functions
- ✅ API Gateway REST API
- ✅ Cognito User Pool
- ✅ 3 DynamoDB Tables
- ✅ S3 Bucket (documentos)
- ✅ OpenSearch Serverless Collection
- ✅ Bedrock Knowledge Bases + Agents

**Total: ~30 recursos AWS**

---

## 💰 Costos Mensuales

| Componente | Costo | Detalles |
|------------|-------|----------|
| **Frontend** | | |
| S3 Storage | $0.50 | 20GB assets |
| S3 Requests | $0.10 | GET requests |
| CloudFront | $8.50 | 100GB transfer |
| **Backend** | | |
| Lambda | $20 | 1M invocations |
| API Gateway | $15 | 1M requests |
| DynamoDB | $5 | On-demand |
| S3 Docs | $10 | 100GB storage |
| OpenSearch | $150 | 1 OCU |
| Bedrock | $50 | 10K queries |
| Cognito | $5 | 1K users |
| **TOTAL** | **~$264/mes** | Uso moderado |

---

## 🎯 URLs de Acceso

### Desarrollo
```bash
# Frontend
https://xxxxx.cloudfront.net

# API
https://xxxxx.execute-api.us-east-1.amazonaws.com/dev

# Cognito
https://us-east-1_xxxxx.auth.us-east-1.amazoncognito.com
```

### Producción (con dominio)
```bash
# Frontend
https://genia.tuempresa.com

# API
https://api.genia.tuempresa.com

# Cognito
https://auth.genia.tuempresa.com
```

---

## 🔄 Flujo de Actualización

### Actualizar Backend
```bash
cd backend
sam build && sam deploy --no-confirm-changeset
```
**Tiempo:** ~3 minutos

### Actualizar Frontend
```bash
./update-frontend.sh dev
```
**Tiempo:** ~2 minutos

### Rollback
```bash
# Backend
aws cloudformation cancel-update-stack --stack-name sistema-genia-dev

# Frontend
aws s3 sync ./frontend-backup/ s3://BUCKET_NAME/
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

---

## 🔒 Seguridad Implementada

### Frontend
- ✅ HTTPS obligatorio (CloudFront)
- ✅ Origin Access Control (OAC)
- ✅ Bucket privado (no acceso público)
- ✅ Versionado habilitado
- ✅ Headers de seguridad (CORS, CSP)

### Backend
- ✅ JWT Authentication (Cognito)
- ✅ IAM roles de mínimo privilegio
- ✅ Encriptación en tránsito (TLS 1.2+)
- ✅ Encriptación en reposo (S3, DynamoDB)
- ✅ VPC endpoints (opcional)
- ✅ CloudWatch logs habilitados

---

## 📈 Métricas de Rendimiento

### Frontend
- **Tiempo de carga:** < 2 segundos
- **First Contentful Paint:** < 1 segundo
- **Time to Interactive:** < 3 segundos
- **Lighthouse Score:** 90+

### Backend
- **API Latency (p50):** < 200ms
- **API Latency (p99):** < 2s
- **Chat Response:** 15-45s
- **Catalog Creation:** 5-10 min

---

## 🧪 Testing

### Test Manual
```bash
# 1. Login
curl -X POST ${API_URL}/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@empresa.com","password":"AdminPass123!"}'

# 2. Listar catálogos
curl ${API_URL}/catalogs \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Frontend
open ${FRONTEND_URL}
```

### Test Automatizado
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run test
```

---

## 📞 Comandos Útiles

### Ver Outputs
```bash
# Backend
aws cloudformation describe-stacks \
  --stack-name sistema-genia-dev \
  --query 'Stacks[0].Outputs'

# Frontend
aws cloudformation describe-stacks \
  --stack-name sistema-genia-frontend-dev \
  --query 'Stacks[0].Outputs'
```

### Ver Logs
```bash
# Lambda
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# CloudFront
aws cloudfront get-distribution --id DIST_ID
```

### Monitoreo
```bash
# CloudWatch Dashboard
aws cloudwatch get-dashboard \
  --dashboard-name sistema-genia-dev

# Métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=FUNCTION_NAME \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 🆘 Troubleshooting Rápido

### Frontend no carga
```bash
# 1. Verificar archivos en S3
aws s3 ls s3://BUCKET_NAME/ --recursive

# 2. Verificar CloudFront
aws cloudfront get-distribution --id DIST_ID

# 3. Invalidar cache
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

### Error de CORS
```bash
# 1. Verificar config.js
cat frontend/src/config.js

# 2. Verificar API Gateway CORS
aws apigateway get-rest-api --rest-api-id API_ID

# 3. Redesplegar API
cd backend && sam deploy --no-confirm-changeset
```

### Chat no responde
```bash
# 1. Ver logs
aws logs tail /aws/lambda/sistema-genia-dev-InvokeAgentFunction --follow

# 2. Verificar permisos
aws dynamodb query \
  --table-name sistema-genia-dev-Permissions \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid":{"S":"user@example.com"}}'

# 3. Verificar Bedrock Agent
aws bedrock-agent list-agents
```

---

## ✅ Checklist Post-Deployment

- [ ] Frontend accesible vía CloudFront
- [ ] Login funciona
- [ ] Crear usuario funciona
- [ ] Crear catálogo funciona (esperar 5-10 min)
- [ ] Upload documentos funciona
- [ ] Sincronización funciona
- [ ] Chat responde correctamente
- [ ] Exportar PDF funciona
- [ ] Logs visibles en CloudWatch
- [ ] Métricas en CloudWatch
- [ ] Backup configurado (opcional)
- [ ] Dominio personalizado (opcional)
- [ ] SSL/TLS funcionando
- [ ] Documentación actualizada

---

## 🎓 Próximos Pasos

1. **Configurar dominio personalizado** (opcional)
2. **Configurar alertas CloudWatch**
3. **Configurar backup automático**
4. **Configurar CI/CD pipeline**
5. **Configurar WAF** (Web Application Firewall)
6. **Configurar Route53 health checks**
7. **Documentar procesos operativos**
8. **Capacitar usuarios finales**

---

## 📚 Referencias

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Vue.js 3 Documentation](https://vuejs.org/)

---

*Sistema GenIA - Deployment Summary v1.0*
*Última actualización: Enero 2025*
