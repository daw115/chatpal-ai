

# Plan: Dodanie nowych wbudowanych agentów

## Cel
Rozszerzenie listy predefiniowanych agentów o specjalistyczne role: GitHub/DevOps, Matematyk, Prawnik, SEO, oraz Nauczyciel.

## Zmiany

### 1. Plik `src/lib/agents.ts`
Dodanie 5 nowych agentów do tablicy `AGENTS`:

| Agent | Ikona (lucide) | Kolor | Opis |
|-------|----------------|-------|------|
| **GitHub / DevOps** | `GitBranch` | `bg-gray-700` | CI/CD, Git workflow, GitHub Actions, Docker, deploy |
| **Matematyk** | `Calculator` | `bg-teal-500` | Równania, statystyka, geometria, krok po kroku |
| **Prawnik** | `Scale` | `bg-rose-600` | Analiza umów, RODO, prawo pracy, klauzule |
| **SEO Specjalista** | `Search` | `bg-orange-500` | Optymalizacja treści, meta tagi, analiza słów kluczowych |
| **Nauczyciel** | `GraduationCap` | `bg-indigo-500` | Wyjaśnianie konceptów, quizy, plany lekcji |

Każdy agent będzie miał rozbudowany `systemPrompt` po polsku, analogiczny do istniejących agentów.

### 2. Plik `src/components/AgentSelector.tsx`
Bez zmian — siatka automatycznie rozszerzy się o nowe kafelki z tablicy `AGENTS`.

## Szczegóły techniczne
- Import nowych ikon z `lucide-react`: `GitBranch`, `Calculator`, `Scale`, `Search`, `GraduationCap`
- Brak zmian w bazie danych, edge functions ani routingu
- Zmiana dotyczy wyłącznie jednego pliku (`agents.ts`)

