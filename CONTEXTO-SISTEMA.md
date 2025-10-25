# CONTEXTO SISTEMA GENIA - ESTADO ACTUAL

## INFORMACIÓN DEL PROYECTO

**Sistema GenIA** - Gestión de documentos con IA generativa
- **Stack**: Vue.js 3 + AWS SAM + Lambda + S3 + DynamoDB + Cognito + Bedrock
- **Región**: us-east-1
- **Presupuesto**: $261.25/mes
- **Estado**: 100% completado - Sistema con auditoría completa y seguridad mejorada
- **Versión**: 5.0.0

## INFRAESTRUCTURA DESPLEGADA

**Stack AWS**: `sistema-genia-dev`
- **API Gateway**: https://z5bmc2llf7.execute-api.us-east-1.amazonaws.com/dev
- **CloudFront**: https://genia.3htp.cloud (dominio personalizado)
- **Cognito User Pool**: us-east-1_hKTZfhNZy
- **Client ID**: 3rvqe9lr9j8k8i8siboura4jph
- **S3 Bucket**: dev-genia-docs-369595298303
- **OpenSearch Serverless**: genia-dev collection (VECTORSEARCH)
- **Bedrock**: Knowledge Bases + Agents por catálogo
- **Usuario Admin**: lramirez@3htp.com

## FUNCIONALIDADES IMPLEMENTADAS

### ✅ AUTENTICACIÓN Y AUDITORÍA
- Login con Cognito JWT (idToken)
- Roles de usuario (admin/user)
- Guards de autenticación en rutas
- Interceptor axios con tokens
- **Sistema de audit logs**: Registro automático de LOGIN/LOGOUT
- **Vista de auditoría**: Solo admin, con filtros y búsqueda
- **Tracking completo**: userId, userEmail, action, resourceType, ipAddress, timestamp

### ✅ CRUD USUARIOS COMPLETO
- **Create**: POST /users (envío automático de email)
- **Read**: GET /users, GET /users/role
- **Update**: PUT /users/{email} (nombre, apellido, rol)
- **Delete**: DELETE /users/{email} (Cognito + DynamoDB)
- **Reset**: POST /users/{email}/reset-password

### ✅ CRUD CATÁLOGOS
- **Create**: POST /catalogs (asíncrono: S3 + OpenSearch Index + KB + Agent + Ingestion)
- **Read**: GET /catalogs, GET /catalogs/{id}/status
- **Update**: ❌ Pendiente
- **Delete**: DELETE /catalogs/{id} (elimina S3 + permisos)
- **Bedrock**: Knowledge Base + DataSource + Agent + Preparation automático
- **Estado**: Polling mejorado cada 5s (creating → ready)
- **Admin**: Ve todos los catálogos con fallback email/sub
- **Owner info**: Muestra email del creador en detalle de catálogo

### ✅ CRUD DOCUMENTOS
- **Create**: POST /catalogs/{id}/upload (presigned URL → S3)
- **Read**: GET /catalogs/{id}/documents
- **Update**: ❌ Pendiente
- **Delete**: DELETE /catalogs/{id}/documents/{name}

### ✅ CRUD PERMISOS
- **Create**: POST /permissions
- **Read**: GET /permissions
- **Update**: ❌ Pendiente
- **Delete**: DELETE /permissions

### ✅ FRONTEND AVANZADO
- **Vistas**: Login, Dashboard, Catálogos, CatalogDetail, CatalogChat, Usuarios, Permisos, AuditLogs
- **Componentes**: Drag & Drop upload, chat interface, tablas de datos, formularios
- **Navegación**: Router con guards, breadcrumbs
- **Estado**: Pinia stores (auth, usuarios, catálogos)
- **Chat mejorado**: Markdown, timestamps, exportar PDF, fuentes con fuzzy matching
- **Estados visuales**: Chips de colores, animaciones pulse, barras de progreso
- **Polling mejorado**: Continuo cada 5s mientras haya catálogos en "creating"
- **CRUD usuarios**: Interfaz completa con editar/eliminar/reset password
- **Audit logs**: Vista con filtros, chips de colores, tabla completa (solo admin)

## ENDPOINTS API DISPONIBLES

### Autenticación y Auditoría
- POST /auth/login ✅
- GET /users/role ✅
- POST /audit-logs ✅ (registrar eventos)
- GET /audit-logs ✅ (listar eventos - solo admin)
- GET /audit-logs?userId={id} ✅ (filtrar por usuario)

### Usuarios
- POST /users ✅
- GET /users ✅

### Catálogos
- POST /catalogs ✅
- GET /catalogs ✅
- DELETE /catalogs/{id} ✅

### Documentos
- GET /catalogs/{id}/documents ✅
- POST /catalogs/{id}/upload ✅
- DELETE /catalogs/{id}/documents/{name} ✅

### Permisos
- POST /permissions ✅
- GET /permissions ✅
- DELETE /permissions ✅

### Chat
- POST /chat ✅ (markdown, timestamps, fuentes inteligentes)

### Usuarios Avanzado
- PUT /users/{email} ✅ (actualizar datos)
- DELETE /users/{email} ✅ (eliminación completa)
- POST /users/{email}/reset-password ✅

### Documentos Mejorado
- POST /catalogs/{id}/sync ✅ (sincronización manual)
- GET /catalogs/{id}/download/{fileName} ✅ (descarga directa)

### Status
- GET /catalogs/{id}/status ✅ (monitoreo de creación asíncrona)

## CORS CONFIGURADO

### ✅ OPTIONS Handlers
- /auth/login
- /users
- /catalogs
- /users/role
- /permissions
- /catalogs/{id}
- /catalogs/{id}/documents
- /catalogs/{id}/upload
- /catalogs/{id}/documents/{name}

### ✅ S3 CORS
```yaml
CorsRules:
  - AllowedHeaders: ['*']
    AllowedMethods: [GET, PUT, POST, DELETE, HEAD]
    AllowedOrigins: ['*']
    ExposedHeaders: [ETag]
    MaxAge: 3000
```

## FUNCIONES LAMBDA DESPLEGADAS (28 FUNCIONES)

1. **LoginFunction** - Autenticación Cognito
2. **CreateUserFunction** - Crear usuarios
3. **ListUsersFunction** - Listar usuarios
4. **GetUserRoleFunction** - Obtener rol de usuario
5. **CreateCatalogFunction** - Crear catálogos + folder S3
6. **ListCatalogsFunction** - Listar catálogos (admin ve todos con fallback email)
7. **DeleteCatalogFunction** - Eliminar catálogo + S3 + permisos
8. **UploadDocumentFunction** - Generar presigned URLs
9. **ListDocumentsFunction** - Listar documentos S3
10. **DeleteDocumentFunction** - Eliminar documentos S3
11. **AssignPermissionFunction** - Asignar permisos
12. **ListPermissionsFunction** - Listar permisos (busca usuarios por sub en Cognito)
13. **RevokePermissionFunction** - Revocar permisos
14. **OptionsHandler** - Manejar preflight CORS
15. **InvokeAgentFunction** - Chat con Bedrock (timeout 20s, fuzzy matching, fallback email)
16. **SyncDataSourceFunction** - Sync Bedrock DataSource automático
17. **CreateKBAsyncFunction** - Creación asíncrona de KB + Agent (15 min timeout)
18. **GetCatalogStatusFunction** - Verificación de estado de catálogos
19. **UpdateUserFunction** - Actualizar datos de usuario
20. **DeleteUserFunction** - Eliminar usuario completo
21. **ResetPasswordFunction** - Resetear contraseña
22. **SyncCatalogFunction** - Sincronización manual de catálogos
23. **DownloadDocumentFunction** - URLs de descarga directa
24. **LogEventFunction** - Registrar eventos de auditoría (con uuid)
25. **ListAuditLogsFunction** - Listar eventos (solo admin, con fallback email)
26-28. **Funciones adicionales de soporte**

## ESTRUCTURA DE ARCHIVOS

### Backend
```
backend/
├── src/
│   ├── auth/login/
│   ├── users/{create,list,get-role}/
│   ├── catalogs/{create,list,delete,upload,list-documents,delete-document}/
│   ├── permissions/{assign,list,revoke}/
│   ├── chat/chat-router/
│   ├── bedrock/sync-datasource/
│   └── shared/options-handler.js
├── template.yaml
└── samconfig.toml
```

### Frontend
```
frontend/
├── src/
│   ├── components/auth/LoginForm.vue
│   ├── views/{Dashboard,Catalogs,CatalogDetail,Users,Permissions,Chat}.vue
│   ├── stores/{auth,users,catalogs}.js
│   ├── router/index.js
│   └── config/api.js
└── package.json
```

## TABLAS DYNAMODB (4 TABLAS)

1. **dev-genia-catalogs**
   - PK: catalogId
   - Campos: name, description, ownerId, s3Prefix, status, knowledgeBaseId, dataSourceId, agentId, createdAt, documentCount
   - **Bedrock IDs**: Cada catálogo tiene KB, DS y Agent únicos

2. **dev-genia-permissions**
   - PK: userId, SK: catalogId
   - Campos: permission (read/write)

3. **dev-genia-user-roles**
   - PK: userId (email - legacy)
   - Campos: role, email, firstName, lastName, createdAt
   - **NOTA**: Usa email como PK pero Cognito usa sub (UUID). Código tiene fallback.

4. **dev-genia-audit-logs**
   - PK: eventId (UUID)
   - SK: timestamp (ISO string)
   - GSI: UserIdIndex (userId + timestamp)
   - Campos: userId, userEmail, action, resourceType, resourceId, resourceName, details, ipAddress
   - **Acciones**: LOGIN, LOGOUT, CREATE_CATALOG, DELETE_CATALOG, UPLOAD_DOCUMENT, DELETE_DOCUMENT, ASSIGN_PERMISSION, REVOKE_PERMISSION, CREATE_USER, UPDATE_USER, DELETE_USER, RESET_PASSWORD, CHAT_MESSAGE

## FLUJO DE UPLOAD DE DOCUMENTOS

1. Frontend solicita presigned URL: POST /catalogs/{id}/upload
2. Backend genera URL firmada para S3
3. Frontend sube archivo directamente a S3 usando fetch()
4. Lista de documentos se actualiza automáticamente

## COMPLETADO EN V5.0.0

### ✅ SISTEMA DE AUDITORÍA COMPLETO
- **Tabla AuditLogsTable**: Con GSI UserIdIndex
- **LogEventFunction**: Registro de eventos con uuid
- **ListAuditLogsFunction**: Consulta de logs (solo admin)
- **Vista AuditLogs.vue**: Interfaz con filtros y chips de colores
- **Logging automático**: LOGIN/LOGOUT en auth.js store
- **auditLogger.js**: Decodificación JWT para extraer sub y email

### ✅ MEJORAS DE SEGURIDAD Y PERMISOS
- **Fallback email/sub**: Busca rol primero por sub, luego por email
- **ListCatalogsFunction**: Admin ve todos con fallback
- **InvokeAgentFunction**: Validación con fallback + DynamoDBReadPolicy
- **ListPermissionsFunction**: Búsqueda por sub en Cognito

### ✅ FUZZY MATCHING Y POLLING
- **Fuzzy matching**: Extracción de palabras clave, búsqueda en respuesta
- **Polling mejorado**: Continuo cada 5s mientras haya "creating"
- **Timeout reducido**: Bedrock streaming 20s para evitar 504

### ✅ DOCUMENTACIÓN COMPLETA
- **FAQ.md**: Arquitectura, autenticación, tablas, flujos, troubleshooting

### ❌ Mejoras Opcionales
- Update para usuarios, catálogos, permisos
- Gestión de roles más granular
- Validaciones de archivos (tipos, tamaños)
- Favicon y mejoras UX

### ❌ Mejoras Técnicas
- Manejo de errores más robusto
- Loading states y feedback visual
- Paginación en listas
- Búsqueda y filtros
- Tests unitarios
- Favicon y PWA

## COMANDOS ÚTILES

### Deploy Backend
```bash
cd backend
sam build && sam deploy --stack-name sistema-genia-dev --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3
```

### Run Frontend
```bash
cd frontend
npm run dev
```

### Logs Lambda
```bash
sam logs -n FunctionName --stack-name sistema-genia-dev --tail
```

## CREDENCIALES DE PRUEBA

- **Admin**: admin@genia.com / AdminPass123!
- **API Base**: https://z5bmc2llf7.execute-api.us-east-1.amazonaws.com/dev
- **Frontend**: http://localhost:3000

## NOTAS IMPORTANTES

1. **Token JWT**: Se usa idToken (no accessToken) para API Gateway
2. **CORS**: Configurado tanto en API Gateway como en S3
3. **Permisos**: Los catálogos se filtran por ownerId automáticamente
4. **S3 Structure**: catalogs/{catalogId}/filename
5. **Drag & Drop**: Funcional con presigned URLs
6. **Delete Cascade**: Eliminar catálogo borra S3 + permisos asociados
7. **Bedrock Integration**: Cada catálogo tiene KB + Agent único
8. **OpenSearch Serverless**: 1 collection compartida con índices por catálogo
9. **Índices Automáticos**: Se crean con mapping vectorial FAISS antes de KB
10. **Sync Automático**: DataSource se sincroniza después de upload
11. **Chat con Permisos**: Solo puede chatear con catálogos permitidos
12. **Autenticación AWS**: Requests firmados para OpenSearch Serverless
13. **Creación Asíncrona**: Catálogos se crean en background (3-4 min)
14. **Estados Visuales**: creating (amarillo) → ready (verde) → error (rojo)
15. **Timeouts Optimizados**: 20s streaming, 60s Lambda, 60s frontend
16. **Agent GenIA**: Responde naturalmente + consulta Knowledge Base
17. **Ingestion Automático**: Se ejecuta automáticamente en nuevos catálogos
18. **Polling Frontend**: Actualización continua cada 5s mientras haya "creating"
19. **Audit Logs**: Registro automático de LOGIN/LOGOUT, vista solo admin
20. **Fallback email/sub**: Código busca rol por sub, luego email (UserRolesTable legacy)
21. **Fuzzy Matching**: Fuentes detectadas por palabras clave cuando Bedrock no retorna citations
22. **Cognito Search**: ListUsersCommand con filtro `sub = "userId"` para UUID
23. **DynamoDB Permissions**: InvokeAgentFunction con DynamoDBReadPolicy para UserRolesTable
24. **LogEventFunction**: Requiere package.json con uuid ^9.0.0
25. **Dominio personalizado**: genia.3htp.cloud con CloudFront

## ARQUITECTURA BEDROCK IMPLEMENTADA

```
Catálogo A
├── S3: catalogs/uuid-a/
├── OpenSearch Index: index-uuid-a
├── Knowledge Base: kb-uuid-a
├── DataSource: ds-uuid-a
└── Agent: agent-uuid-a

OpenSearch Serverless Collection: genia-dev
├── index-uuid-a (solo documentos catálogo A)
├── index-uuid-b (solo documentos catálogo B)
└── index-uuid-c (solo documentos catálogo C)
```

**Flujo Completo Asíncrono**:
1. Usuario crea catálogo → Respuesta inmediata (estado: creating)
2. Background: Crea S3 folder + índice OpenSearch (FAISS)
3. Background: Crea Knowledge Base + DataSource + Agent
4. Background: Prepara Agent + inicia ingestion job
5. Estado actualiza a 'ready' → Frontend polling detecta cambio
6. Usuario sube documentos → Sync automático
7. Usuario chatea → Validación permisos + Agent específico (timeout 25s)

---
*Última actualización: 26 Ene 2025*
*Versión: 5.0.0 - Sistema de Auditoría y Seguridad Mejorada*
*Estado: PRODUCCIÓN READY - Sistema completo con auditoría y seguridad*