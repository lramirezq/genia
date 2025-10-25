# 🤖 Sistema GenIA v5.0.0

Sistema de gestión de catálogos de documentos con IA conversacional usando AWS Bedrock, OpenSearch Serverless y Claude 3 Sonnet.

## 🚀 Características Principales

- **Gestión de Catálogos**: Crea y administra catálogos de documentos con Knowledge Bases de AWS Bedrock
- **Chat con IA**: Interactúa con tus documentos usando Claude 3 Sonnet con fuzzy matching de fuentes
- **Autenticación**: Sistema completo con AWS Cognito, roles (admin/user), y gestión de sesiones
- **Sistema de Auditoría**: Registro completo de eventos (LOGIN, LOGOUT, CREATE_CATALOG, etc.)
- **Permisos Granulares**: Control de acceso por catálogo (read/write) con asignación automática al creador
- **Eliminación Completa**: Limpieza total de recursos (Agent, KB, DataSource, S3, permisos)
- **Persistencia de Sesión**: Mantiene login activo al refrescar la página (F5)
- **CRUD Usuarios**: Crear, editar, eliminar y resetear contraseñas

## 📋 Requisitos Previos

- AWS CLI v2.x
- AWS SAM CLI v1.x
- Node.js v18.x+
- Cuenta AWS con permisos de administrador
- Modelos de Bedrock habilitados:
  - `anthropic.claude-3-sonnet-20240229-v1:0`
  - `amazon.titan-embed-text-v1`

## 🏗️ Arquitectura

### Backend (AWS Serverless)
- **28 Lambda Functions** (Node.js 18.x)
- **API Gateway REST** con CORS y JWT Authorizer
- **DynamoDB** (4 tablas): Catalogs, Permissions, UserRoles, AuditLogs
- **S3**: Almacenamiento de documentos
- **Cognito**: Autenticación y autorización
- **Bedrock**: Agents y Knowledge Bases por catálogo
- **OpenSearch Serverless**: Índices vectoriales (FAISS)

### Frontend (Vue.js 3)
- **Vue 3** + Composition API
- **Pinia** para state management
- **Vue Router** con guards de autenticación
- **CloudFront + S3** para hosting
- **Dominio personalizado**: genia.3htp.cloud

## 📦 Instalación Rápida

### 1. Configurar Archivos de Configuración

```bash
# Backend
cp backend/samconfig.example.toml backend/samconfig.toml
# Editar backend/samconfig.toml con tus valores

# Frontend
cp frontend/src/config.example.js frontend/src/config.js
# Editar frontend/src/config.js con tus valores

# Configuración general
cp config.example.json config.json
# Editar config.json con tus valores
```

### 2. Desplegar Backend

```bash
cd backend
sam build
sam deploy --guided
```

### 3. Desplegar Frontend

```bash
cd frontend
npm install
npm run build

# Subir a S3 (después de crear infraestructura)
aws s3 sync dist/ s3://tu-bucket-frontend/ --delete
```

## 📚 Documentación Completa

- **[FAQ.md](FAQ.md)**: Preguntas frecuentes con arquitectura, flujos y troubleshooting
- **[DEPLOYMENT-GUIDE-COMPLETE.md](DEPLOYMENT-GUIDE-COMPLETE.md)**: Guía paso a paso para despliegue completo
- **[AGENT-CONFIGURATION.md](AGENT-CONFIGURATION.md)**: Configuración de Agents y Knowledge Bases
- **[CHANGELOG.md](CHANGELOG.md)**: Historial de cambios por versión
- **[CONTEXTO-SISTEMA.md](CONTEXTO-SISTEMA.md)**: Contexto técnico completo del sistema

## 🔧 Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y completa:

```bash
# Desarrollo
DEV_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
DEV_USER_POOL_ID=us-east-1_xxxxxxxxx
DEV_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Archivos de Configuración

- `backend/samconfig.toml`: Configuración de SAM CLI (NO commitear)
- `frontend/src/config.js`: Configuración del frontend (NO commitear)
- `config.json`: Configuración general del proyecto (NO commitear)

**IMPORTANTE**: Los archivos con datos reales están en `.gitignore`. Usa los archivos `.example` como plantilla.

## 👤 Crear Usuario Administrador

```bash
# Opción 1: Script automático
./create-admin.sh admin@tuempresa.com TuPassword123!

# Opción 2: Manual con AWS CLI
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username admin@tuempresa.com \
  --user-attributes Name=email,Value=admin@tuempresa.com \
  --temporary-password TempPass123!
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run test
```

## 🔄 Actualizaciones

### Backend
```bash
cd backend
sam build && sam deploy
```

### Frontend
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://tu-bucket/ --delete
aws cloudfront create-invalidation --distribution-id EXXXXX --paths "/*"
```

## 📊 Costos Estimados

- **Frontend**: ~$9/mes (S3 + CloudFront)
- **Backend**: ~$255/mes (Lambda + DynamoDB + OpenSearch + Bedrock)
- **Total**: ~$264/mes (uso moderado)

## ✨ Novedades v5.0.0

### Sistema de Auditoría
- **AuditLogsTable**: Registro de todos los eventos del sistema
- **Vista de auditoría**: Solo admin, con filtros por acción y usuario
- **Logging automático**: LOGIN/LOGOUT registrados automáticamente
- **Campos completos**: eventId, timestamp, userId, userEmail, action, resourceType, ipAddress

### Mejoras de Seguridad
- **Fallback email/sub**: Detección de roles admin con compatibilidad legacy
- **Búsqueda por sub**: ListUsersCommand con filtro en Cognito
- **DynamoDBReadPolicy**: InvokeAgentFunction con permisos correctos

### Fuzzy Matching de Fuentes
- **Extracción de palabras clave**: Del nombre de archivo (>3 chars)
- **Búsqueda inteligente**: Coincidencia en texto de respuesta
- **Fallback mejorado**: Cuando Bedrock no retorna citations

### Polling Mejorado
- **Verificación continua**: Cada 5s mientras haya catálogos en "creating"
- **Actualización automática**: UI se actualiza cuando están listos

### Optimizaciones
- **Timeout reducido**: Bedrock streaming 20s para evitar 504 Gateway Timeout
- **FAQ completo**: Documentación exhaustiva del sistema

## 🐛 Troubleshooting

### Error: "Model access denied"
Habilita los modelos en AWS Console → Bedrock → Model access

### Catálogo se queda en "creating"
Ver logs: CloudWatch → `/aws/lambda/sistema-genia-dev-CreateKBAsyncFunction`

### Error 403 en chat
Verifica que el usuario tenga permisos en el catálogo o sea admin/owner

### Audit logs no registra eventos
Verifica que LogEventFunction tenga package.json con uuid ^9.0.0

### "Usuario eliminado" en permisos
El código ahora busca usuarios por sub en Cognito correctamente

### Admin no ve todos los catálogos
El código tiene fallback: busca rol por sub, luego por email

**Ver [FAQ.md](FAQ.md) para más detalles de troubleshooting**

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y confidencial.

## 👥 Autores

- **Luis Ramirez** - Desarrollo completo

## 🔗 Enlaces Útiles

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Vue.js 3 Documentation](https://vuejs.org/)

## 📞 Soporte

Para soporte, contacta a: lramirez@3htp.com

---

**Versión**: 5.0.0  
**Última actualización**: 25 OCTUBRE  2025  
**Estado**: Production Ready ✅  

