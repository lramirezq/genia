# ❓ FAQ - Sistema GenIA

## 📋 Índice
- [Arquitectura](#arquitectura)
- [Autenticación y Seguridad](#autenticación-y-seguridad)
- [Base de Datos](#base-de-datos)
- [Creación de Catálogos](#creación-de-catálogos)
- [Chat e IA](#chat-e-ia)
- [Permisos](#permisos)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura

### ¿Qué arquitectura usa el sistema?
Sistema **serverless** en AWS:
- **Frontend**: Vue.js 3 en S3 + CloudFront
- **Backend**: 26 Lambda Functions (Node.js 18.x)
- **API**: API Gateway REST con JWT Authorizer
- **Base de datos**: DynamoDB (4 tablas)
- **Storage**: S3 para documentos
- **IA**: Amazon Bedrock (Claude 3 + Titan Embeddings)
- **Búsqueda**: OpenSearch Serverless con FAISS

### ¿Cómo se comunican los componentes?
```
Usuario → CloudFront → S3 (Frontend)
         ↓
Usuario → API Gateway → Lambda → DynamoDB/S3/Bedrock
         ↓ (JWT Auth)
      Cognito valida token
```

### ¿Cuánto cuesta ejecutar el sistema?
- **Frontend**: ~$9/mes (CloudFront + S3)
- **Backend**: ~$255/mes (Lambda + DynamoDB + Bedrock + OpenSearch)
- **Total**: ~$264/mes con uso moderado

---

## 🔐 Autenticación y Seguridad

### ¿Dónde se almacenan las contraseñas?
**AWS Cognito User Pool** - Las contraseñas NUNCA se almacenan en DynamoDB ni en el código.

Cognito maneja:
- Hash seguro de contraseñas (bcrypt)
- Políticas de contraseñas
- MFA (opcional)
- Recuperación de contraseñas
- Tokens JWT

### ¿Cómo funciona el login?
1. Usuario ingresa email/password
2. Frontend llama a `/auth/login`
3. Lambda valida con Cognito
4. Cognito retorna JWT token (idToken)
5. Frontend guarda token en localStorage
6. Todas las peticiones incluyen: `Authorization: Bearer {token}`

### ¿Qué contiene el JWT token?
```json
{
  "sub": "uuid-del-usuario",
  "email": "usuario@empresa.com",
  "given_name": "Juan",
  "family_name": "Pérez",
  "exp": 1234567890
}
```

### ¿Cómo se validan las peticiones?
API Gateway tiene un **JWT Authorizer** que:
1. Extrae token del header `Authorization`
2. Valida firma con Cognito
3. Verifica expiración
4. Pasa claims a Lambda en `event.requestContext.authorizer.claims`

---

## 💾 Base de Datos

### ¿Qué tablas tiene DynamoDB?

#### 1. **CatalogsTable** (`dev-genia-catalogs`)
```
PK: catalogId (UUID)
Atributos:
- name: Nombre del catálogo
- description: Descripción
- ownerId: sub del creador
- status: creating | ready | error
- agentId: ID del Bedrock Agent
- knowledgeBaseId: ID del Knowledge Base
- dataSourceId: ID del DataSource
- createdAt: Timestamp
- progress: Array de pasos de creación
```

#### 2. **PermissionsTable** (`dev-genia-permissions`)
```
PK: userId (sub o email)
SK: catalogId (UUID)
Atributos:
- permission: read | write
- assignedBy: sub del admin
- assignedAt: Timestamp
```

#### 3. **UserRolesTable** (`dev-genia-user-roles`)
```
PK: userId (email)
Atributos:
- role: admin | user
- email: Email del usuario
- firstName: Nombre
- lastName: Apellido
- createdAt: Timestamp
```

#### 4. **AuditLogsTable** (`dev-genia-audit-logs`)
```
PK: eventId (UUID)
SK: timestamp (ISO string)
GSI: UserIdIndex (userId + timestamp)
Atributos:
- userId: sub del usuario
- userEmail: Email
- action: LOGIN | LOGOUT | CREATE_CATALOG | etc.
- resourceType: AUTH | CATALOG | DOCUMENT | etc.
- resourceId: ID del recurso
- resourceName: Nombre del recurso
- details: JSON con info adicional
- ipAddress: IP del usuario
```

### ¿Por qué algunos userId son UUID y otros email?
**Problema histórico** que estamos migrando:
- **Cognito** usa `sub` (UUID) como identificador único
- **UserRolesTable** usa `email` como PK (legacy)
- **Solución actual**: Código busca primero por `sub`, luego por `email` como fallback

---

## 📁 Creación de Catálogos

### ¿Qué pasa cuando creo un catálogo?

#### Flujo completo (3-4 minutos):

**1. CreateCatalogFunction** (Lambda)
```javascript
// Crea registro en DynamoDB
{
  catalogId: uuid(),
  name: "Mi Catálogo",
  status: "creating",
  ownerId: userId
}

// Invoca CreateKBAsyncFunction
```

**2. CreateKBAsyncFunction** (Lambda - 15 min timeout)

**Paso 1: Crear folder S3** (5s)
```
s3://bucket/catalogs/{catalogId}/
```

**Paso 2: Crear índice OpenSearch** (60s)
```javascript
// Espera 60s para propagación
await createIndex({
  name: `index-${catalogId}`,
  engine: "faiss",
  spaceType: "l2",
  dimension: 1536
})
```

**Paso 3: Crear Knowledge Base** (30s)
```javascript
// Polling hasta estado ACTIVE (5 min max)
const kb = await bedrock.createKnowledgeBase({
  name: `kb-${catalogId}`,
  roleArn: BedrockKnowledgeBaseRole,
  storageConfiguration: {
    opensearchServerless: {
      collectionArn,
      vectorIndexName: `index-${catalogId}`
    }
  },
  embeddingModel: "amazon.titan-embed-text-v1"
})
```

**Paso 4: Crear DataSource** (10s)
```javascript
const ds = await bedrock.createDataSource({
  knowledgeBaseId: kb.id,
  name: `ds-${catalogId}`,
  dataSourceConfiguration: {
    s3: {
      bucketArn: `arn:aws:s3:::bucket`,
      inclusionPrefixes: [`catalogs/${catalogId}/`]
    }
  }
})
```

**Paso 5: Crear Agent** (30s)
```javascript
// Polling hasta salir de CREATING (2.5 min max)
const agent = await bedrock.createAgent({
  agentName: `agent-${catalogId}`,
  foundationModel: "anthropic.claude-3-sonnet-20240229-v1:0",
  instruction: "Eres un asistente...",
  knowledgeBaseId: kb.id
})

// Actualizar DynamoDB
await dynamodb.update({
  catalogId,
  status: "ready",
  agentId: agent.id,
  knowledgeBaseId: kb.id,
  dataSourceId: ds.id
})
```

### ¿Cómo se relaciona el Agent con el catálogo?

```
Catálogo (DynamoDB)
    ↓ (catalogId)
S3 Folder: catalogs/{catalogId}/
    ↓ (documentos)
DataSource → Knowledge Base → OpenSearch Index
    ↓ (embeddings)
Agent (Bedrock)
    ↓ (responde preguntas)
Chat (Frontend)
```

### ¿Qué pasa si falla la creación?
- Status se marca como `error`
- Progress muestra el paso que falló
- Recursos creados NO se eliminan automáticamente
- Admin debe eliminar el catálogo manualmente

---

## 💬 Chat e IA

### ¿Cómo funciona el chat?

**1. Usuario envía pregunta**
```javascript
POST /chat
{
  catalogId: "uuid",
  message: "¿Qué dice el documento X?",
  sessionId: "session-123"
}
```

**2. InvokeAgentFunction valida permisos**
```javascript
// ¿Es owner?
if (catalog.ownerId === userId) ✓

// ¿Es admin?
if (userRole === 'admin') ✓

// ¿Tiene permiso explícito?
if (permissions[userId][catalogId]) ✓

// Si no → 403 Forbidden
```

**3. Invoca Bedrock Agent**
```javascript
const response = await bedrock.invokeAgent({
  agentId: catalog.agentId,
  agentAliasId: "TSTALIASID",
  sessionId,
  inputText: message
})
```

**4. Procesa respuesta streaming**
```javascript
for await (const chunk of response.completion) {
  if (chunk.chunk?.bytes) {
    responseText += decode(chunk.chunk.bytes)
  }
  
  // Extrae citations de traces
  if (chunk.trace?.knowledgeBaseRetrievalTrace) {
    citations.push(extractSources())
  }
}
```

**5. Genera URLs de descarga**
```javascript
for (const citation of citations) {
  citation.downloadUrl = await getSignedUrl(s3, {
    Bucket: bucket,
    Key: `catalogs/${catalogId}/${citation.name}`,
    expiresIn: 3600 // 1 hora
  })
}
```

### ¿Por qué a veces no muestra fuentes?
Bedrock no siempre retorna `citations` en los traces. Implementamos **fuzzy matching**:
- Extrae palabras clave del nombre del archivo
- Busca coincidencias en el texto de respuesta
- Si encuentra ≥1 palabra, incluye el documento como fuente

### ¿Cuánto tarda en responder?
- **Saludos**: Instantáneo (respuesta hardcoded)
- **Preguntas simples**: 5-10 segundos
- **Preguntas complejas**: 15-25 segundos
- **Timeout**: 20 segundos (para evitar 504 Gateway Timeout)

---

## 🔑 Permisos

### ¿Cómo funcionan los roles?

**Admin**:
- Ve todos los catálogos
- Puede crear/eliminar usuarios
- Puede asignar/revocar permisos
- Accede a Registro de Eventos
- Accede a todos los chats

**User**:
- Ve solo sus catálogos
- Ve catálogos con permisos asignados
- Puede crear catálogos (se vuelve owner)
- Puede chatear con catálogos permitidos

### ¿Cómo se asignan permisos?

**Automático** (al crear catálogo):
```javascript
// AssignPermissionFunction se invoca automáticamente
await dynamodb.put({
  userId: creatorId,
  catalogId: newCatalogId,
  permission: "write",
  assignedBy: "SYSTEM",
  assignedAt: now()
})
```

**Manual** (admin asigna):
```javascript
POST /permissions
{
  userId: "user-uuid",
  catalogId: "catalog-uuid",
  permission: "read" | "write"
}
```

### ¿Qué diferencia hay entre read y write?
Actualmente **no hay diferencia** - ambos permiten:
- Ver el catálogo
- Chatear con el catálogo
- Ver documentos

**Futuro**: `write` permitirá subir/eliminar documentos.

---

## 🔧 Troubleshooting

### El catálogo se queda en "creating"
**Causa**: Lambda timeout o error en Bedrock

**Solución**:
1. Ver logs: CloudWatch → `/aws/lambda/sistema-genia-dev-CreateKBAsyncFunction`
2. Buscar error en el paso que falló
3. Eliminar catálogo y recrear

### Error 403 en chat
**Causa**: Usuario no tiene permisos

**Solución**:
1. Verificar en Permisos si el usuario tiene acceso
2. Si es admin, verificar que `UserRolesTable` tenga `role: admin`
3. Asignar permiso manualmente

### No veo fuentes en el chat
**Causa**: Bedrock no retorna citations

**Solución**: Sistema usa fuzzy matching automáticamente. Si aún no aparecen:
1. Verificar que los documentos existan en S3
2. Sincronizar catálogo (botón "Sincronizar")
3. Esperar 2-3 minutos para ingestion

### Error CORS
**Causa**: Falta OPTIONS handler o headers incorrectos

**Solución**:
1. Verificar que `OptionsHandler` tenga el path en `template.yaml`
2. Redesplegar backend: `sam build && sam deploy`
3. Esperar 1-2 minutos para propagación

### Catálogo no se elimina completamente
**Causa**: Recursos de Bedrock no se eliminan

**Solución**: Eliminar manualmente en consola AWS:
1. Bedrock → Agents → Eliminar agent
2. Bedrock → Knowledge Bases → Eliminar KB
3. S3 → Eliminar folder `catalogs/{catalogId}/`

### No aparecen eventos en Registro de Eventos
**Causa**: Logging no está funcionando

**Solución**:
1. Verificar que `AuditLogsTable` exista en DynamoDB
2. Cerrar sesión y volver a iniciar
3. Verificar logs: CloudWatch → `/aws/lambda/sistema-genia-dev-LogEventFunction`

---

## 📞 Contacto y Soporte

**Documentación adicional**:
- `README.md` - Inicio rápido
- `DEPLOYMENT-GUIDE.md` - Guía de despliegue
- `CONTEXTO-SISTEMA.md` - Contexto completo
- `CHANGELOG.md` - Historial de cambios

**Logs útiles**:
```bash
# Ver logs de una función
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# Ver últimos errores
aws logs tail /aws/lambda/FUNCTION_NAME --since 10m | grep ERROR

# Ver tabla DynamoDB
aws dynamodb scan --table-name TABLE_NAME --max-items 10
```

---

*FAQ - Sistema GenIA v4.4.0*  
*Última actualización: 25 Enero 2025*
