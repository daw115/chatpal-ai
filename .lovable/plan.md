

# Rozszerzenie aplikacji o Agentów i Asystenta Kodowania

## Przegląd

Rozbudowa obecnego czatu o system agentów z predefiniowanymi rolami, tool calling (web search, wykonywanie kodu, analiza plików) oraz edytor kodu w przeglądarce. Implementacja etapowa — każdy etap daje działającą funkcjonalność.

## Etap 1: System Agentów (Presety)

Dodanie systemu predefiniowanych agentów z system promptami i dedykowanym UI do ich wyboru.

**Agenci:**
- **Asystent Ogólny** — domyślny, bez specjalnego promptu
- **Asystent Kodowania** — specjalizowany w programowaniu, code review, debugowaniu
- **Tłumacz** — tłumaczenie z/na dowolny język
- **Analityk Danych** — analiza danych, SQL, wizualizacje
- **Pisarz** — copywriting, artykuły, dokumentacja

**Zmiany:**
- Nowy plik `src/lib/agents.ts` — definicje agentów (id, name, icon, systemPrompt, description)
- Nowy komponent `AgentSelector` — kafelki do wyboru agenta przy nowym czacie
- Tabela `conversations` — dodanie kolumny `agent_id` (text, nullable)
- Edge function `chat` — dodanie system promptu na podstawie wybranego agenta

## Etap 2: Web Search (Perplexity)

Dodanie możliwości przeszukiwania internetu przez agenta.

**Podejście:** Perplexity connector (dostępny w Lovable) lub alternatywnie Tavily/SearXNG jako open-source.

**Zmiany:**
- Nowa edge function `web-search` — proxy do Perplexity API (Sonar model)
- Edge function `chat` — rozbudowa o tool calling: model może wywołać `web_search` tool
- Frontend — wyświetlanie źródeł/cytatów w wiadomościach asystenta (linki, ikona globu)
- Komponent `SearchResults` — karty ze źródłami pod odpowiedzią

## Etap 3: Upload plików i analiza (RAG)

Użytkownik przesyła pliki (kod, PDF, tekst), agent je analizuje.

**Zmiany:**
- Storage bucket `chat-files` w Supabase
- Tabela `message_attachments` (id, message_id, file_name, file_url, file_type, extracted_text)
- Komponent `ChatInput` — rozbudowa o przycisk upload (drag & drop + kliknięcie)
- Nowa edge function `extract-text` — ekstrakcja tekstu z przesłanych plików (PDF via pdf-parse, kod/tekst bezpośrednio)
- Edge function `chat` — dołączanie treści plików do kontekstu konwersacji

## Etap 4: Wykonywanie kodu (Sandbox)

Agent może generować i uruchamiać kod, wyświetlając wyniki.

**Podejście:** Open-source Piston API (https://github.com/engineer-man/piston) — obsługuje Python, JS, Go, Rust, C++ i 50+ języków. Hostowany publicznie lub self-hosted.

**Zmiany:**
- Nowa edge function `run-code` — proxy do Piston API z walidacją i timeoutem
- Edge function `chat` — tool calling: model wywołuje `run_code(language, code)` i dostaje stdout/stderr
- Komponent `CodeExecutionResult` — wyświetlanie wyniku wykonania (stdout, stderr, czas)
- Rozbudowa `ChatMessage` — renderowanie bloków "Code Execution" z przyciskiem "Uruchom ponownie"

## Etap 5: Monaco Editor

Interaktywny edytor kodu w przeglądarce dla generowanego kodu.

**Zmiany:**
- Dodanie `@monaco-editor/react` jako zależności
- Komponent `CodeEditor` — pełny edytor z podświetlaniem składni, minimap, autocomplete
- Integracja z panelem czatu — przycisk "Otwórz w edytorze" przy blokach kodu
- Panel boczny/dolny z edytorem + przycisk "Uruchom" (połączenie z Piston)

## Architektura techniczna

```text
┌──────────────────────────────────────────────┐
│                  Frontend                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Agents   │ │ Chat +   │ │ Monaco       │ │
│  │ Selector │ │ Files    │ │ Editor       │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│            Edge Functions                     │
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌──────┐│
│  │ chat │ │web-search│ │run-code │ │extract││
│  │(tool │ │(Perplexi)│ │(Piston) │ │-text  ││
│  │call) │ └──────────┘ └─────────┘ └──────┘│
│  └──────┘                                    │
└──────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│         Quatarly API (LLM)                    │
│    Claude / Gemini / GPT (tool calling)       │
└──────────────────────────────────────────────┘
```

**Tool calling flow:**
1. User sends message → edge function `chat` sends to Quatarly z `tools` array
2. Model responds with `tool_calls` (np. `web_search`, `run_code`)
3. Edge function wykonuje tool → wysyła wynik z powrotem do modelu
4. Model generuje finalną odpowiedź ze streamingiem

## Nowe zależności

- `@monaco-editor/react` — edytor kodu
- Perplexity connector (via Lovable connectors)

## Baza danych (migracje)

- `ALTER TABLE conversations ADD COLUMN agent_id text DEFAULT null`
- Nowa tabela `message_attachments`
- Storage bucket `chat-files` z politykami RLS

## Kolejność implementacji

Sugeruję zacząć od Etapu 1 (Agenci/Presety), bo to najbardziej widoczna zmiana i fundament dla reszty. Każdy kolejny etap jest niezależny i można je realizować w dowolnej kolejności.

