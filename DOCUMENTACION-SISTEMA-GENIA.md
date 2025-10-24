# 📚 Sistema GenIA - Documentación Técnica Completa

## 🎯 Resumen Ejecutivo

**Sistema GenIA** es una plataforma empresarial de gestión documental con inteligencia artificial generativa, que permite a las organizaciones crear catálogos de conocimiento personalizados y consultar información mediante chat conversacional natural.

### Características Principales
- 🤖 **Chat IA Conversacional** - Consultas en lenguaje natural sobre documentos
- 📁 **Gestión Multi-Catálogo** - Organización por departamentos/proyectos
- 👥 **Control de Acceso Granular** - Permisos por usuario y catálogo
- 🔒 **Seguridad Enterprise** - Autenticación JWT con AWS Cognito
- 📊 **Arquitectura Serverless** - Escalabilidad automática y alta disponibilidad
- 💰 **Costo Optimizado** - Pago por uso, sin infraestructura ociosa

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue.js 3)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Login   │ │ Usuarios │ │Catálogos │ │Documentos│ │   Chat   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (REST API)                           │
│                    JWT Authorizer (Cognito)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  AWS LAMBDA   │   │  AWS LAMBDA   │   │  AWS LAMBDA   │
│  (Auth/Users) │   │  (Catalogs)   │   │  (Chat/AI)    │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   COGNITO     │   │   DYNAMODB    │   │   BEDROCK     │
│  User Pool    │   │  3 Tables     │   │  Agents + KB  │
└───────────────┘   └───────────────┘   └───────┬───────┘
                            │                   │
                            ▼                   ▼
                    ┌───────────────┐   ┌───────────────┐
                    │      S3       │   │  OPENSEARCH   │
                    │  Documents    │   │  Serverless   │
                    └───────────────┘   └───────────────┘
```

### Componentes Principales

#### 1. Frontend (Vue.js 3)
- **Framework**: Vue.js 3 con Composition API
- **Routing**: Vue Router para navegación SPA
- **HTTP Client**: Axios con interceptores JWT
- **UI Components**: Componentes personalizados + Markdown rendering
- **Features**: Drag & Drop, PDF Export, Real-time polling

#### 2. API Gateway
- **Tipo**: REST API con CORS habilitado
- **Autenticación**: JWT Authorizer con Cognito
- **Endpoints**: 23 endpoints RESTful
- **Timeout**: 60 segundos para operaciones largas

#### 3. AWS Lambda (20 Funciones)
- **Runtime**: Node.js 18.x
- **Arquitectura**: x86_64
- **Timeout**: 60s (chat), 900s (KB creation)
- **Memory**: 256MB - 1024MB según función

#### 4. Amazon Cognito
- **User Pool**: Gestión de usuarios y autenticación
- **JWT Tokens**: Access tokens con 1 hora de validez
- **Email Verification**: Plantillas personalizadas
- **Password Policy**: Mínimo 8 caracteres, mayúsculas, números, símbolos

#### 5. DynamoDB (3 Tablas)
- **Catalogs**: Información de catálogos y estado
- **UserRoles**: Roles y perfiles de usuarios
- **Permissions**: Matriz de permisos usuario-catálogo

#### 6. Amazon Bedrock
- **Knowledge Bases**: Base de conocimiento por catálogo
- **Agents**: Agentes conversacionales con instrucciones personalizadas
- **Model**: Claude 3 Sonnet para generación de respuestas
- **Embeddings**: Titan Embeddings para vectorización

#### 7. OpenSearch Serverless
- **Collection**: genia-{env} collection
- **Índices**: Uno por catálogo con vectores FAISS
- **Dimensiones**: 1536 (Titan Embeddings)
- **Políticas**: Acceso granular por rol Lambda

#### 8. Amazon S3
- **Bucket**: {env}-genia-docs-{account-id}
- **Estructura**: catalogs/{catalogId}/{timestamp}-{filename}
- **CORS**: Habilitado para uploads directos
- **Lifecycle**: Opcional para archivado

---

## 🔄 Flujos de Proceso

### Flujo 1: Creación de Usuario

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  Admin  │─────▶│   API   │─────▶│ Lambda  │─────▶│ Cognito │
│Interface│      │Gateway  │      │CreateUsr│      │         │
└─────────┘      └─────────┘      └─────────┘      └────┬────┘
                                         │                │
                                         ▼                │
                                   ┌─────────┐           │
                                   │DynamoDB │           │
                                   │UserRoles│           │
                                   └─────────┘           │
                                                         ▼
                                                   ┌─────────┐
                                                   │  Email  │
                                                   │ Welcome │
                                                   └─────────┘
```

**Pasos**:
1. Admin ingresa datos del usuario (email, nombre, apellido, rol)
2. Lambda crea usuario en Cognito con password temporal
3. Lambda guarda rol en DynamoDB
4. Cognito envía email automático con credenciales
5. Usuario recibe email y puede hacer login

### Flujo 2: Creación de Catálogo (Asíncrono)

```
┌─────────┐      ┌─────────┐      ┌──────────────┐
│  User   │─────▶│   API   │─────▶│CreateCatalog │
│Interface│      │Gateway  │      │   Lambda     │
└─────────┘      └─────────┘      └──────┬───────┘
     ▲                                    │
     │                                    ▼
     │                             ┌─────────────┐
     │                             │  DynamoDB   │
     │                             │status:      │
     │                             │"creating"   │
     │                             └──────┬──────┘
     │                                    │
     │                                    ▼
     │                             ┌─────────────┐
     │                             │CreateKBAsync│
     │                             │   Lambda    │
     │                             │  (15 min)   │
     │                             └──────┬──────┘
     │                                    │
     │         ┌──────────────────────────┼──────────────────┐
     │         ▼                          ▼                  ▼
     │   ┌──────────┐            ┌──────────────┐    ┌──────────┐
     │   │OpenSearch│            │   Bedrock    │    │    S3    │
     │   │  Index   │            │KB+DataSource │    │  Prefix  │
     │   └──────────┘            │   + Agent    │    └──────────┘
     │                           └──────┬───────┘
     │                                  │
     │                                  ▼
     │                           ┌─────────────┐
     │                           │  DynamoDB   │
     │                           │status:      │
     │                           │"ready"      │
     │                           └──────┬──────┘
     │                                  │
     └──────────────────────────────────┘
              Polling cada 3s
```

**Pasos**:
1. Usuario crea catálogo (nombre, descripción)
2. Lambda CreateCatalog responde inmediatamente con estado "creating"
3. Lambda CreateKBAsync se ejecuta en background (5-10 min):
   - Crea índice en OpenSearch Serverless
   - Crea Knowledge Base en Bedrock
   - Crea DataSource conectado a S3
   - Crea Agent con instrucciones personalizadas
4. Frontend hace polling cada 3s para actualizar estado
5. Cuando termina, estado cambia a "ready"

### Flujo 3: Upload y Sincronización de Documentos

```
┌─────────┐      ┌─────────┐      ┌──────────┐
│  User   │─────▶│   API   │─────▶│  Lambda  │
│Drag&Drop│      │Gateway  │      │  Upload  │
└─────────┘      └─────────┘      └────┬─────┘
     │                                  │
     │                                  ▼
     │                           ┌─────────────┐
     │                           │  Presigned  │
     │                           │     URL     │
     │                           └──────┬──────┘
     │                                  │
     ▼                                  ▼
┌─────────┐                      ┌─────────┐
│ Upload  │─────────────────────▶│   S3    │
│ Direct  │      PUT Object      │ Bucket  │
└─────────┘                      └────┬────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │SyncDataSrc  │
                               │   Lambda    │
                               └──────┬──────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │   Bedrock   │
                               │  Ingestion  │
                               │     Job     │
                               └──────┬──────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │ OpenSearch  │
                               │  Vectores   │
                               │  Indexados  │
                               └─────────────┘
```

### Flujo 4: Chat con IA

```
┌─────────┐      ┌─────────┐      ┌──────────┐
│  User   │─────▶│   API   │─────▶│  Lambda  │
│Question │      │Gateway  │      │InvokeAgt │
└─────────┘      └─────────┘      └────┬─────┘
     ▲                                  │
     │                                  ▼
     │                           ┌─────────────┐
     │                           │   Bedrock   │
     │                           │    Agent    │
     │                           └──────┬──────┘
     │                                  │
     │         ┌────────────────────────┼────────────────┐
     │         ▼                        ▼                ▼
     │   ┌──────────┐          ┌──────────────┐  ┌──────────┐
     │   │OpenSearch│          │  Knowledge   │  │  Claude  │
     │   │  Query   │          │     Base     │  │    3     │
     │   └────┬─────┘          └──────┬───────┘  └────┬─────┘
     │        │                       │               │
     │        └───────────────────────┴───────────────┘
     │                                │
     │                                ▼
     │                         ┌─────────────┐
     │                         │  Response   │
     │                         │+ Sources    │
     │                         │+ Citations  │
     │                         └──────┬──────┘
     │                                │
     └────────────────────────────────┘
           Streaming Response
```

---

## 📋 Features Implementados

### ✅ Autenticación y Usuarios
- [x] Login con email/password (Cognito)
- [x] JWT tokens con refresh automático
- [x] Crear usuarios con email automático
- [x] Editar usuarios (nombre, apellido, rol)
- [x] Eliminar usuarios (Cognito + DynamoDB)
- [x] Reset password con un clic
- [x] Roles: admin, user
- [x] Validación de sesión en todas las rutas

### ✅ Gestión de Catálogos
- [x] Crear catálogos (asíncrono)
- [x] Listar catálogos con estados visuales
- [x] Eliminar catálogos (completo: KB, Agent, índice, S3)
- [x] Estados: creating, ready, error
- [x] Polling automático de estados
- [x] Barra de progreso durante creación
- [x] Validación de nombres únicos

### ✅ Gestión de Documentos
- [x] Upload con drag & drop
- [x] Presigned URLs para upload directo
- [x] Preservación de nombres originales
- [x] Listar documentos por catálogo
- [x] Eliminar documentos
- [x] Sincronización manual (ingestion jobs)
- [x] Estado de sincronización
- [x] Descarga directa desde chat

### ✅ Sistema de Permisos
- [x] Asignar permisos usuario-catálogo
- [x] Revocar permisos
- [x] Listar permisos por usuario
- [x] Validación en backend (todas las operaciones)
- [x] Filtrado de catálogos según permisos
- [x] Interfaz visual de asignación

### ✅ Chat con IA
- [x] Interfaz conversacional
- [x] Markdown rendering (negrita, listas, código)
- [x] Timestamps en cada mensaje
- [x] Streaming de respuestas
- [x] Detección inteligente de fuentes
- [x] Enlaces de descarga directa
- [x] Exportar conversación a PDF
- [x] Saludos naturales personalizados
- [x] Timeout handling (60s)
- [x] Manejo de errores con fallback

### ✅ Infraestructura
- [x] Arquitectura serverless completa
- [x] CORS configurado en todos los endpoints
- [x] Logs centralizados en CloudWatch
- [x] Deployment automatizado con SAM
- [x] Variables de entorno por stack
- [x] Políticas IAM de mínimo privilegio
- [x] Encriptación en tránsito y reposo

---

## 🚀 Deployment en Nueva Cuenta AWS

### Pre-requisitos

1. **Cuenta AWS activa** con permisos de administrador
2. **AWS CLI** instalado y configurado
   ```bash
   aws configure
   ```
3. **AWS SAM CLI** instalado
   ```bash
   brew install aws-sam-cli  # macOS
   pip install aws-sam-cli   # Linux/Windows
   ```
4. **Node.js 18+** y npm instalados
5. **Región AWS**: us-east-1 (recomendado para Bedrock)

### Paso 1: Habilitar Servicios AWS

#### 1.1 Habilitar Amazon Bedrock
```bash
# Acceder a la consola de Bedrock
# https://console.aws.amazon.com/bedrock/

# Solicitar acceso a modelos:
# - Claude 3 Sonnet
# - Titan Embeddings G1 - Text
```

#### 1.2 Verificar Límites de Servicio
```bash
# Verificar límites de Lambda
aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --region us-east-1

# Verificar límites de OpenSearch Serverless
aws service-quotas get-service-quota \
  --service-code aoss \
  --quota-code L-8F1A8E46 \
  --region us-east-1
```

### Paso 2: Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone <repository-url>
cd sistema-genia

# Revisar estructura
ls -la
# backend/    - Código Lambda + SAM template
# frontend/   - Aplicación Vue.js
```

### Paso 3: Configurar Variables de Entorno

Editar `backend/template.yaml`:

```yaml
Parameters:
  Environment:
    Type: String
    Default: prod  # Cambiar según ambiente
    AllowedValues:
      - dev
      - staging
      - prod
```

### Paso 4: Desplegar Backend

```bash
cd backend

# Build
sam build

# Deploy (primera vez con --guided)
sam deploy \
  --stack-name sistema-genia-prod \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3 \
  --guided

# Responder preguntas:
# - Stack Name: sistema-genia-prod
# - AWS Region: us-east-1
# - Parameter Environment: prod
# - Confirm changes: Y
# - Allow SAM CLI IAM role creation: Y
# - Disable rollback: N
# - Save arguments to config: Y
```

### Paso 5: Obtener Outputs del Stack

```bash
# Obtener valores de salida
aws cloudformation describe-stacks \
  --stack-name sistema-genia-prod \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output table

# Guardar valores importantes:
# - ApiUrl
# - UserPoolId
# - ClientId
# - BucketName
```

### Paso 6: Configurar Frontend

```bash
cd frontend

# Crear archivo de configuración
cat > src/config.js << EOF
export default {
  apiUrl: 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod',
  cognito: {
    userPoolId: 'us-east-1_XXXXXXXXX',
    clientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX'
  }
}
EOF

# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build
```

### Paso 7: Crear Usuario Administrador Inicial

```bash
# Crear usuario admin manualmente
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@tuempresa.com \
  --user-attributes \
    Name=email,Value=admin@tuempresa.com \
    Name=email_verified,Value=true \
    Name=given_name,Value=Admin \
    Name=family_name,Value=Sistema \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region us-east-1

# Establecer password permanente
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@tuempresa.com \
  --password "AdminPass123!" \
  --permanent \
  --region us-east-1

# Crear rol en DynamoDB
aws dynamodb put-item \
  --table-name sistema-genia-prod-UserRoles \
  --item '{
    "userId": {"S": "admin@tuempresa.com"},
    "email": {"S": "admin@tuempresa.com"},
    "firstName": {"S": "Admin"},
    "lastName": {"S": "Sistema"},
    "role": {"S": "admin"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }' \
  --region us-east-1
```

### Paso 8: Verificar Deployment

```bash
# Test de API
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/health

# Test de login
curl -X POST \
  https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@tuempresa.com",
    "password": "AdminPass123!"
  }'
```

---

## ⚙️ Configuraciones Importantes

### Timeouts y Límites

| Componente | Timeout | Memoria | Concurrencia |
|------------|---------|---------|--------------|
| API Gateway | 29s | - | Ilimitada |
| Lambda (Chat) | 60s | 512MB | 100 |
| Lambda (KB Async) | 900s | 1024MB | 10 |
| Lambda (Otros) | 30s | 256MB | 100 |
| Bedrock Agent | 25s | - | 10 req/s |

### Costos Estimados (Uso Moderado)

| Servicio | Costo Mensual | Notas |
|----------|---------------|-------|
| Lambda | $20 | 1M invocaciones |
| API Gateway | $15 | 1M requests |
| DynamoDB | $5 | On-demand |
| S3 | $10 | 100GB storage |
| OpenSearch Serverless | $150 | 1 OCU |
| Bedrock | $50 | 10K consultas |
| Cognito | $5 | 1K usuarios |
| **TOTAL** | **~$255/mes** | |

### Políticas de Seguridad

1. **Cognito Password Policy**:
   - Mínimo 8 caracteres
   - Requiere mayúsculas, minúsculas, números, símbolos
   - Expiración: 90 días (configurable)

2. **IAM Roles**:
   - Mínimo privilegio por función
   - No credenciales hardcodeadas
   - Rotación automática de tokens

3. **S3 Bucket**:
   - Encriptación AES-256
   - Versionado habilitado
   - Block Public Access activado
   - CORS solo para dominios permitidos

4. **API Gateway**:
   - JWT Authorizer obligatorio
   - Rate limiting: 1000 req/s
   - Throttling por usuario

---

## 🔧 Mantenimiento y Operaciones

### Monitoreo

```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/sistema-genia-prod-InvokeAgentFunction --follow

# Métricas de API Gateway
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=sistema-genia-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Backup

```bash
# Backup de DynamoDB
aws dynamodb create-backup \
  --table-name sistema-genia-prod-Catalogs \
  --backup-name catalogs-backup-$(date +%Y%m%d)

# Backup de S3
aws s3 sync \
  s3://prod-genia-docs-ACCOUNT-ID \
  s3://prod-genia-docs-backup-ACCOUNT-ID
```

### Actualización

```bash
# Actualizar backend
cd backend
sam build && sam deploy --no-confirm-changeset

# Actualizar frontend
cd frontend
npm run build
```

---

## 🎓 Casos de Uso

### Caso 1: Departamento de Recursos Humanos
- **Catálogo**: "Políticas RH"
- **Documentos**: Manuales, políticas, procedimientos
- **Usuarios**: Equipo RH + Gerentes
- **Consultas**: "¿Cuál es la política de vacaciones?", "¿Cómo solicito permiso?"

### Caso 2: Soporte Técnico
- **Catálogo**: "Base de Conocimiento IT"
- **Documentos**: Guías técnicas, troubleshooting, FAQs
- **Usuarios**: Equipo de soporte
- **Consultas**: "¿Cómo resetear password de usuario?", "Pasos para configurar VPN"

### Caso 3: Legal y Compliance
- **Catálogo**: "Documentos Legales"
- **Documentos**: Contratos, regulaciones, políticas
- **Usuarios**: Equipo legal + Compliance
- **Consultas**: "¿Qué dice el contrato sobre cláusula X?", "Requisitos GDPR"

---

## 🚨 Troubleshooting

### Problema: Catálogo se queda en "creating"

**Solución**:
```bash
# Verificar logs de CreateKBAsync
aws logs tail /aws/lambda/sistema-genia-prod-CreateKBAsyncFunction --follow

# Verificar estado de Knowledge Base
aws bedrock-agent list-knowledge-bases --region us-east-1

# Si falla, eliminar y recrear
```

### Problema: Chat no responde

**Solución**:
```bash
# Verificar permisos del usuario
aws dynamodb query \
  --table-name sistema-genia-prod-Permissions \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid":{"S":"user@example.com"}}'

# Verificar estado del Agent
aws bedrock-agent list-agents --region us-east-1

# Ver logs de InvokeAgent
aws logs tail /aws/lambda/sistema-genia-prod-InvokeAgentFunction --follow
```

### Problema: Documentos no se indexan

**Solución**:
```bash
# Verificar ingestion jobs
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id KBXXXXXX \
  --data-source-id DSXXXXXX \
  --region us-east-1

# Forzar sincronización manual desde UI
# O ejecutar:
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id KBXXXXXX \
  --data-source-id DSXXXXXX \
  --region us-east-1
```

---

## 📈 Roadmap Futuro

### Versión 4.0 (Q2 2025)
- [ ] Multi-idioma (español, inglés, portugués)
- [ ] Análisis de sentimiento en consultas
- [ ] Dashboard de analytics y métricas
- [ ] Integración con Slack/Teams
- [ ] API pública para integraciones

### Versión 5.0 (Q3 2025)
- [ ] Búsqueda semántica avanzada
- [ ] Sugerencias automáticas de preguntas
- [ ] Historial de conversaciones persistente
- [ ] Exportación masiva de datos
- [ ] Multi-tenancy completo

---

## 📞 Soporte y Contacto

Para consultas técnicas o comerciales sobre el Sistema GenIA:

- **Documentación**: Este archivo
- **Issues**: Reportar en repositorio
- **Email**: soporte@genia.com

---

## 📄 Licencia

Sistema GenIA - Propiedad de [Tu Empresa]
Todos los derechos reservados © 2025

---

*Documentación v3.0 - Última actualización: Enero 2025*
*Desarrollado con Vue.js 3 + AWS SAM + Bedrock + OpenSearch Serverless*
