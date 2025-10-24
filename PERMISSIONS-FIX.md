# 🔧 Fix: Vista de Permisos - Mostrar Nombres y Acceso Admin

## Problemas Identificados

1. ❌ En la vista de permisos solo se veían IDs (userId, catalogId) en lugar de nombres
2. ❌ Los administradores no veían ningún catálogo disponible para asignar permisos
3. ❌ Los administradores no tenían acceso a todos los catálogos del sistema

## Soluciones Implementadas

### 1. Backend: Enriquecer Permisos con Nombres

**Archivo**: `backend/src/permissions/list-permissions/index.js`

**Cambios**:
- Agregado enriquecimiento de datos con nombres reales
- Obtiene email del usuario desde Cognito usando `AdminGetUserCommand`
- Obtiene nombre del catálogo desde DynamoDB
- Retorna permisos con campos `userEmail` y `catalogName`

**Antes**:
```json
{
  "userId": "abc-123-def",
  "catalogId": "cat-456-xyz",
  "permission": "read"
}
```

**Después**:
```json
{
  "userId": "abc-123-def",
  "catalogId": "cat-456-xyz",
  "permission": "read",
  "userEmail": "usuario@empresa.com",
  "catalogName": "Catálogo de Ventas"
}
```

### 2. Backend: Admin Ve Todos los Catálogos

**Archivo**: `backend/src/catalogs/list-catalogs/index.js`

**Cambios**:
- Verifica si el usuario es admin consultando `UserRolesTable`
- Si es admin: retorna TODOS los catálogos (ScanCommand sin filtros)
- Si es usuario regular: retorna solo catálogos propios (filtro por ownerId)

**Lógica**:
```javascript
// Verificar si es admin
const userRoleResult = await dynamoClient.send(new GetItemCommand({
  TableName: process.env.USER_ROLES_TABLE,
  Key: { userId }
}));
const isAdmin = userRoleResult.Item?.role === 'admin';

if (isAdmin) {
  // Admin ve TODOS los catálogos
  catalogsResult = await dynamoClient.send(new ScanCommand({
    TableName: process.env.CATALOGS_TABLE
  }));
} else {
  // Usuario regular ve solo sus catálogos
  catalogsResult = await dynamoClient.send(new ScanCommand({
    TableName: process.env.CATALOGS_TABLE,
    FilterExpression: 'ownerId = :userId',
    ExpressionAttributeValues: { ':userId': userId }
  }));
}
```

### 3. Frontend: Simplificar Mapeo de Datos

**Archivo**: `frontend/src/views/Permissions.vue`

**Cambios**:
- Eliminado mapeo manual de IDs a nombres
- Los datos ya vienen enriquecidos desde el backend
- Simplificado método `loadData()`

**Antes**:
```javascript
permissions.value = permissionsRes.data.data.permissions.map(permission => {
  const user = users.value.find(u => u.userId === permission.userId)
  const catalog = catalogs.value.find(c => c.catalogId === permission.catalogId)
  return {
    ...permission,
    userEmail: user?.email || permission.userId,
    catalogName: catalog?.name || permission.catalogId
  }
})
```

**Después**:
```javascript
// Permissions ya vienen enriquecidos con userEmail y catalogName
permissions.value = permissionsRes.data.data.permissions
```

### 4. IAM: Permisos Actualizados

**Archivo**: `backend/template.yaml`

**Cambios en ListCatalogsFunction**:
```yaml
Policies:
  - DynamoDBReadPolicy:
      TableName: !Ref CatalogsTable
  - DynamoDBReadPolicy:
      TableName: !Ref PermissionsTable
  - DynamoDBReadPolicy:
      TableName: !Ref UserRolesTable  # ← NUEVO
```

**Cambios en ListPermissionsFunction**:
```yaml
Policies:
  - DynamoDBReadPolicy:
      TableName: !Ref PermissionsTable
  - DynamoDBReadPolicy:
      TableName: !Ref CatalogsTable  # ← NUEVO
  - Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action: cognito-idp:AdminGetUser  # ← NUEVO
        Resource: !GetAtt CognitoUserPool.Arn
```

## Resultado Final

### Vista de Permisos Mejorada

✅ **Tabla de Permisos**:
- Columna "Usuario" muestra: `usuario@empresa.com` (en lugar de `abc-123-def`)
- Columna "Catálogo" muestra: `Catálogo de Ventas` (en lugar de `cat-456-xyz`)
- Columna "Permiso" muestra: `read` o `write`

✅ **Asignación de Permisos (Admin)**:
- Dropdown "Seleccionar Usuario": Lista todos los usuarios con sus emails
- Dropdown "Seleccionar Catálogo": Lista TODOS los catálogos del sistema
- Dropdown "Tipo de Permiso": `Solo Lectura` o `Lectura y Escritura`

✅ **Asignación de Permisos (Usuario Regular)**:
- Dropdown "Seleccionar Usuario": Lista todos los usuarios
- Dropdown "Seleccionar Catálogo": Lista solo SUS catálogos creados
- Dropdown "Tipo de Permiso": `Solo Lectura` o `Lectura y Escritura`

## Despliegue

```bash
cd backend
sam build
sam deploy --resolve-s3 --no-confirm-changeset --capabilities CAPABILITY_NAMED_IAM
```

**Estado**: ✅ Desplegado exitosamente

## Testing

### Caso 1: Admin Asigna Permisos
1. Login como admin
2. Ir a "Permisos"
3. Verificar que aparecen TODOS los catálogos en el dropdown
4. Seleccionar usuario, catálogo y permiso
5. Asignar permiso
6. Verificar que en la tabla aparece el email del usuario y nombre del catálogo

### Caso 2: Usuario Regular Asigna Permisos
1. Login como usuario regular
2. Ir a "Permisos"
3. Verificar que solo aparecen SUS catálogos en el dropdown
4. Seleccionar usuario, catálogo y permiso
5. Asignar permiso
6. Verificar que en la tabla aparece el email del usuario y nombre del catálogo

### Caso 3: Ver Permisos Existentes
1. Login como cualquier usuario
2. Ir a "Permisos"
3. Verificar que la tabla muestra:
   - Emails de usuarios (no IDs)
   - Nombres de catálogos (no IDs)
   - Tipo de permiso (read/write)

## Archivos Modificados

- ✅ `backend/src/permissions/list-permissions/index.js`
- ✅ `backend/src/catalogs/list-catalogs/index.js`
- ✅ `backend/template.yaml`
- ✅ `frontend/src/views/Permissions.vue`

## Próximos Pasos

- [ ] Agregar filtros en la tabla de permisos (por usuario, catálogo, tipo)
- [ ] Agregar paginación si hay muchos permisos
- [ ] Agregar confirmación antes de revocar permisos
- [ ] Agregar logs de auditoría de cambios de permisos

---

**Fecha**: 2024
**Versión**: 4.3.1
**Estado**: ✅ Completado y Desplegado
