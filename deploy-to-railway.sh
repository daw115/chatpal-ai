#!/bin/bash

# Skrypt do automatycznego deploymentu chatpal-ai na Railway

echo "🚀 Deployment chatpal-ai na Railway"
echo ""

# Sprawdź czy Railway CLI jest zainstalowane
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI nie jest zainstalowane"
    echo "Zainstaluj: npm i -g @railway/cli"
    exit 1
fi

# Sprawdź czy użytkownik jest zalogowany
if ! railway whoami &> /dev/null; then
    echo "❌ Nie jesteś zalogowany do Railway"
    echo "Zaloguj się: railway login"
    exit 1
fi

echo "✅ Railway CLI gotowe"
echo ""

# Informacja dla użytkownika
echo "📋 Aby utworzyć nowy projekt Railway dla chatpal-ai:"
echo ""
echo "1. Otwórz Railway Dashboard:"
echo "   https://railway.app/new"
echo ""
echo "2. Kliknij 'Deploy from GitHub repo'"
echo ""
echo "3. Wybierz repozytorium: daw115/chatpal-ai"
echo ""
echo "4. Railway automatycznie wykryje konfigurację z railway.toml"
echo ""
echo "5. Dodaj zmienne środowiskowe w zakładce 'Variables':"
echo "   VITE_SUPABASE_PROJECT_ID=weeezspysozziarccene"
echo "   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA"
echo "   VITE_SUPABASE_URL=https://weeezspysozziarccene.supabase.co"
echo ""
echo "6. Kliknij 'Deploy'"
echo ""
echo "✨ Railway automatycznie:"
echo "   - Zainstaluje zależności (npm install)"
echo "   - Zbuduje projekt (npm run build)"
echo "   - Uruchomi serwer (npm run start)"
echo "   - Przydzieli publiczny URL"
echo ""
echo "🔗 Otwórz Railway Dashboard:"
railway open 2>/dev/null || echo "   https://railway.app/new"
