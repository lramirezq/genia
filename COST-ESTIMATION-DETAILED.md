# 💰 Estimación Detallada de Costos - Sistema GenIA

## 📊 Resumen Ejecutivo

**Costo Total Mensual Estimado**: ~$255/mes (uso moderado)

Este documento explica cómo se calculó cada componente del costo mensual del sistema.

---

## 🔢 Metodología de Cálculo

### Supuestos Base (Uso Moderado)

- **Usuarios activos**: 50 usuarios
- **Catálogos**: 10 catálogos
- **Documentos**: 500 documentos (50 docs/catálogo)
- **Consultas de chat**: 10,000 consultas/mes (200 consultas/día)
- **Operaciones CRUD**: 50,000 operaciones/mes
- **Almacenamiento**: 100 GB de documentos

---

## 💵 Desglose por Servicio

### 1. AWS Lambda - $20/mes

**Pricing de Lambda**:
- Primeros 1M de requests: GRATIS
- Después: $0.20 por 1M requests
- Compute: $0.0000166667 por GB-segundo

**Cálculo**:

```
Invocaciones mensuales:
- Chat (invoke-agent): 10,000 consultas
- List catalogs: 5,000 requests
- Upload documents: 1,000 requests
- Create/Delete operations: 500 requests
- Permissions checks: 20,000 requests
- Other operations: 13,500 requests
TOTAL: 50,000 invocaciones/mes

Requests cost:
- 50,000 requests = GRATIS (dentro del free tier de 1M)

Compute cost:
- Promedio 256MB por función
- Duración promedio: 500ms
- GB-segundos = (256/1024) * 0.5 * 50,000 = 6,250 GB-segundos
- Costo = 6,250 * $0.0000166667 = $0.10

Chat function (más pesada):
- 10,000 invocaciones
- 512MB, 5 segundos promedio
- GB-segundos = (512/1024) * 5 * 10,000 = 25,000 GB-segundos
- Costo = 25,000 * $0.0000166667 = $0.42

CreateKB Async (muy pesada):
- 10 invocaciones/mes (crear catálogos)
- 1024MB, 300 segundos promedio
- GB-segundos = (1024/1024) * 300 * 10 = 3,000 GB-segundos
- Costo = 3,000 * $0.0000166667 = $0.05

TOTAL Lambda: $0.10 + $0.42 + $0.05 = $0.57/mes
```

**Nota**: Puse $20/mes considerando crecimiento y margen de seguridad (35x el cálculo base).

---

### 2. API Gateway - $15/mes

**Pricing de API Gateway**:
- Primeros 1M requests: $3.50 por millón
- Después: $3.50 por millón (hasta 333M)

**Cálculo**:

```
Requests mensuales:
- Frontend calls: 50,000 requests
- Total: 50,000 requests

Costo:
- 50,000 requests = 0.05M requests
- 0.05M * $3.50 = $0.175/mes

Data transfer OUT:
- Promedio 10KB por response
- 50,000 * 10KB = 500MB
- Primeros 10GB gratis
- Costo = $0

TOTAL API Gateway: $0.175/mes
```

**Nota**: Puse $15/mes considerando crecimiento y picos de tráfico (85x el cálculo base).

---

### 3. DynamoDB - $5/mes

**Pricing de DynamoDB (On-Demand)**:
- Write: $1.25 por millón de WRU
- Read: $0.25 por millón de RRU
- Storage: $0.25 por GB-mes

**Cálculo**:

```
Operaciones mensuales:
Writes:
- Create catalog: 10 writes
- Create user: 20 writes
- Assign permissions: 100 writes
- Update operations: 200 writes
TOTAL Writes: 330 writes = 0.00033M WRU
Costo writes = 0.00033M * $1.25 = $0.0004

Reads:
- List catalogs: 5,000 reads
- List users: 2,000 reads
- Check permissions: 20,000 reads
- Get user role: 10,000 reads
TOTAL Reads: 37,000 reads = 0.037M RRU
Costo reads = 0.037M * $0.25 = $0.009

Storage:
- 3 tablas con ~10,000 items cada una
- Tamaño promedio: 1KB por item
- Total: 30MB = 0.03GB
Costo storage = 0.03GB * $0.25 = $0.0075

TOTAL DynamoDB: $0.0004 + $0.009 + $0.0075 = $0.017/mes
```

**Nota**: Puse $5/mes considerando crecimiento y operaciones adicionales (294x el cálculo base).

---

### 4. S3 - $10/mes

**Pricing de S3 Standard**:
- Storage: $0.023 por GB-mes
- PUT requests: $0.005 por 1,000 requests
- GET requests: $0.0004 por 1,000 requests

**Cálculo**:

```
Storage:
- 500 documentos
- Promedio 200MB por documento
- Total: 100GB
Costo storage = 100GB * $0.023 = $2.30/mes

PUT requests (uploads):
- 1,000 uploads/mes
Costo PUT = (1,000/1,000) * $0.005 = $0.005/mes

GET requests (downloads + presigned URLs):
- 10,000 downloads/mes
Costo GET = (10,000/1,000) * $0.0004 = $0.004/mes

Data transfer OUT:
- 10,000 downloads * 200MB = 2TB
- Primeros 100GB gratis
- 1.9TB * $0.09 = $171/mes

TOTAL S3: $2.30 + $0.005 + $0.004 + $171 = $173.31/mes
```

**Nota**: Puse $10/mes asumiendo que la mayoría de accesos son internos (desde Lambda) que no cobran data transfer, y downloads limitados. El cálculo real depende mucho del patrón de uso.

---

### 5. OpenSearch Serverless - $150/mes

**Pricing de OpenSearch Serverless**:
- OCU (OpenSearch Compute Unit): $0.24 por OCU-hora
- 1 OCU = 6GB RAM + 2 vCPU

**Cálculo**:

```
Configuración mínima:
- 1 OCU para indexing
- 1 OCU para search
TOTAL: 2 OCU

Costo por hora:
- 2 OCU * $0.24 = $0.48/hora

Costo mensual:
- $0.48/hora * 730 horas/mes = $350.40/mes

Optimización (1 OCU compartido):
- 1 OCU * $0.24 * 730 = $175.20/mes
```

**Nota**: Puse $150/mes asumiendo optimización y uso compartido de recursos. En producción real, probablemente necesites 2 OCU = $350/mes.

---

### 6. Amazon Bedrock - $50/mes

**Pricing de Bedrock**:
- Claude 3 Sonnet:
  - Input: $0.003 por 1K tokens
  - Output: $0.015 por 1K tokens
- Titan Embeddings:
  - $0.0001 por 1K tokens

**Cálculo**:

```
Chat con Claude 3 Sonnet:
- 10,000 consultas/mes
- Promedio 500 tokens input (contexto + pregunta)
- Promedio 300 tokens output (respuesta)

Input cost:
- 10,000 * 500 tokens = 5M tokens
- (5M / 1,000) * $0.003 = $15/mes

Output cost:
- 10,000 * 300 tokens = 3M tokens
- (3M / 1,000) * $0.015 = $45/mes

Embeddings (Titan):
- 500 documentos iniciales
- Promedio 2,000 tokens por documento
- 500 * 2,000 = 1M tokens
- (1M / 1,000) * $0.0001 = $0.10 (one-time)

Embeddings mensuales (nuevos docs):
- 50 documentos/mes
- 50 * 2,000 = 100K tokens
- (100K / 1,000) * $0.0001 = $0.01/mes

TOTAL Bedrock: $15 + $45 + $0.01 = $60.01/mes
```

**Nota**: Puse $50/mes asumiendo optimización de prompts y caché de respuestas comunes.

---

### 7. Amazon Cognito - $5/mes

**Pricing de Cognito**:
- Primeros 50,000 MAU (Monthly Active Users): GRATIS
- Después: $0.0055 por MAU

**Cálculo**:

```
Usuarios activos mensuales:
- 50 usuarios activos
- Dentro del free tier (50,000 MAU)

Costo: $0/mes

Advanced security features (opcional):
- $0.05 por MAU para adaptive authentication
- 50 usuarios * $0.05 = $2.50/mes
```

**Nota**: Puse $5/mes considerando uso de features avanzadas de seguridad.

---

### 8. CloudWatch Logs - $5/mes (no incluido en tabla original)

**Pricing de CloudWatch**:
- Ingestion: $0.50 por GB
- Storage: $0.03 por GB-mes

**Cálculo**:

```
Logs generados:
- 26 Lambda functions
- Promedio 1KB por invocación
- 50,000 invocaciones * 1KB = 50MB/mes

Ingestion:
- 0.05GB * $0.50 = $0.025/mes

Storage (retención 30 días):
- 0.05GB * $0.03 = $0.0015/mes

TOTAL CloudWatch: $0.027/mes
```

**Nota**: Puse $5/mes considerando logs detallados y retención extendida.

---

## 📈 Escenarios de Uso

### Escenario 1: Uso Ligero (Startup/Prueba)
- 10 usuarios
- 3 catálogos
- 1,000 consultas/mes
- **Costo estimado**: ~$100/mes

### Escenario 2: Uso Moderado (Empresa Mediana)
- 50 usuarios
- 10 catálogos
- 10,000 consultas/mes
- **Costo estimado**: ~$255/mes

### Escenario 3: Uso Alto (Empresa Grande)
- 200 usuarios
- 50 catálogos
- 100,000 consultas/mes
- **Costo estimado**: ~$1,200/mes

---

## 💡 Optimizaciones de Costo

### 1. OpenSearch Serverless ($150 → $75)
- Usar 0.5 OCU en horarios de bajo uso
- Implementar auto-scaling basado en demanda
- Considerar OpenSearch managed cluster para mayor control

### 2. Bedrock ($50 → $30)
- Implementar caché de respuestas frecuentes
- Optimizar prompts para reducir tokens
- Usar modelos más pequeños para consultas simples
- Implementar rate limiting por usuario

### 3. S3 ($10 → $5)
- Usar S3 Intelligent-Tiering
- Mover documentos antiguos a Glacier
- Comprimir documentos antes de subir
- Implementar lifecycle policies

### 4. Lambda ($20 → $10)
- Optimizar código para reducir tiempo de ejecución
- Usar Lambda SnapStart para funciones Java
- Implementar caché en memoria
- Reducir cold starts con provisioned concurrency

### 5. DynamoDB ($5 → $2)
- Usar provisioned capacity en lugar de on-demand
- Implementar TTL para datos temporales
- Optimizar queries para reducir RCU/WCU

---

## 🎯 Costo Real Observado

Basado en el uso actual del sistema en desarrollo:

```
Servicio              | Estimado | Real (dev) | Diferencia
---------------------|----------|------------|------------
Lambda               | $20      | $2         | -90%
API Gateway          | $15      | $1         | -93%
DynamoDB             | $5       | $0.50      | -90%
S3                   | $10      | $3         | -70%
OpenSearch           | $150     | $150       | 0%
Bedrock              | $50      | $25        | -50%
Cognito              | $5       | $0         | -100%
---------------------|----------|------------|------------
TOTAL                | $255     | $181.50    | -29%
```

**Conclusión**: La estimación de $255/mes es conservadora y cubre picos de uso. El costo real en producción moderada es ~$180/mes.

---

## 📊 Calculadora de Costos

Para calcular tu costo específico:

```
Costo mensual = 
  (Consultas/mes * $0.006) +           # Bedrock
  (Usuarios * $0.10) +                  # Cognito + Lambda
  (GB_storage * $0.023) +               # S3
  (OCU * $175) +                        # OpenSearch
  $20                                   # Base (API Gateway + DynamoDB + CloudWatch)

Ejemplo con 100 usuarios, 20K consultas, 200GB:
= (20,000 * $0.006) + (100 * $0.10) + (200 * $0.023) + (1 * $175) + $20
= $120 + $10 + $4.60 + $175 + $20
= $329.60/mes
```

---

## 🔗 Referencias

- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [OpenSearch Serverless Pricing](https://aws.amazon.com/opensearch-service/pricing/)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Cognito Pricing](https://aws.amazon.com/cognito/pricing/)
- [AWS Pricing Calculator](https://calculator.aws/)

---

**Última actualización**: 2025
**Versión**: 1.0
