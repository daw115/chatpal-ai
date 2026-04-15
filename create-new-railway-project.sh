#!/bin/bash

ACCESS_TOKEN="eoREd6kdGLpwibCqvoybIqmPkhpabQMa9fCzJTL8DAJ"
WORKSPACE_ID="3aa3aad5-dd64-481c-afc0-f65f0256d131"

echo "🚀 Creating new Railway project for chatpal-ai..."

# Create new empty project
PROJECT_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { projectCreate(input: { name: \"chatpal-ai\", teamId: \"'$WORKSPACE_ID'\" }) { id name } }"
  }')

echo "Project response: $PROJECT_RESPONSE"

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('projectCreate', {}).get('id', ''))" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Failed to create project"
    echo "$PROJECT_RESPONSE"
    exit 1
fi

echo "✅ Project created: $PROJECT_ID"

# Get default environment ID
ENV_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { project(id: \"'$PROJECT_ID'\") { environments { edges { node { id name } } } } }"
  }')

ENV_ID=$(echo "$ENV_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['project']['environments']['edges'][0]['node']['id'])" 2>/dev/null)

echo "✅ Environment ID: $ENV_ID"

# Connect GitHub repo
CONNECT_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { serviceConnect(input: { projectId: \"'$PROJECT_ID'\", repo: \"daw115/chatpal-ai\", branch: \"main\" }) { id } }"
  }')

SERVICE_ID=$(echo "$CONNECT_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('serviceConnect', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SERVICE_ID" ]; then
    echo "Response: $CONNECT_RESPONSE"
    echo "❌ Failed to connect GitHub repo"
    exit 1
fi

echo "✅ Service connected: $SERVICE_ID"

# Set environment variables
echo "Setting environment variables..."

VAR_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { variableCollectionUpsert(input: { projectId: \"'$PROJECT_ID'\", environmentId: \"'$ENV_ID'\", serviceId: \"'$SERVICE_ID'\", variables: { VITE_SUPABASE_PROJECT_ID: \"weeezspysozziarccene\", VITE_SUPABASE_PUBLISHABLE_KEY: \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA\", VITE_SUPABASE_URL: \"https://weeezspysozziarccene.supabase.co\" } }) }"
  }')

echo "Variables response: $VAR_RESPONSE"
echo ""
echo "✅ Environment variables set"
echo ""
echo "🎉 Deployment complete!"
echo "Project ID: $PROJECT_ID"
echo "Service ID: $SERVICE_ID"
echo ""
echo "View your deployment:"
echo "https://railway.app/project/$PROJECT_ID"
