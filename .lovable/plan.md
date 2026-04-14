

# Roadmapa rozwoju aplikacji — kolejne projekty

Poniżej lista funkcji pogrupowanych w etapy, od najbardziej wartościowych do eksperymentalnych.

---

## Etap 1 — Poprawa UX i jakości czatu

### 1.1 Streaming Markdown rendering
Renderowanie markdown (nagłówki, listy, pogrubienia, linki) w czasie rzeczywistym podczas streamowania odpowiedzi zamiast po zakończeniu.

- Biblioteka `react-markdown` + `remark-gfm`
- Integracja z `ChatMessage` — renderowanie partial markdown w trakcie streamu

### 1.2 Foldery / kategorie konwersacji
Organizacja historii czatu w foldery lub etykiety.

- Nowa tabela `conversation_folders` (id, user_id, name, color)
- Kolumna `folder_id` w `conversations`
- Drag & drop w sidebarze do przenoszenia konwersacji

### 1.3 Przypinanie konwersacji
Przypięcie ważnych konwersacji na górze listy.

- Kolumna `pinned` (boolean) w tabeli `conversations`
- Sekcja "Przypięte" w sidebarze

---

## Etap 2 — Zaawansowane funkcje AI

### 2.1 System promptów użytkownika (Custom Instructions)
Globalne instrukcje dodawane do każdej rozmowy (jak "Custom Instructions" w ChatGPT).

- Pole tekstowe w UserSettings z zapisem do `localStorage` lub bazy
- Automatyczne wstrzykiwanie jako system message przed pierwszą wiadomością

### 2.2 Tworzenie własnych agentów
Użytkownik definiuje własnych agentów z nazwą, ikoną, system promptem i domyślnym modelem.

- Nowa tabela `custom_agents` (id, user_id, name, icon, system_prompt, default_model)
- UI do tworzenia/edycji agentów w ustawieniach
- Wyświetlanie obok wbudowanych agentów w `AgentSelector`

### 2.3 Łańcuchy agentów (Agent Chains)
Sekwencyjne przetwarzanie: wynik jednego agenta trafia jako input do następnego.

- UI do konfiguracji łańcucha (np. Tłumacz → Pisarz → Kodowanie)
- Automatyczne przekazywanie outputu między agentami

---

## Etap 3 — Współpraca i udostępnianie

### 3.1 Udostępnianie konwersacji przez link
Generowanie publicznego linku do odczytu konwersacji.

- Kolumna `shared_token` (uuid, nullable) w `conversations`
- Nowa strona `/shared/:token` — read-only widok konwersacji
- RLS policy pozwalająca na odczyt po tokenie bez logowania

### 3.2 Eksport do PDF
Rozszerzenie eksportu o format PDF.

- Generowanie PDF po stronie klienta (`html2pdf.js` lub `jsPDF`)
- Formatowanie z kolorowaniem kodu i avatarami

---

## Etap 4 — Integracje i narzędzia

### 4.1 Integracja z kalendarzem / notatkami
Agent może tworzyć przypomnienia, notatki, listy TODO.

- Nowa tabela `user_notes` (id, user_id, title, content, due_date)
- Agent rozpoznaje intencję i zapisuje notatkę przez function calling

### 4.2 Historia użycia tokenów / kosztów
Dashboard z liczbą zapytań, tokenów, kosztów per model.

- Nowa tabela `usage_logs` (id, user_id, model, tokens_in, tokens_out, created_at)
- Logowanie w edge function `chat`
- Strona/panel ze statystykami i wykresami

### 4.3 Prompt Library
Biblioteka gotowych promptów do szybkiego użycia.

- Nowa tabela `saved_prompts` (id, user_id, title, content, category)
- UI do przeglądania, zapisywania i wstawiania promptów do czatu

---

## Etap 5 — PWA i mobile

### 5.1 Progressive Web App
Instalacja na telefonie, push notyfikacje, podstawowy offline.

- `manifest.json` z ikonami i splash screen
- Service worker z cache-first dla statycznych zasobów
- Push notifications o zakończeniu długich zadań

---

## Proponowana kolejność implementacji

1. **Streaming Markdown** — natychmiastowa poprawa UX
2. **Custom Instructions** — niewielki wysiłek, duża wartość
3. **Przypinanie konwersacji** — prosta zmiana w bazie + UI
4. **Foldery konwersacji** — organizacja historii
5. **Własni agenci** — personalizacja
6. **Udostępnianie przez link** — viralowy potencjał
7. **Prompt Library** — produktywność
8. **Historia tokenów** — kontrola kosztów
9. **Eksport PDF** — rozszerzenie eksportu
10. **PWA** — mobile experience

---

## Szczegóły techniczne

**Nowe tabele (migracje SQL):**
- `conversation_folders` — foldery z kolorami
- `custom_agents` — agenci użytkownika
- `saved_prompts` — zapisane prompty
- `usage_logs` — logi użycia tokenów
- `user_notes` — notatki / TODO

**Nowe edge functions:** brak — większość logiki po stronie klienta lub w istniejących funkcjach.

**Nowe biblioteki:** `react-markdown`, `remark-gfm`, `rehype-highlight` (streaming markdown), opcjonalnie `jsPDF` (eksport PDF).

Każdy punkt to niezależna funkcja — mogę je implementować pojedynczo w dowolnej kolejności. Którą funkcję chcesz zacząć?

