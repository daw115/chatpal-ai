#!/bin/bash

ACCESS_TOKEN="eoREd6kdGLpwibCqvoybIqmPkhpabQMa9fCzJTL8DAJ"

echo "🚀 Deploying chatpal-ai via Railway API..."

# Get teams
TEAMS=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { me { id teams { edges { node { id name } } } } }"}')

TEAM_ID=$(echo "$TEAMS" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['me']['teams']['edges'][0]['node']['id'])" 2>/dev/null)

echo "Team ID: $TEAM_ID"

# Create new project
PROJECT=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { projectCreate(input: { name: \"chatpal-ai-new\", teamId: \"'$TEAM_ID'\" }) { id name } }"}')

PROJECT_ID=$(echo "$PROJECT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('projectCreate', {}).get('id', ''))" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Failed to create project"
    echo "$PROJECT"
    exit 1
fi

echo "✅ Project created: $PROJECT_ID"

# Get environment
ENV=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { project(id: \"'$PROJECT_ID'\") { environments { edges { node { id } } } } }"}')

ENV_ID=$(echo "$ENV" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['project']['environments']['edges'][0]['node']['id'])" 2>/dev/null)

echo "✅ Environment: $ENV_ID"

# Connect GitHub repo
SERVICE=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceConnect(input: { projectId: \"'$PROJECT_ID'\", repo: \"daw115/chatpal-ai\", branch: \"main\" }) { id } }"}')

SERVICE_ID=$(echo "$SERVICE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('serviceConnect', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SERVICE_ID" ]; then
    echo "❌ Failed to connect service"
    echo "$SERVICE"
    exit 1
fi

echo "✅ Service connected: $SERVICE_ID"

# Set variables
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { variableCollectionUpsert(input: { projectId: \"'$PROJECT_ID'\", environmentId: \"'$ENV_ID'\", serviceId: \"'$SERVICE_ID'\", variables: { VITE_SUPABASE_PROJECT_ID: \"weeezspysozziarccene\", VITE_SUPABASE_PUBLISHABLE_KEY: \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA\", VITE_SUPABASE_URL: \"https://weeezspysozziarccene.supabase.co\" } }) }"}' > /dev/null

echo "✅ Variables set"
echo ""
echo "🎉 Deployment complete!"
echo "Project: https://railway.app/project/$PROJECT_ID"
