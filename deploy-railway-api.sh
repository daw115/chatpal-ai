#!/bin/bash

# Railway API deployment script
ACCESS_TOKEN="eoREd6kdGLpwibCqvoybIqmPkhpabQMa9fCzJTL8DAJ"
WORKSPACE_ID="3aa3aad5-dd64-481c-afc0-f65f0256d131"

echo "🚀 Creating new Railway project via API..."

# Create new project
PROJECT_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation projectCreate($input: ProjectCreateInput!) { projectCreate(input: $input) { id name } }",
    "variables": {
      "input": {
        "name": "chatpal-ai",
        "teamId": "'$WORKSPACE_ID'"
      }
    }
  }')

echo "Project response: $PROJECT_RESPONSE"

PROJECT_ID=$(echo $PROJECT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['projectCreate']['id'])")
echo "✅ Project created: $PROJECT_ID"

# Create environment
ENV_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { environmentCreate(input: { projectId: \"'$PROJECT_ID'\", name: \"production\" }) { id } }"
  }')

ENV_ID=$(echo $ENV_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['environmentCreate']['id'])")
echo "✅ Environment created: $ENV_ID"

# Deploy from GitHub
SERVICE_RESPONSE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { serviceCreate(input: { projectId: \"'$PROJECT_ID'\", source: { repo: \"daw115/chatpal-ai\", branch: \"main\" } }) { id } }"
  }')

SERVICE_ID=$(echo $SERVICE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['serviceCreate']['id'])")
echo "✅ Service created: $SERVICE_ID"

# Set environment variables
echo "Setting environment variables..."

curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { variableCollectionUpsert(input: { projectId: \"'$PROJECT_ID'\", environmentId: \"'$ENV_ID'\", serviceId: \"'$SERVICE_ID'\", variables: { VITE_SUPABASE_PROJECT_ID: \"weeezspysozziarccene\", VITE_SUPABASE_PUBLISHABLE_KEY: \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA\", VITE_SUPABASE_URL: \"https://weeezspysozziarccene.supabase.co\" } }) }"
  }'

echo "✅ Environment variables set"
echo ""
echo "🎉 Deployment complete!"
echo "Project ID: $PROJECT_ID"
echo "Service ID: $SERVICE_ID"
echo ""
echo "View your deployment:"
echo "https://railway.app/project/$PROJECT_ID"
