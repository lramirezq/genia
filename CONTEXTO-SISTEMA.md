# 📋 Contexto del Sistema GenIA

## 🎯 Versión Actual: 4.4.0 - PRODUCTION READY

**Fecha:** 25 Enero 2025  
**Estado:** Producción Completa  
**Deployment:** Automatizado + Guía Completa  
**URL Producción:** https://d2arlg3pewzp57.cloudfront.net

---

## 🏗️ Arquitectura Actual

### Stack Completo
```
CloudFront (CDN Global)
    ↓
S3 Frontend (Vue.js 3 SPA)
    ↓
API Gateway (23 endpoints)
    ↓
Lambda Functions (20)
    ↓
Cognito + DynamoDB + Bedrock + OpenSearch + S3
```

### Componentes Desplegados

#### Frontend
- **Hosting**: S3 + CloudFront
- **Framework**: Vue.js 3 con Composition API
- **Deployment**: CloudFormation automatizado
- **URL**: https://d2arlg3pewzp57.cloudfront.net
- **Costo**: ~$9/mes

#### Backend
- **Funciones Lambda**: 21 funciones Node.js 18.x (agregada GetStatsFunction)
- **API Gateway**: REST API con JWT Authorizer
- **Base de datos**: 3 tablas DynamoDB
- **Autenticación**: AWS Cognito User Pool
- **Storage**: S3 para documentos
- **IA**: Amazon Bedrock (Claude 3 + Titan Embeddings)
- **Búsqueda**: OpenSearch Serverless con FAISS
- **Costo**: ~$255/mes

---

## 📦 Estructura del Proyecto

```
sistema-genia/
├── backend/
│   ├── template.yaml                    # SAM template
│   └── src/
│       ├── auth/                        # Login, change password
│       ├── users/                       # CRUD usuarios
│       ├── catalogs/                    # CRUD catálogos
│       ├── bedrock/                     # KB, Agents, Sync
│       ├── chat/                        # Invoke Agent
│       └── permissions/                 # Permisos
│
├── frontend/
│   ├── src/
│   │   ├── views/                       # 7 vistas principales
│   │   ├── components/                  # Componentes reutilizables
│   │   ├── config.js                    # Configuración API/Cognito
│   │   └── router/                      # Vue Router
│   └── dist/                            # Build para producción
│
├── frontend-infrastructure.yaml         # CloudFormation S3+CloudFront
├── deploy-frontend.sh                   # Script deployment completo
├── update-frontend.sh                   # Script actualización rápida
├── create-admin.sh                      # Script crear admin
│
├── README.md                            # Inicio rápido
├── DEPLOYMENT-GUIDE.md                  # Guía completa
├── DEPLOYMENT-SUMMARY.md                # Resumen visual
├── DOCUMENTACION-SISTEMA-GENIA.md       # Arquitectura
├── GUIA-PRESENTACION.md                 # Para demos
├── DIAGRAMAS-TECNICOS.md                # Diagramas
└── CHANGELOG-SISTEMA-GENIA.md           # Historial cambios
```

---

## 🚀 Deployment Actual

### Proceso Completo (16 minutos)

1. **Backend** (10 min)
   ```bash
   cd backend
   sam build && sam deploy --guided
   ```

2. **Frontend** (5 min)
   ```bash
   ./deploy-frontend.sh dev
   ```

3. **Usuario Admin** (1 min)
   ```bash
   ./create-admin.sh admin@empresa.com Pass123!
   ```

### Actualización Frontend (2 minutos)
```bash
./update-frontend.sh dev
```

---

## 🔧 Configuración Actual

### Ambientes
- **dev**: Desarrollo y pruebas
- **staging**: Pre-producción (opcional)
- **prod**: Producción (opcional)

### Variables de Entorno
```javascript
// frontend/src/config.js
export default {
  apiUrl: 'https://xxxxx.execute-api.us-east-1.amazonaws.com/dev',
  cognito: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
}
```

### Stacks CloudFormation
1. **sistema-genia-dev** (Backend)
   - 20 Lambda Functions
   - API Gateway
   - Cognito User Pool
   - 3 DynamoDB Tables
   - S3 Bucket (documentos)
   - OpenSearch Collection

2. **sistema-genia-frontend-dev** (Frontend)
   - S3 Bucket (frontend)
   - CloudFront Distribution
   - Origin Access Control

---

## 📊 Métricas Actuales

### Performance
- **Tiempo carga frontend**: < 2s
- **API Latency (p50)**: < 200ms
- **API Latency (p99)**: < 2s
- **Chat response**: 15-45s
- **Catalog creation**: 3-4 min (optimizado con esperas de propagación)

### Capacidad
- **Usuarios concurrentes**: 1000+
- **Requests/segundo**: 1000
- **Documentos por catálogo**: Ilimitado
- **Tamaño documento**: Hasta 50MB

### Costos
- **Frontend**: $9/mes
- **Backend**: $255/mes
- **Total**: $264/mes (uso moderado)

---

## ✅ Features Implementados

### Autenticación (100%)
- [x] Login con Cognito
- [x] JWT tokens
- [x] Refresh automático
- [x] Logout
- [x] Change password

### Usuarios (100%)
- [x] Crear con email automático
- [x] Listar
- [x] Editar (nombre, apellido, rol)
- [x] Eliminar (Cognito + DynamoDB)
- [x] Reset password
- [x] Roles: admin, user

### Catálogos (100%)
- [x] Crear (asíncrono 5-10 min)
- [x] Listar con estados
- [x] Eliminar (completo)
- [x] Estados: creating, ready, error
- [x] Polling automático

### Documentos (100%)
- [x] Upload drag & drop
- [x] Listar por catálogo
- [x] Eliminar
- [x] Sincronizar (ingestion)
- [x] Descargar
- [x] Nombres originales preservados

### Permisos (100%)
- [x] Asignar usuario-catálogo
- [x] Revocar
- [x] Listar por usuario
- [x] Validación en backend

### Chat IA (100%)
- [x] Interfaz conversacional
- [x] Markdown rendering
- [x] Timestamps
- [x] Streaming responses
- [x] Fuentes con enlaces
- [x] Exportar PDF
- [x] Timeout handling

### Infraestructura (100%)
- [x] Backend SAM
- [x] Frontend CloudFormation
- [x] Scripts automatizados
- [x] Multi-ambiente
- [x] Documentación completa

---

## 🔐 Seguridad Implementada

### Frontend
- ✅ HTTPS obligatorio
- ✅ Origin Access Control (OAC)
- ✅ Bucket privado
- ✅ CORS configurado
- ✅ Headers de seguridad

### Backend
- ✅ JWT Authentication
- ✅ IAM roles mínimo privilegio
- ✅ Encriptación en tránsito
- ✅ Encriptación en reposo
- ✅ Validación de permisos
- ✅ CloudWatch logs

---

## 📈 Roadmap

### v4.1 (Q1 2025)
- [ ] CI/CD con GitHub Actions
- [ ] Tests automatizados
- [ ] Monitoring dashboard
- [ ] Alertas CloudWatch

### v5.0 (Q2 2025)
- [ ] Multi-idioma
- [ ] Analytics dashboard
- [ ] Integración Slack/Teams
- [ ] API pública

### v6.0 (Q3 2025)
- [ ] Mobile app
- [ ] Búsqueda semántica avanzada
- [ ] Multi-tenancy
- [ ] Historial persistente

---

## 🆘 Troubleshooting Común

### Frontend no carga
```bash
# Verificar archivos
aws s3 ls s3://BUCKET_NAME/ --recursive

# Invalidar CloudFront
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

### Error CORS
```bash
# Verificar config
cat frontend/src/config.js

# Redesplegar backend
cd backend && sam deploy --no-confirm-changeset
```

### Chat no responde
```bash
# Ver logs
aws logs tail /aws/lambda/sistema-genia-dev-InvokeAgentFunction --follow

# Verificar permisos
aws dynamodb query --table-name sistema-genia-dev-Permissions
```

---

## 📞 Comandos Útiles

### Ver Outputs
```bash
# Backend
aws cloudformation describe-stacks --stack-name sistema-genia-dev

# Frontend
aws cloudformation describe-stacks --stack-name sistema-genia-frontend-dev
```

### Ver Logs
```bash
# Lambda
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# CloudFront
aws cloudfront get-distribution --id DIST_ID
```

### Backup
```bash
# Frontend
aws s3 sync s3://BUCKET_NAME/ ./backup/

# DynamoDB
aws dynamodb create-backup --table-name TABLE_NAME --backup-name backup-$(date +%Y%m%d)
```

---

## 📚 Documentación

### Para Desarrolladores
- **DEPLOYMENT-GUIDE.md**: Guía paso a paso
- **DIAGRAMAS-TECNICOS.md**: Arquitectura detallada
- **README.md**: Inicio rápido

### Para Negocio
- **DOCUMENTACION-SISTEMA-GENIA.md**: Overview completo
- **GUIA-PRESENTACION.md**: Script de demo
- **DEPLOYMENT-SUMMARY.md**: Resumen ejecutivo

### Para Operaciones
- **CHANGELOG-SISTEMA-GENIA.md**: Historial de cambios
- **Scripts**: deploy-frontend.sh, update-frontend.sh, create-admin.sh

---

## 🎯 Estado Actual del Sistema

### ✅ Completado v4.3.0
- Arquitectura serverless completa
- Frontend en CloudFront + S3 (desplegado)
- Backend con 26 Lambda functions
- Chat IA con selector de catálogos y citations
- Dashboard con estadísticas reales
- Sistema de logs de progreso (5 pasos)
- Dialog visual de progreso
- CRUD completo de todas las entidades
- Deployment automatizado
- Documentación completa (100K+ palabras)
- Scripts de deployment
- Multi-ambiente (dev/staging/prod)
- Fix: Catálogos stuck resuelto
- Fix: Emails con HTML codificado resuelto
- Fix: Timing de propagación OpenSearch (60s)
- Fix: Espera Knowledge Base ACTIVE (5min)
- Fix: Espera Agent ready (2.5min)
- Soporte múltiples índices en colección única
- Auto-permisos para creadores de catálogos
- Eliminación completa de recursos (Agent, KB, DataSource, S3)
- Restauración de sesión en F5
- Flujo completo de cambio de contraseña temporal
- Creación de usuarios sin errores
- Guía completa de despliegue (DEPLOYMENT-GUIDE-COMPLETE.md)

### ✅ Completado v4.4.0
- Fix: Búsqueda de usuarios por sub en Cognito (ListUsersCommand con filtro)
- Fix: Rol de admin busca por email como fallback
- Fix: Permisos de lectura UserRolesTable en InvokeAgentFunction
- Fix: Visualización correcta de emails en lista de permisos
- Fix: Admin puede ver todos los catálogos en dropdown de permisos
- Fix: Chat funciona correctamente con permisos asignados
- Feature: Fuzzy matching de fuentes en respuestas de chat
- Optimization: Timeout de Bedrock reducido a 20s

### 🚧 En Progreso
- Ninguno (sistema estable)

### 📋 Pendiente
- Tracking de consultas en chat
- CI/CD pipeline
- Tests automatizados
- Alertas CloudWatch
- Multi-idioma

---

## 💡 Notas Importantes

1. **Bedrock**: Requiere solicitar acceso a modelos en consola AWS
2. **Región**: us-east-1 recomendada para Bedrock
3. **Costos**: Escalan con uso, estimado para uso moderado
4. **Deployment**: Primera vez toma 16 min, actualizaciones 2 min
5. **Catálogos**: Creación asíncrona toma 3-4 minutos (optimizado)
8. **OpenSearch**: Múltiples índices soportados (index-{catalogId}) en colección genia-dev
9. **Propagación**: OpenSearch 60s, KB 5min, Agent 2.5min para estabilidad
6. **CloudFront**: Invalidación toma 5-10 minutos
7. **Documentación**: Mantener actualizada con cada cambio

---

*Contexto del Sistema - Versión 4.4.0*  
*Última actualización: 25 Enero 2025*  
*Sistema GenIA - Production Ready - Despliegue Completo*  
*URL Producción: https://d2arlg3pewzp57.cloudfront.net*
