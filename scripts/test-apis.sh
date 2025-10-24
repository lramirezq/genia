#!/bin/bash

API_URL="https://z5bmc2llf7.execute-api.us-east-1.amazonaws.com/dev"

echo "🧪 Testing Sistema GenIA APIs..."

# Test 1: Login (should fail without user)
echo "1. Testing Login endpoint..."
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: Create User (should work)
echo "2. Testing Create User endpoint..."
curl -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@genia.com","firstName":"Admin","lastName":"User","temporaryPassword":"TempPass123!","role":"admin"}' \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: List Users (should work)
echo "3. Testing List Users endpoint..."
curl -X GET "$API_URL/users" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 4: Create Catalog (should fail - needs auth)
echo "4. Testing Create Catalog endpoint..."
curl -X POST "$API_URL/catalogs" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Catalog","description":"Test catalog description"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ API Testing completed!"