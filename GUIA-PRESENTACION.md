# 🎤 Guía de Presentación - Sistema GenIA

## 📊 Presentación Ejecutiva (15 minutos)

### Slide 1: Portada
**Sistema GenIA**
*Plataforma Empresarial de Gestión Documental con IA Generativa*

### Slide 2: El Problema
**Desafíos Actuales en las Organizaciones:**
- 📚 Información dispersa en múltiples sistemas
- ⏰ Tiempo perdido buscando documentos
- 🔍 Dificultad para encontrar respuestas específicas
- 👥 Conocimiento no compartido entre equipos
- 📉 Baja productividad por búsquedas manuales

### Slide 3: La Solución
**Sistema GenIA ofrece:**
- 🤖 Chat conversacional con IA para consultar documentos
- 📁 Organización por catálogos (departamentos/proyectos)
- 🔒 Control de acceso granular por usuario
- ⚡ Respuestas instantáneas con fuentes verificables
- 💰 Arquitectura serverless de bajo costo

### Slide 4: Arquitectura Técnica

```
┌─────────────────────────────────────────────────────┐
│              CAPA DE PRESENTACIÓN                   │
│         Vue.js 3 - Interfaz Responsiva              │
└──────────────────┬──────────────────────────────────┘
                   │ REST API / JWT
┌──────────────────▼──────────────────────────────────┐
│              CAPA DE APLICACIÓN                     │
│    API Gateway + 20 Funciones Lambda (Node.js)     │
└──────────────────┬──────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌─────────┐  ┌─────────┐  ┌─────────────┐
│ Cognito │  │DynamoDB │  │   Bedrock   │
│  Auth   │  │3 Tables │  │  Claude 3   │
└─────────┘  └─────────┘  └──────┬──────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼                           ▼
              ┌──────────┐              ┌──────────┐
              │    S3    │              │OpenSearch│
              │Documents │              │ Vectors  │
              └──────────┘              └──────────┘
```

### Slide 5: Funcionalidades Clave

**1. Gestión de Usuarios**
- Creación automática con email de bienvenida
- Roles: Admin y Usuario
- Reset de contraseña con un clic

**2. Gestión de Catálogos**
- Creación asíncrona (5-10 min)
- Estados visuales en tiempo real
- Eliminación completa y segura

**3. Gestión de Documentos**
- Upload drag & drop
- Formatos: PDF, Word, Excel, TXT
- Sincronización automática con IA

**4. Chat Inteligente**
- Respuestas en lenguaje natural
- Fuentes verificables con enlaces
- Exportación a PDF
- Markdown formatting

### Slide 6: Demo en Vivo

**Flujo de Demostración:**

1. **Login** (30 seg)
   - Mostrar pantalla de login
   - Ingresar como admin

2. **Crear Usuario** (1 min)
   - Ir a sección Usuarios
   - Crear nuevo usuario
   - Mostrar email recibido

3. **Crear Catálogo** (1 min)
   - Ir a Catálogos
   - Crear "Políticas RH"
   - Mostrar estado "creating" con polling

4. **Subir Documentos** (1 min)
   - Seleccionar catálogo listo
   - Drag & drop de 2-3 PDFs
   - Sincronizar

5. **Asignar Permisos** (30 seg)
   - Ir a Permisos
   - Asignar usuario a catálogo

6. **Chat con IA** (2 min)
   - Hacer pregunta: "¿Cuál es la política de vacaciones?"
   - Mostrar respuesta con fuentes
   - Hacer clic en enlace de descarga
   - Exportar conversación a PDF

### Slide 7: Casos de Uso Reales

**Recursos Humanos**
- Consultas sobre políticas y procedimientos
- Onboarding de nuevos empleados
- FAQs automatizadas

**Soporte Técnico**
- Base de conocimiento técnico
- Troubleshooting guiado
- Documentación de productos

**Legal y Compliance**
- Consulta de contratos y regulaciones
- Verificación de políticas
- Auditorías documentales

**Ventas y Marketing**
- Materiales de producto
- Propuestas y presentaciones
- Casos de éxito

### Slide 8: Ventajas Competitivas

| Característica | Sistema GenIA | Soluciones Tradicionales |
|----------------|---------------|--------------------------|
| Búsqueda | IA Conversacional | Palabras clave |
| Implementación | 1 día | 2-3 meses |
| Costo mensual | $255 | $2,000+ |
| Escalabilidad | Automática | Manual |
| Mantenimiento | Mínimo | Alto |
| Actualización | Instantánea | Requiere downtime |

### Slide 9: Seguridad y Compliance

**Seguridad Implementada:**
- ✅ Autenticación JWT con AWS Cognito
- ✅ Encriptación en tránsito (HTTPS)
- ✅ Encriptación en reposo (S3, DynamoDB)
- ✅ Control de acceso granular por usuario
- ✅ Auditoría completa en CloudWatch
- ✅ Políticas IAM de mínimo privilegio
- ✅ Backup automático de datos

**Compliance:**
- GDPR Ready
- SOC 2 (AWS infrastructure)
- HIPAA Compatible (con configuración adicional)

### Slide 10: Costos y ROI

**Inversión Inicial:**
- Setup: $0 (deployment automatizado)
- Configuración: 1 día de trabajo

**Costos Operacionales:**
- $255/mes (uso moderado)
- Escalable según demanda

**ROI Estimado:**
- 🕐 Ahorro de 2 horas/día por empleado en búsquedas
- 📈 Aumento de 30% en productividad
- 💰 Recuperación de inversión en < 1 mes

**Ejemplo con 50 empleados:**
- Tiempo ahorrado: 100 horas/día
- Valor (@ $30/hora): $3,000/día
- ROI mensual: $60,000 vs $255 de costo

### Slide 11: Roadmap

**Versión Actual (3.0)**
- ✅ Chat IA con Claude 3
- ✅ Multi-catálogo
- ✅ Control de acceso
- ✅ Exportación PDF

**Q2 2025 (v4.0)**
- Multi-idioma
- Analytics dashboard
- Integración Slack/Teams
- API pública

**Q3 2025 (v5.0)**
- Búsqueda semántica avanzada
- Historial persistente
- Multi-tenancy
- Mobile app

### Slide 12: Proceso de Implementación

**Semana 1: Setup**
- Día 1: Deployment en AWS
- Día 2: Configuración inicial
- Día 3: Creación de usuarios
- Día 4: Carga de documentos
- Día 5: Capacitación

**Semana 2: Adopción**
- Piloto con equipo pequeño
- Ajustes según feedback
- Expansión gradual

**Semana 3+: Operación**
- Uso completo
- Monitoreo continuo
- Optimizaciones

### Slide 13: Soporte y Garantías

**Incluido:**
- 📚 Documentación completa
- 🎓 Capacitación inicial (2 horas)
- 🔧 Soporte técnico por email
- 📊 Monitoreo de infraestructura
- 🔄 Actualizaciones automáticas

**SLA:**
- Uptime: 99.9%
- Tiempo de respuesta: < 2 segundos
- Soporte: 24/7 para críticos

### Slide 14: Preguntas Frecuentes

**¿Qué formatos de documento soporta?**
- PDF, Word, Excel, PowerPoint, TXT, Markdown

**¿Cuántos documentos puedo subir?**
- Ilimitados (costo escala con uso)

**¿Los datos están seguros?**
- Sí, encriptación completa y aislamiento por cuenta AWS

**¿Puedo usar mi propio dominio?**
- Sí, configurable con CloudFront

**¿Funciona en español?**
- Sí, Claude 3 soporta múltiples idiomas

**¿Necesito conocimientos técnicos?**
- No para uso diario, sí para deployment inicial

### Slide 15: Call to Action

**¿Listo para transformar tu gestión documental?**

**Próximos Pasos:**
1. 📅 Agendar demo personalizada
2. 🧪 Prueba piloto (30 días gratis)
3. 🚀 Implementación completa

**Contacto:**
- Email: ventas@genia.com
- Web: www.genia.com
- Tel: +1 (555) 123-4567

---

## 🎯 Script de Demostración Detallado

### Preparación (Antes de la Demo)

**Ambiente de Demo:**
```bash
# Verificar que el sistema esté funcionando
curl https://YOUR-API.execute-api.us-east-1.amazonaws.com/dev/health

# Tener preparados:
# - Usuario admin: admin@genia.com / AdminPass123!
# - 2-3 PDFs de ejemplo (políticas, manuales)
# - Catálogo "Demo RH" ya creado y listo
# - Navegador en pantalla completa
```

**Checklist:**
- [ ] Sistema funcionando
- [ ] Documentos de ejemplo listos
- [ ] Usuario demo creado
- [ ] Catálogo demo listo
- [ ] Conexión a internet estable
- [ ] Pantalla compartida configurada

### Minuto 0-1: Introducción

**Narración:**
> "Buenos días/tardes. Hoy les voy a mostrar Sistema GenIA, una plataforma que transforma la manera en que las organizaciones gestionan y consultan su información documental usando inteligencia artificial."

**Acción:**
- Mostrar pantalla de login
- Explicar brevemente la arquitectura

### Minuto 1-3: Login y Dashboard

**Narración:**
> "El acceso es simple y seguro mediante AWS Cognito. Cada usuario tiene credenciales únicas y permisos específicos."

**Acciones:**
1. Ingresar email y password
2. Hacer clic en "Iniciar Sesión"
3. Mostrar dashboard principal
4. Explicar las secciones: Usuarios, Catálogos, Documentos, Permisos, Chat

### Minuto 3-5: Gestión de Usuarios

**Narración:**
> "Como administrador, puedo crear usuarios con un solo clic. El sistema envía automáticamente un email con las credenciales."

**Acciones:**
1. Ir a sección "Usuarios"
2. Clic en "Crear Usuario"
3. Llenar formulario:
   - Email: demo@empresa.com
   - Nombre: Juan
   - Apellido: Pérez
   - Rol: Usuario
4. Clic en "Crear"
5. Mostrar mensaje de éxito
6. (Opcional) Mostrar email recibido en otra pestaña

### Minuto 5-7: Creación de Catálogo

**Narración:**
> "Los catálogos organizan documentos por departamento o proyecto. La creación es asíncrona y toma 5-10 minutos, pero el sistema responde inmediatamente."

**Acciones:**
1. Ir a "Catálogos"
2. Clic en "Crear Catálogo"
3. Llenar:
   - Nombre: "Políticas Recursos Humanos"
   - Descripción: "Documentos de políticas y procedimientos de RH"
4. Clic en "Crear"
5. Mostrar chip "Creando..." con animación
6. Explicar el proceso en background (OpenSearch, Bedrock, etc.)

### Minuto 7-9: Upload de Documentos

**Narración:**
> "Subir documentos es tan simple como arrastrar y soltar. El sistema preserva los nombres originales y los indexa automáticamente."

**Acciones:**
1. Seleccionar catálogo ya listo
2. Ir a "Documentos"
3. Arrastrar 2-3 PDFs a la zona de drop
4. Mostrar progreso de upload
5. Clic en "Sincronizar"
6. Explicar el proceso de ingestion

### Minuto 9-11: Asignación de Permisos

**Narración:**
> "El control de acceso es granular. Puedo decidir exactamente qué usuarios tienen acceso a qué catálogos."

**Acciones:**
1. Ir a "Permisos"
2. Seleccionar usuario "Juan Pérez"
3. Seleccionar catálogo "Políticas RH"
4. Clic en "Asignar Permiso"
5. Mostrar lista de permisos actualizada

### Minuto 11-14: Chat con IA (★ Momento Estrella)

**Narración:**
> "Aquí es donde la magia sucede. En lugar de buscar manualmente en documentos, simplemente pregunto en lenguaje natural."

**Acciones:**
1. Ir a "Chat"
2. Seleccionar catálogo "Políticas RH"
3. Escribir: "¿Cuál es la política de vacaciones?"
4. Mostrar respuesta en tiempo real con markdown
5. Señalar las fuentes citadas
6. Hacer clic en enlace de descarga de documento
7. Hacer segunda pregunta: "¿Cómo solicito un permiso?"
8. Mostrar respuesta
9. Clic en "Exportar PDF"
10. Mostrar PDF generado

### Minuto 14-15: Cierre

**Narración:**
> "Como han visto, Sistema GenIA simplifica radicalmente la gestión documental. ¿Tienen alguna pregunta?"

**Acciones:**
- Volver al dashboard
- Mostrar resumen de features
- Abrir espacio para preguntas

---

## 💡 Tips para una Presentación Exitosa

### Antes de la Presentación

1. **Practica el flujo completo** al menos 3 veces
2. **Prepara datos de respaldo** por si algo falla
3. **Ten un plan B** (video grabado de la demo)
4. **Conoce a tu audiencia** (técnica vs ejecutiva)
5. **Prepara respuestas** a objeciones comunes

### Durante la Presentación

1. **Habla con confianza** pero sin tecnicismos excesivos
2. **Mantén contacto visual** con la audiencia
3. **Usa pausas estratégicas** para énfasis
4. **Responde preguntas con claridad**
5. **Muestra entusiasmo** por el producto

### Después de la Presentación

1. **Envía resumen** con puntos clave
2. **Comparte documentación** técnica
3. **Agenda seguimiento** en 2-3 días
4. **Solicita feedback** honesto
5. **Mantén comunicación** abierta

---

## 🎨 Materiales de Apoyo

### Documentos para Demo
- Manual de Políticas RH (PDF)
- Procedimiento de Vacaciones (PDF)
- Código de Conducta (PDF)
- FAQ Empleados (PDF)

### Preguntas Sugeridas para el Chat
1. "¿Cuál es la política de vacaciones?"
2. "¿Cómo solicito un permiso médico?"
3. "¿Qué dice el código de conducta sobre conflictos de interés?"
4. "¿Cuántos días de vacaciones tengo al año?"
5. "¿Cuál es el proceso de evaluación de desempeño?"

### Objeciones Comunes y Respuestas

**"Es muy caro"**
→ "El ROI se recupera en menos de 1 mes considerando el tiempo ahorrado en búsquedas"

**"Ya tenemos un sistema"**
→ "GenIA se integra con sistemas existentes y ofrece capacidades de IA que otros no tienen"

**"Es muy complejo"**
→ "El deployment toma 1 día y la capacitación 2 horas. Es más simple que soluciones tradicionales"

**"¿Qué pasa con la seguridad?"**
→ "Usamos AWS con encriptación completa, cumplimos GDPR y SOC 2"

**"¿Y si la IA se equivoca?"**
→ "Todas las respuestas incluyen fuentes verificables. El usuario siempre puede validar"

---

*Guía de Presentación v1.0 - Sistema GenIA*
