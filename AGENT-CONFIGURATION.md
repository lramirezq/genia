# 🤖 Configuración de Bedrock Agents - Sistema GenIA

## 📍 Ubicación del Código

**Archivo**: `backend/src/catalogs/create-kb-async/index.js`  
**Función**: `CreateKBAsyncFunction`  
**Línea**: ~320-335

---

## 🎯 Instrucciones del Agent (Actuales)

```javascript
instruction: `You are an AI assistant specialized in answering questions about documents in the "${name}" catalog. 

IMPORTANT INSTRUCTIONS:
1. Always search the knowledge base for relevant information before answering
2. Base your answers ONLY on the information found in the documents
3. ALWAYS cite the source documents you used by mentioning their exact filenames in your response
4. If you reference information from a document, include the document name in brackets like [filename.pdf]
5. If you cannot find relevant information in the documents, say so clearly
6. Provide accurate, helpful responses based on the uploaded documents

Remember: Always include document references in your answers.`
```

---

## 🔧 Configuración Completa del Agent

### Parámetros de Creación

```javascript
{
  agentName: `agent-${catalogId}`,
  description: `AI Agent for catalog: ${name}`,
  foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
  instruction: '...',  // Ver arriba
  agentResourceRoleArn: process.env.BEDROCK_AGENT_ROLE_ARN
}
```

### Asociación con Knowledge Base

```javascript
{
  agentId: agentId,
  agentVersion: 'DRAFT',
  knowledgeBaseId: knowledgeBaseId,
  description: `Knowledge Base for ${name}`,
  knowledgeBaseState: 'ENABLED'  // ✅ Habilita búsqueda en KB
}
```

---

## 📊 Configuración del Knowledge Base

### Modelo de Embeddings
```javascript
embeddingModelArn: 'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1'
```

### OpenSearch Configuration
```javascript
{
  collectionArn: process.env.OPENSEARCH_COLLECTION_ARN,
  vectorIndexName: `index-${catalogId}`,
  fieldMapping: {
    vectorField: 'vector',
    textField: 'text',
    metadataField: 'metadata'
  }
}
```

### Índice OpenSearch
```javascript
{
  settings: {
    "index.knn": true
  },
  mappings: {
    properties: {
      vector: {
        type: "knn_vector",
        dimension: 1536,
        method: {
          name: "hnsw",
          space_type: "l2",
          engine: "faiss"  // ✅ Requerido por Bedrock
        }
      },
      text: { type: "text" },
      metadata: { type: "text" }
    }
  }
}
```

---

## 🔍 Extracción de Citations en Chat

**Archivo**: `backend/src/chat/invoke-agent/index.js`

### Métodos de Extracción

1. **knowledgeBaseRetrievalTrace**
```javascript
if (trace.knowledgeBaseRetrievalTrace?.retrievalResults) {
  trace.knowledgeBaseRetrievalTrace.retrievalResults.forEach(result => {
    if (result.location?.s3Location?.uri) {
      const uri = result.location.s3Location.uri;
      const fileName = uri.split('/').pop();
      citations.push({ name: fileName.replace(/^\d+-/, '') });
    }
  });
}
```

2. **orchestrationTrace**
```javascript
if (trace.orchestrationTrace?.modelInvocationInput?.text) {
  const text = trace.orchestrationTrace.modelInvocationInput.text;
  const s3UriPattern = /s3:\/\/[^\s]+\/([^\s\/]+)/g;
  let match;
  while ((match = s3UriPattern.exec(text)) !== null) {
    const fileName = match[1].replace(/^\d+-/, '');
    citations.push({ name: fileName });
  }
}
```

3. **Patrones en Texto de Respuesta**
```javascript
const sourcePatterns = [
  /\[([^\]]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))\]/gi,
  /documento[^"]*"([^"]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))"/gi,
  /archivo[^"]*"([^"]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))"/gi,
  /"([^"]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))"/gi
];
```

---

## 🎨 Formato de Respuesta Esperado

### Con Citations
```json
{
  "response": "Según el documento [proyecto.pdf], el sistema utiliza...",
  "sources": [
    {
      "name": "proyecto.pdf",
      "downloadUrl": "https://s3.amazonaws.com/..."
    }
  ],
  "sessionId": "session-user-123",
  "catalogId": "abc-123"
}
```

### Sin Citations (Saludo)
```json
{
  "response": "¡Hola! Soy **GenIA**, tu asistente...",
  "sources": [],
  "sessionId": "session-user-123",
  "catalogId": "abc-123"
}
```

---

## 🔄 Flujo de Creación del Agent

1. **Crear OpenSearch Index** (60s propagación)
2. **Crear Knowledge Base** (esperar ACTIVE, hasta 5min)
3. **Crear DataSource** (inmediato)
4. **Iniciar Ingestion Job** (inmediato)
5. **Crear Agent** (esperar NOT_PREPARED, hasta 2.5min)
6. **Asociar KB con Agent** (con `knowledgeBaseState: 'ENABLED'`)
7. **Preparar Agent** (PrepareAgentCommand)

---

## 📝 Notas Importantes

### ✅ Configuración Correcta
- `knowledgeBaseState: 'ENABLED'` en AssociateAgentKnowledgeBaseCommand
- Instrucciones explícitas para citar fuentes
- Formato de citation: `[filename.pdf]`
- Engine FAISS en OpenSearch (requerido por Bedrock)

### ⚠️ Limitaciones
- Agents existentes NO se actualizan automáticamente
- Necesitas recrear catálogos para aplicar nuevas instrucciones
- Citations dependen de que Bedrock las incluya en traces
- Timeout de 25s en streaming para evitar límite de API Gateway

### 🐛 Debugging
- Logs en CloudWatch: `/aws/lambda/sistema-genia-dev-InvokeAgentFunction`
- Traces completos se logean cuando hay orchestrationTrace o knowledgeBaseRetrievalTrace
- Verificar que `knowledgeBaseState` esté ENABLED en consola de Bedrock

---

## 🔧 Modificar Instrucciones

Para cambiar las instrucciones del Agent:

1. Editar `backend/src/catalogs/create-kb-async/index.js`
2. Modificar el campo `instruction` en CreateAgentCommand
3. Desplegar: `sam build && sam deploy`
4. **Crear nuevo catálogo** (los existentes no se actualizan)

---

## 📚 Referencias

- **Bedrock Agent API**: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_CreateAgent.html
- **Knowledge Base Config**: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html
- **OpenSearch Serverless**: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html

---

*Última actualización: 24 Enero 2025*  
*Sistema GenIA v4.2.0*
