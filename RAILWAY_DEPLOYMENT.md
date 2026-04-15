# Deployment na Railway

## Kroki deploymentu

### 1. Przygotowanie projektu
Projekt jest już skonfigurowany z:
- `railway.toml` - konfiguracja Railway
- Zaktualizowany `package.json` ze skryptami start/preview
- `.env.example` - template zmiennych środowiskowych

### 2. Deploy na Railway

#### Opcja A: Deploy przez CLI
```bash
# Zainstaluj Railway CLI
npm i -g @railway/cli

# Zaloguj się
railway login

# Zainicjuj projekt
railway init

# Dodaj zmienne środowiskowe
railway variables set VITE_SUPABASE_PROJECT_ID=weeezspysozziarccene
railway variables set VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWV6c3B5c296emlhcmNjZW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI2MzgsImV4cCI6MjA5MTY4ODYzOH0.BxF4fMKg7zIifwAPuEHHqluWerKC8FP2pAq8NOosZQA
railway variables set VITE_SUPABASE_URL=https://weeezspysozziarccene.supabase.co

# Deploy
railway up
```

#### Opcja B: Deploy przez GitHub (zalecane)
1. Wejdź na https://railway.app
2. Kliknij "New Project"
3. Wybierz "Deploy from GitHub repo"
4. Wybierz repozytorium `chatpal-ai`
5. Railway automatycznie wykryje konfigurację z `railway.toml`
6. Dodaj zmienne środowiskowe w zakładce "Variables":
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
7. Kliknij "Deploy"

### 3. Konfiguracja po deploymencie

Railway automatycznie:
- Wykryje Node.js projekt
- Zainstaluje zależności (`npm install`)
- Zbuduje projekt (`npm run build`)
- Uruchomi serwer (`npm run start`)
- Przydzieli publiczny URL

### 4. Weryfikacja

Po deploymencie sprawdź:
- Czy aplikacja się uruchamia (sprawdź logi w Railway dashboard)
- Czy zmienne środowiskowe są poprawnie ustawione
- Czy połączenie z Supabase działa

### 5. Automatyczne deploymenty

Po połączeniu z GitHub, Railway będzie automatycznie deployować przy każdym pushu do głównej gałęzi.

## Troubleshooting

### Problem: Build fails
- Sprawdź logi w Railway dashboard
- Upewnij się, że wszystkie zmienne środowiskowe są ustawione

### Problem: Aplikacja nie startuje
- Sprawdź czy port jest poprawnie ustawiony (Railway automatycznie ustawia zmienną `PORT`)
- Sprawdź logi startowe

### Problem: Błędy Supabase
- Zweryfikuj poprawność kluczy API
- Sprawdź czy URL Supabase jest prawidłowy

## Dodatkowe informacje

- Railway automatycznie przydziela darmowy plan dla nowych projektów
- Możesz monitorować użycie zasobów w dashboard
- Logi są dostępne w czasie rzeczywistym w Railway dashboard
