# 📝 Changelog - Sistema GenIA

## [4.3.0] - 2025-01-24

### 🎉 New Features
- **Auto-permisos**: Creador de catálogo recibe automáticamente permiso write
- **Eliminación completa**: Borrar catálogo elimina Agent, KB, DataSource, S3 y permisos
- **Restauración de sesión**: F5 mantiene sesión activa sin redirigir a login
- **Cambio de contraseña**: Flujo completo para contraseñas temporales de Cognito
- **Endpoint respond-to-challenge**: Manejo de NEW_PASSWORD_REQUIRED challenge

### 🔧 Fixed
- **Creación de usuarios**: Removido MessageAction RESEND que causaba error "User does not exist"
- **Login con contraseña temporal**: Detecta challenge y solicita nueva contraseña
- **Sesión persistente**: Token se restaura desde localStorage al recargar página
- **Permisos de catálogo**: Creador tiene acceso inmediato sin asignación manual

### 📚 Documentation
- **DEPLOYMENT-GUIDE-COMPLETE.md**: Guía completa de despliegue en cuenta nueva
- **AGENT-CONFIGURATION.md**: Documentación de configuración de Agents y citations

---

## [4.2.0] - 2025-01-24

### 🔧 Fixed - Timing de Propagación
- **OpenSearch Index Creation**: Agregado 60s de espera después de crear índice para propagación completa
  - 30s espera inicial + verificación + 30s adicional para visibilidad de Bedrock
  - Resuelve error 404 "no such index" al crear Knowledge Base
  
- **Knowledge Base Status**: Agregado polling hasta 5 minutos para estado ACTIVE
  - 30 intentos × 10s = 5 minutos máximo
  - Resuelve error "cannot start ingestion job on KB with status CREATING"
  
- **Agent Status**: Agregado polling hasta 2.5 minutos para salir de CREATING
  - 30 intentos × 5s = 2.5 minutos máximo
  - Resuelve error "cannot perform operation on KnowledgeBaseAssociation when Agent is in Creating state"

### 🎯 Changed
- **Catalog Creation Time**: Reducido de 5-10 min a 3-4 min con esperas optimizadas
- **OpenSearch Engine**: Cambiado de nmslib a FAISS (requerido por Bedrock)
- **Index Configuration**: 
  - Engine: faiss
  - Space type: l2
  - Method: hnsw
  - Dimension: 1536

### 📚 Documentation
- Actualizado DIAGRAMAS-TECNICOS.md con tabla de tiempos detallados
- Actualizado CONTEXTO-SISTEMA.md con versión 4.2.0
- Agregado notas sobre múltiples índices en colección única

---

## [4.1.0] - 2025-01-24

### ✨ Added - Monitoreo y UX
- Sistema de logs de progreso con 5 pasos rastreables
- Dialog visual de progreso en frontend
- Dashboard con estadísticas reales (usuarios, catálogos, documentos)
- GetStatsFunction para métricas del sistema

### 🔧 Fixed
- Catálogos stuck en estado "creating" resuelto
- Emails con HTML codificado en notificaciones
- Progress dialog mostrando mensaje por defecto en lugar de pasos reales

### 📚 Documentation
- Documentación completa del sistema (100K+ palabras)
- Guías de deployment automatizado
- Diagramas técnicos actualizados

---

## [4.0.0] - 2025-01-23

### 🚀 Initial Production Release
- Arquitectura serverless completa
- Frontend en CloudFront + S3
- Backend con 21 Lambda functions
- Chat IA con Amazon Bedrock (Claude 3)
- OpenSearch Serverless para búsqueda vectorial
- Sistema de permisos usuario-catálogo
- CRUD completo de usuarios, catálogos y documentos
- Autenticación con AWS Cognito
- Deployment automatizado con scripts

### 🏗️ Infrastructure
- Multi-ambiente (dev/staging/prod)
- CloudFormation templates
- SAM para backend
- Scripts de deployment

---

## Formato del Changelog

Este changelog sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

### Tipos de Cambios
- **Added**: Nuevas funcionalidades
- **Changed**: Cambios en funcionalidades existentes
- **Deprecated**: Funcionalidades que serán removidas
- **Removed**: Funcionalidades removidas
- **Fixed**: Corrección de bugs
- **Security**: Cambios de seguridad
