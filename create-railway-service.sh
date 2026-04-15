#!/bin/bash

ACCESS_TOKEN="eoREd6kdGLpwibCqvoybIqmPkhpabQMa9fCzJTL8DAJ"
PROJECT_ID="e63bff16-567b-40c0-b363-461c1005c4d5"  # essa project
ENV_ID="ad680cbc-5801-4949-9b55-ea1d7db0bfab"  # production environment

echo "🚀 Creating new service in Railway project 'essa'..."

# Create service from GitHub repo
SERVICE_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation serviceCreate($input: ServiceCreateInput!) { serviceCreate(input: $input) { id name } }",
    "variables": {
      "input": {
        "projectId": "'$PROJECT_ID'",
        "name": "chatpal-ai",
        "source": {
          "repo": "daw115/chatpal-ai",
          "branch": "main"
        }
      }
    }
  }')

echo "Response: $SERVICE_RESPONSE"

SERVICE_ID=$(echo "$SERVICE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('serviceCreate', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SERVICE_ID" ]; then
    echo "❌ Failed to create service"
    echo "$SERVICE_RESPONSE"
    exit 1
fi

echo "✅ Service created: $SERVICE_ID"

# Set environment variables
echo "Setting environment variables..."

curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }",
    "variables": {
      "input": {
        "projectId": "'$PROJECT_ID'",
        "environmentId": "'$ENV_ID'",
        "serviceId": "'$SERVICE_ID'",
        "variables": {
          "VITE_SUPABASE_PROJECT_ID": "weeezspysozziarccene",
          "VITE_SUPABASE_PUBLISHABLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA",
          "VITE_SUPABASE_URL": "https://weeezspysozziarccene.supabase.co"
        }
      }
    }
  }'

echo ""
echo "✅ Environment variables set"
echo ""
echo "🎉 Deployment complete!"
echo "Service ID: $SERVICE_ID"
echo ""
echo "View your deployment:"
echo "https://railway.app/project/$PROJECT_ID"
