#!/bin/bash

ACCESS_TOKEN="eoREd6kdGLpwibCqvoybIqmPkhpabQMa9fCzJTL8DAJ"
WORKSPACE_ID="3aa3aad5-dd64-481c-afc0-f65f0256d131"

echo "🚀 Creating chatpal-ai service in essa project..."

# Get essa project ID
PROJECTS=$(railway list --json 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Getting project via Railway CLI..."
    railway link --workspace "$WORKSPACE_ID"
fi

# Use Railway API to get project details
echo "Fetching essa project details..."

# Create service via Railway CLI
cd /Users/dawidslabicki/Documents/Claude/cmd/chatpal-ai || exit 1

echo "Linking to essa project..."
railway link --workspace "$WORKSPACE_ID"

echo "Creating new service..."
railway service create chatpal-ai

echo "Connecting GitHub repo..."
railway up --service chatpal-ai

echo "Setting environment variables..."
railway variables set VITE_SUPABASE_PROJECT_ID=weeezspysozziarccene
railway variables set VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA
railway variables set VITE_SUPABASE_URL=https://weeezspysozziarccene.supabase.co

echo ""
echo "✅ Service created and configured!"
echo "Check deployment: railway status"
