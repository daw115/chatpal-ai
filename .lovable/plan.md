
# AI Chat z OpenRouter – Plan

## Opis
Aplikacja czatowa w stylu ChatGPT z dostępem do modeli OpenAI (GPT-4o, GPT-4) i Anthropic (Claude 3.5, Claude 3) przez OpenRouter API. Użytkownicy logują się i mają zapisaną historię rozmów.

## Funkcjonalności

### 1. Autoryzacja (Lovable Cloud)
- Rejestracja i logowanie email/hasło
- Strona logowania i rejestracji
- Ochrona tras – tylko zalogowani użytkownicy mają dostęp do czatu

### 2. Baza danych
- Tabela `conversations` (id, user_id, title, model, created_at, updated_at)
- Tabela `messages` (id, conversation_id, role, content, created_at)
- RLS – użytkownicy widzą tylko swoje konwersacje

### 3. Interfejs czatu (styl ChatGPT)
- **Sidebar** z listą konwersacji, przycisk "Nowy czat", usuwanie rozmów
- **Selektor modelu** – wybór między GPT-4o, GPT-4, Claude 3.5 Sonnet, Claude 3 Haiku
- **Okno wiadomości** – markdown rendering, syntax highlighting dla kodu
- **Streaming** – odpowiedzi wyświetlane token po tokenie w czasie rzeczywistym
- **Responsywność** – sidebar chowany na mobile

### 4. Backend (Edge Function)
- Edge function `chat` – proxy do OpenRouter API
- Klucz OpenRouter przechowywany jako secret po stronie serwera
- Obsługa streamingu SSE
- Obsługa błędów (429, 402, timeout)

### 5. UX
- Auto-generowanie tytułu konwersacji na podstawie pierwszej wiadomości
- Wskaźnik ładowania podczas generowania odpowiedzi
- Możliwość zatrzymania generowania (Stop)
- Kopiowanie bloków kodu jednym kliknięciem
