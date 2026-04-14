

# Plan rozbudowy aplikacji — wszystkie funkcje po kolei

Realizacja 6 nowych funkcji w kolejności od najprostszych do najbardziej zaawansowanych.

---

## 1. Dark/Light Mode Toggle

Przełącznik motywu z zapisem preferencji w `localStorage`.

- Nowy komponent `ThemeToggle` (ikona słońce/księżyc) w headerze czatu
- `ThemeProvider` context w `App.tsx` — dodaje/usuwa klasę `dark` na `<html>`
- Monaco Editor automatycznie przełącza theme (`vs-dark` / `light`)

## 2. Edycja i regeneracja wiadomości

Użytkownik może edytować swoją wiadomość i ponownie wygenerować odpowiedź.

- Przycisk "Edytuj" przy wiadomościach użytkownika → inline textarea
- Przycisk "Regeneruj" przy ostatniej odpowiedzi asystenta
- Po edycji/regeneracji — usunięcie kolejnych wiadomości z bazy i ponowne wysłanie

## 3. Eksport konwersacji

Export do Markdown i kopiowanie do schowka.

- Przycisk eksportu w headerze konwersacji
- Dropdown: "Kopiuj jako Markdown" / "Pobierz .md"
- Formatowanie: tytuł, data, agent, pary user/assistant

## 4. Wyszukiwanie w historii konwersacji

Pełnotekstowe wyszukiwanie po tytułach i treści wiadomości.

- Pole wyszukiwania w `ChatSidebar`
- Filtrowanie konwersacji po tytule (client-side) + wyszukiwanie w treści wiadomości (query do bazy z `ilike`)

## 5. Obsługa obrazów (analiza wizualna)

Wysyłanie obrazów do modelu multimodalnego (Gemini) z analizą wizualną/OCR.

- Rozszerzenie `ChatInput` — obrazy konwertowane do base64
- Modyfikacja edge function `chat` — wysyłanie obrazów jako `image_url` parts w messages (format OpenAI vision)
- Automatyczny wybór modelu multimodalnego (Gemini) gdy załączony obraz

## 6. Generowanie obrazów AI

Agent generuje grafiki na podstawie opisu użytkownika.

- Nowa edge function `generate-image` — wywołanie Quatarly API z modelem `gemini-3-pro-image` lub `gemini-3.1-flash-image`
- Nowy agent "Grafik AI" z dedykowanym system promptem
- Wyświetlanie wygenerowanych obrazów inline w czacie

---

## Kolejność implementacji

1. Dark/Light Mode → 2. Edycja/Regeneracja → 3. Eksport → 4. Wyszukiwanie → 5. Obrazy (analiza) → 6. Generowanie obrazów

Każdy krok daje od razu działającą funkcję. Zaczynamy?

