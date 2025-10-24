#!/bin/bash

API_URL="https://z5bmc2llf7.execute-api.us-east-1.amazonaws.com/dev"

echo "=== Probando creación de usuarios ==="

# Test 1: Crear usuario administrador
echo "1. Creando usuario administrador..."
curl -X POST "${API_URL}/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@genia.com",
    "firstName": "Admin",
    "lastName": "Sistema",
    "role": "admin",
    "temporaryPassword": "TempPass123!"
  }' | jq '.'

echo -e "\n"

# Test 2: Crear usuario regular
echo "2. Creando usuario regular..."
curl -X POST "${API_URL}/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@genia.com",
    "firstName": "Usuario",
    "lastName": "Prueba",
    "role": "user"
  }' | jq '.'

echo -e "\n"

# Test 3: Crear usuario con email duplicado (debe fallar)
echo "3. Intentando crear usuario duplicado..."
curl -X POST "${API_URL}/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@genia.com",
    "firstName": "Admin",
    "lastName": "Duplicado",
    "role": "admin"
  }' | jq '.'

echo -e "\n"

# Test 4: Crear usuario sin datos requeridos (debe fallar)
echo "4. Intentando crear usuario sin datos requeridos..."
curl -X POST "${API_URL}/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "incompleto@genia.com"
  }' | jq '.'

echo -e "\n"

# Test 5: Listar usuarios creados
echo "5. Listando usuarios creados..."
curl -X GET "${API_URL}/users" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n=== Pruebas completadas ==="