# 🔧 Diagramas Técnicos - Sistema GenIA

## 📐 Arquitectura de Componentes

### Vista de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUDFRONT (Opcional)                       │
│                    CDN + SSL Certificate                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Vue.js 3 SPA Application                    │  │
│  │  - Vue Router (navegación)                               │  │
│  │  - Axios (HTTP client)                                   │  │
│  │  - JWT interceptors                                      │  │
│  │  - Markdown renderer                                     │  │
│  │  - PDF generator (jsPDF)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  REST API Endpoints (23)                                 │  │
│  │  - CORS enabled                                          │  │
│  │  - JWT Authorizer                                        │  │
│  │  - Rate limiting: 1000 req/s                             │  │
│  │  - Timeout: 29s                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Lambda     │    │   Lambda     │    │   Lambda     │
│   Layer 1    │    │   Layer 2    │    │   Layer 3    │
│              │    │              │    │              │
│ Auth/Users   │    │  Catalogs    │    │   Chat/AI    │
│ (6 funcs)    │    │  Documents   │    │  (2 funcs)   │
│              │    │  Permissions │    │              │
│              │    │  (12 funcs)  │    │              │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────┐
│              DATA & AI SERVICES LAYER                │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Cognito  │  │ DynamoDB │  │ Bedrock  │          │
│  │          │  │          │  │          │          │
│  │ Users    │  │ Catalogs │  │ Agents   │          │
│  │ Auth     │  │UserRoles │  │ KB       │          │
│  │          │  │Permissions│  │ Claude3  │          │
│  └──────────┘  └──────────┘  └────┬─────┘          │
│                                    │                 │
│  ┌──────────┐              ┌───────▼──────┐         │
│  │    S3    │              │  OpenSearch  │         │
│  │          │              │  Serverless  │         │
│  │Documents │              │   Vectors    │         │
│  │ Storage  │              │   FAISS      │         │
│  └──────────┘              └──────────────┘         │
└──────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo de Autenticación

```
┌─────────┐                                    ┌─────────┐
│ Usuario │                                    │ Cognito │
└────┬────┘                                    └────┬────┘
     │                                              │
     │ 1. POST /login                               │
     │    {email, password}                         │
     ├─────────────────────────────────────────────▶│
     │                                              │
     │                    2. Validate credentials   │
     │                       & Generate JWT         │
     │                                              │
     │ 3. Return tokens                             │
     │    {accessToken, idToken, refreshToken}      │
     │◀─────────────────────────────────────────────┤
     │                                              │
     │ 4. Store tokens in localStorage              │
     │                                              │
     │ 5. Subsequent requests with JWT              │
     │    Authorization: Bearer <token>             │
     ├─────────────────────────────────────────────▶│
     │                                              │
     │ 6. Validate JWT                              │
     │                                              │
     │ 7. Allow/Deny access                         │
     │◀─────────────────────────────────────────────┤
     │                                              │
```

---

## 📁 Flujo de Creación de Catálogo (Detallado)

### Tiempos de Espera y Propagación

**Tiempo Total Estimado: 3-4 minutos**

| Paso | Componente | Tiempo | Descripción |
|------|-----------|--------|-------------|
| 1 | S3 Folder | < 1s | Creación inmediata |
| 2 | OpenSearch Index | ~60s | Creación + 60s propagación |
| 3 | Knowledge Base | ~10s + 5min wait | Creación + espera estado ACTIVE |
| 4 | DataSource | < 1s | Creación inmediata |
| 5 | Ingestion Job | < 1s | Inicio inmediato |
| 6 | Agent | ~5s + 2.5min wait | Creación + espera estado ready |
| 7 | KB Association | < 1s | Asociación inmediata |
| 8 | Agent Prepare | ~5s | Preparación final |

**Notas Importantes:**
- OpenSearch Serverless requiere 60s de propagación para que Bedrock vea el índice
- Knowledge Base toma hasta 5 minutos en pasar de CREATING a ACTIVE (30 intentos × 10s)
- Agent toma hasta 2.5 minutos en salir de CREATING (30 intentos × 5s)
- Múltiples índices soportados: `index-{catalogId}` en colección única `genia-dev`
- Engine type: FAISS (requerido por Bedrock)
- Space type: l2, Method: hnsw, Dimension: 1536

```
┌────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Frontend│  │   API   │  │  Lambda  │  │ DynamoDB │  │  Lambda  │
│        │  │ Gateway │  │  Create  │  │          │  │ KBAsync  │
└───┬────┘  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
    │            │             │             │             │
    │ 1. POST    │             │             │             │
    │ /catalogs  │             │             │             │
    ├───────────▶│             │             │             │
    │            │ 2. Validate │             │             │
    │            │    JWT      │             │             │
    │            ├────────────▶│             │             │
    │            │             │ 3. Generate │             │
    │            │             │    IDs      │             │
    │            │             │             │             │
    │            │             │ 4. Save     │             │
    │            │             │ status:     │             │
    │            │             │ "creating"  │             │
    │            │             ├────────────▶│             │
    │            │             │             │             │
    │            │             │ 5. Invoke   │             │
    │            │             │ async       │             │
    │            │             ├────────────────────────────▶│
    │            │             │             │             │
    │ 6. Return  │             │             │             │
    │ immediate  │             │             │             │
    │ response   │             │             │             │
    │◀───────────┴─────────────┤             │             │
    │            │             │             │             │
    │ 7. Start   │             │             │             │
    │ polling    │             │             │             │
    │ (3s)       │             │             │             │
    │            │             │             │             │
    │            │             │             │ 8. Create   │
    │            │             │             │ S3 Folder   │
    │            │             │             │ (< 1s)      │
    │            │             │             │             │
    │            │             │             │ 9. Create   │
    │            │             │             │ OpenSearch  │
    │            │             │             │ Index       │
    │            │             │             │ (60s wait)  │
    │            │             │             │             │
    │            │             │             │ 10. Create  │
    │            │             │             │ Bedrock KB  │
    │            │             │             │ (5min wait) │
    │            │             │             │             │
    │            │             │             │ 11. Create  │
    │            │             │             │ DataSource  │
    │            │             │             │ (< 1s)      │
    │            │             │             │             │
    │            │             │             │ 12. Start   │
    │            │             │             │ Ingestion   │
    │            │             │             │ (< 1s)      │
    │            │             │             │             │
    │            │             │             │ 13. Create  │
    │            │             │             │ Agent       │
    │            │             │             │ (2.5m wait) │
    │            │             │             │             │
    │            │             │             │ 14. Update  │
    │            │             │             │ status:     │
    │            │             │             │ "ready"     │
    │            │             │             ├────────────▶│
    │            │             │             │             │
    │ 15. Poll   │             │             │             │
    │ GET status │             │             │             │
    ├───────────▶│             │             │             │
    │            │             │             │             │
    │ 14. Return │             │             │             │
    │ "ready"    │             │             │             │
    │◀───────────┤             │             │             │
    │            │             │             │             │
```

---

## 📤 Flujo de Upload de Documentos

```
┌────────┐  ┌─────────┐  ┌──────────┐  ┌─────┐  ┌──────────┐
│Frontend│  │   API   │  │  Lambda  │  │ S3  │  │  Bedrock │
│        │  │ Gateway │  │  Upload  │  │     │  │          │
└───┬────┘  └────┬────┘  └────┬─────┘  └──┬──┘  └────┬─────┘
    │            │             │           │          │
    │ 1. Request │             │           │          │
    │ presigned  │             │           │          │
    │ URL        │             │           │          │
    ├───────────▶│             │           │          │
    │            ├────────────▶│           │          │
    │            │             │ 2. Generate│         │
    │            │             │ presigned  │         │
    │            │             │ URL        │         │
    │            │             ├──────────▶│          │
    │            │             │           │          │
    │            │             │ 3. Return │          │
    │            │             │ URL       │          │
    │            │             │◀──────────┤          │
    │            │             │           │          │
    │ 4. Return  │             │           │          │
    │ URL        │             │           │          │
    │◀───────────┴─────────────┤           │          │
    │            │             │           │          │
    │ 5. PUT     │             │           │          │
    │ file       │             │           │          │
    │ directly   │             │           │          │
    ├────────────────────────────────────▶│          │
    │            │             │           │          │
    │ 6. Success │             │           │          │
    │◀────────────────────────────────────┤          │
    │            │             │           │          │
    │ 7. Click   │             │           │          │
    │ "Sync"     │             │           │          │
    ├───────────▶│             │           │          │
    │            ├────────────▶│           │          │
    │            │             │ 8. Start  │          │
    │            │             │ ingestion │          │
    │            │             ├──────────────────────▶│
    │            │             │           │          │
    │            │             │           │ 9. Process│
    │            │             │           │ documents │
    │            │             │           │ Generate  │
    │            │             │           │ embeddings│
    │            │             │           │ (5-10 min)│
    │            │             │           │          │
    │            │             │ 10. Index │          │
    │            │             │ vectors   │          │
    │            │             │ OpenSearch│          │
    │            │             │           │          │
    │ 11. Return │             │           │          │
    │ job ID     │             │           │          │
    │◀───────────┴─────────────┤           │          │
    │            │             │           │          │
```

---

## 💬 Flujo de Chat con IA

```
┌────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Frontend│  │   API   │  │  Lambda  │  │ Bedrock  │  │OpenSearch│
│        │  │ Gateway │  │ InvokeAgt│  │  Agent   │  │          │
└───┬────┘  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
    │            │             │             │             │
    │ 1. POST    │             │             │             │
    │ /chat      │             │             │             │
    │ {question} │             │             │             │
    ├───────────▶│             │             │             │
    │            │ 2. Validate │             │             │
    │            │ JWT +       │             │             │
    │            │ permissions │             │             │
    │            ├────────────▶│             │             │
    │            │             │ 3. Invoke   │             │
    │            │             │ Agent       │             │
    │            │             ├────────────▶│             │
    │            │             │             │ 4. Query KB │
    │            │             │             ├────────────▶│
    │            │             │             │             │
    │            │             │             │ 5. Vector   │
    │            │             │             │ similarity  │
    │            │             │             │ search      │
    │            │             │             │             │
    │            │             │             │ 6. Return   │
    │            │             │             │ relevant    │
    │            │             │             │ chunks      │
    │            │             │             │◀────────────┤
    │            │             │             │             │
    │            │             │             │ 7. Generate │
    │            │             │             │ response    │
    │            │             │             │ with Claude │
    │            │             │             │             │
    │            │             │ 8. Stream   │             │
    │            │             │ response    │             │
    │            │             │◀────────────┤             │
    │            │             │             │             │
    │ 9. Stream  │             │             │             │
    │ to client  │             │             │             │
    │◀───────────┴─────────────┤             │             │
    │            │             │             │             │
    │ 10. Display│             │             │             │
    │ with       │             │             │             │
    │ markdown   │             │             │             │
    │ + sources  │             │             │             │
    │            │             │             │             │
```

---

## 🗄️ Modelo de Datos DynamoDB

### Tabla: Catalogs

```
┌─────────────────────────────────────────────────────┐
│                    Catalogs                         │
├─────────────────────────────────────────────────────┤
│ catalogId (PK)          │ String  │ UUID           │
│ name                    │ String  │ Unique         │
│ description             │ String  │                │
│ createdBy               │ String  │ userId         │
│ createdAt               │ String  │ ISO timestamp  │
│ status                  │ String  │ creating/ready │
│ knowledgeBaseId         │ String  │ Bedrock KB ID  │
│ dataSourceId            │ String  │ Bedrock DS ID  │
│ agentId                 │ String  │ Bedrock Agt ID │
│ opensearchIndex         │ String  │ Index name     │
└─────────────────────────────────────────────────────┘
```

### Tabla: UserRoles

```
┌─────────────────────────────────────────────────────┐
│                   UserRoles                         │
├─────────────────────────────────────────────────────┤
│ userId (PK)             │ String  │ Email          │
│ email                   │ String  │                │
│ firstName               │ String  │                │
│ lastName                │ String  │                │
│ role                    │ String  │ admin/user     │
│ createdAt               │ String  │ ISO timestamp  │
└─────────────────────────────────────────────────────┘
```

### Tabla: Permissions

```
┌─────────────────────────────────────────────────────┐
│                  Permissions                        │
├─────────────────────────────────────────────────────┤
│ userId (PK)             │ String  │ Email          │
│ catalogId (SK)          │ String  │ UUID           │
│ grantedBy               │ String  │ Admin userId   │
│ grantedAt               │ String  │ ISO timestamp  │
└─────────────────────────────────────────────────────┘

GSI: catalogId-userId-index
```

---

## 🔒 Políticas IAM Simplificadas

### Lambda Execution Role (Auth Functions)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:ListUsers"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/UserRoles"
    }
  ]
}
```

### Lambda Execution Role (Bedrock Functions)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent",
        "bedrock:CreateKnowledgeBase",
        "bedrock:CreateAgent",
        "bedrock:StartIngestionJob"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "aoss:APIAccessAll"
      ],
      "Resource": "arn:aws:aoss:*:*:collection/*"
    }
  ]
}
```

---

## 📊 Métricas y Monitoreo

### CloudWatch Dashboards

```
┌─────────────────────────────────────────────────────┐
│              Sistema GenIA - Dashboard              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  API Gateway Metrics                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ Requests/min:  [████████░░] 850            │   │
│  │ Latency (p99): [██░░░░░░░░] 2.3s           │   │
│  │ Errors 4xx:    [█░░░░░░░░░] 12             │   │
│  │ Errors 5xx:    [░░░░░░░░░░] 0              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Lambda Metrics                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Invocations:   [████████░░] 1.2K           │   │
│  │ Duration avg:  [███░░░░░░░] 850ms          │   │
│  │ Errors:        [░░░░░░░░░░] 2              │   │
│  │ Throttles:     [░░░░░░░░░░] 0              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Bedrock Metrics                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ Agent calls:   [█████░░░░░] 450            │   │
│  │ Avg latency:   [████░░░░░░] 15s            │   │
│  │ Token usage:   [███████░░░] 125K           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  DynamoDB Metrics                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Read capacity: [██░░░░░░░░] 25 RCU         │   │
│  │ Write capacity:[█░░░░░░░░░] 10 WCU         │   │
│  │ Throttles:     [░░░░░░░░░░] 0              │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Ciclo de Vida de Recursos

### Creación de Catálogo

```
Estado: CREATING
├─ Crear registro en DynamoDB
├─ Crear índice OpenSearch (2 min)
├─ Crear Knowledge Base (3 min)
├─ Crear DataSource (1 min)
├─ Crear Agent (2 min)
└─ Actualizar estado: READY

Total: 8-10 minutos
```

### Eliminación de Catálogo

```
Estado: DELETING
├─ Eliminar Agent
├─ Eliminar DataSource
├─ Eliminar Knowledge Base
├─ Eliminar índice OpenSearch
├─ Eliminar archivos S3
├─ Eliminar permisos DynamoDB
└─ Eliminar registro catálogo

Total: 2-3 minutos
```

---

*Diagramas Técnicos v1.0 - Sistema GenIA*
