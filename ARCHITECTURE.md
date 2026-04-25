# Architectural Development Plan
## TribalScale Text Analyzer API

**Last updated:** April 2026
**Stack:** TypeScript · Node.js · Express · OpenAI · Docker · GitHub Actions

---

## 1. Project Objective

Build a single-endpoint REST API that:

1. Accepts a block of text as input
2. Calls the OpenAI Chat Completions API (`gpt-4o-mini`) to generate a summary and extract 3 action items
3. Returns a structured JSON response with a mirrored HTTP `status` field

The API is intentionally minimal. Success criteria: clean architecture, correct AI integration, clear communication.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Request Layer                        │
│  POST /api/analyze { "text": "..." }                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  validateRequest │  → 400 if text missing/empty/wrong type
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  route handler  │  → delegates to service, calls next(err) on failure
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  analyzeText()  │  → pure business logic, no Express types
                    └────────┬────────┘
                             │ truncates to 12,000 chars
                             │ attaches system prompt
                             │ enforces response_format: json_object
                             │ validates response shape
                    ┌────────▼────────┐
                    │   OpenAI API    │  gpt-4o-mini, temperature: 0.3
                    └────────┬────────┘
                             │
                    ┌────────▼────────────────────────────────────┐
                    │  200 { status, summary, action_items }       │
                    └──────────────────────────────────────────────┘
                    
                    On any error:
                    ┌─────────────────┐
                    │  errorHandler   │  → 500 { status, error }
                    └─────────────────┘
```

---

## 3. Project Structure

```
tribalscale-assessment/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions pipeline
├── src/
│   ├── index.ts                # Server entry point — no logic
│   ├── app.ts                  # Express app factory — used by server and tests
│   ├── prompts/
│   │   └── analyze.ts          # ANALYZE_SYSTEM_PROMPT — imported by service
│   ├── routes/
│   │   └── analyze.ts          # POST /api/analyze — HTTP wiring only
│   ├── services/
│   │   └── openai.ts           # analyzeText() — all business logic
│   ├── middleware/
│   │   ├── validateRequest.ts  # 400 validation
│   │   └── errorHandler.ts     # 500 global error handler
│   └── types/
│       └── index.ts            # AnalyzeRequest, AnalyzeResult, AnalyzeResponse, ErrorResponse
├── tests/
│   └── analyze.test.ts         # Jest + Supertest (OpenAI mocked)
├── AGENTS.md                   # Coding standards and AI agent instructions
├── ARCHITECTURE.md             # This file
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml
├── start.sh                    # Bootstrap + start server
├── demo.sh                     # Start, run all test cases, shut down
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Layer Ownership Rules

| Layer | Folder | Rule |
|-------|--------|------|
| Types | `src/types/` | All shared interfaces defined here — no inline types in other files |
| Prompts | `src/prompts/` | One exported `const` per file — no logic, no imports |
| Services | `src/services/` | Pure business logic — zero Express imports (`Request`, `Response`, `NextFunction` banned) |
| Routes | `src/routes/` | HTTP wiring only — no business logic, always delegates to services |
| Middleware | `src/middleware/` | `validateRequest` for 400s, `errorHandler` for 500s only |
| App | `src/app.ts` | Factory function `createApp()` — registers middleware and routes |
| Entry | `src/index.ts` | Server startup only — `app.listen()` and nothing else |

---

## 5. API Contract

### `POST /api/analyze`

**Request**
```http
POST /api/analyze
Content-Type: application/json

{ "text": "string (required, non-empty)" }
```

**Success — 200**
```json
{
  "status": 200,
  "summary": "2–3 sentence summary.",
  "action_items": ["Step 1", "Step 2", "Step 3"]
}
```

**Errors**

| Code | Trigger | Body |
|------|---------|------|
| 400 | Missing, empty, or non-string `text` | `{ "status": 400, "error": "..." }` |
| 500 | OpenAI failure or unexpected error | `{ "status": 500, "error": "..." }` |

### `GET /health`
```json
{ "status": "ok" }
```

---

## 6. AI Integration

**Model:** `gpt-4o-mini`
**Structured output:** `response_format: { type: "json_object" }` — eliminates markdown wrapping
**Temperature:** `0.3` — deterministic, focused output
**Input guard:** Truncate to `MAX_INPUT_CHARS = 12000` before sending

**System prompt** (lives in `src/prompts/analyze.ts`):
```
You are a helpful assistant that analyzes blocks of text.

Given any text, you will:
1. Write a concise 2-3 sentence summary that captures the main point.
2. Identify exactly 3 key action items — concrete, specific next steps a reader should take.

Always respond with valid JSON in this exact format, and nothing else:
{
  "summary": "string",
  "action_items": ["string", "string", "string"]
}
```

**Post-parse validation** — service verifies `summary` is a string and `action_items` is an array of exactly 3 strings before returning. Throws if not.

---

## 7. Type System

```typescript
// What the OpenAI service returns
interface AnalyzeResult {
  summary: string;
  action_items: [string, string, string];
}

// What the HTTP route returns (adds status to the body)
interface AnalyzeResponse extends AnalyzeResult {
  status: number;
}

// All error responses
interface ErrorResponse {
  status: number;
  error: string;
}
```

---

## 8. Coding Standards

### TypeScript
- `"strict": true` — no implicit `any`, no unsafe casts
- Explicit interfaces for all external data (OpenAI responses, request bodies)
- `PascalCase` types/interfaces · `camelCase` files/functions/variables
- All async route handlers wrap in `try/catch` and call `next(err)`

### Style (enforced by ESLint + Prettier)
- Single quotes · trailing commas · 100-char line width
- `console.log` banned in `src/` — only `console.error` in `errorHandler.ts`

### Secrets
- All via `.env` loaded by `dotenv` — never hardcoded
- Every new env var added to `.env.example` immediately

---

## 9. Testing Strategy

**Rule: every code change requires a corresponding test update.**

| Change type | Required action |
|-------------|----------------|
| New route | Happy path + all error cases |
| New middleware branch | Cover the new branch |
| Modified service logic | Update or add test for affected behaviour |
| Bug fix | Regression test that fails before fix, passes after |

### Test structure
- Framework: **Jest** + **Supertest**
- All tests in `tests/`, named `<feature>.test.ts`
- OpenAI always mocked at module level — no real API calls in tests
- Coverage requirements: `src/middleware/` and `src/routes/` → 100%

### Commands
```bash
npm test                 # all tests + coverage report
npm run test:watch       # watch mode for development
npm run typecheck        # TypeScript check (must pass before commit)
npm run lint             # ESLint + Prettier check (must pass before commit)
```

---

## 10. CI/CD Pipeline (GitHub Actions)

Triggered on every push and pull request to `main`.

```
Push / PR
    │
    ▼
install (npm ci, Node 20, cached node_modules)
    │
    ├──────────────┬─────────────────┐
    ▼              ▼                 ▼
  lint        typecheck            test
(ESLint +    (tsc --noEmit)    (jest --coverage,
 Prettier)                      artifact uploaded)
    │              │                 │
    └──────────────┴─────────────────┘
                   │
                   ▼
                 build
              (tsc → dist/)
                   │
                   ▼
            docker build
         (verify image, no push)
                   │
          [main branch only]
                   ▼
               deploy
           (placeholder — configure
            Render / Railway / Fly.io)
```

**Gate rule:** `build` and `docker` only run after `lint`, `typecheck`, and `test` all pass. A PR cannot be merged with any failing stage.

---

## 11. Docker

**Multi-stage Dockerfile:**
- `builder` stage: installs all deps, runs `tsc`
- `production` stage: `node:20-alpine`, production deps only, compiled `dist/` — minimal image

```bash
./start.sh              # bootstrap + start (Docker preferred, Node fallback)
./demo.sh               # start, run all test cases, shut down
docker compose up --build   # manual
```

Health check: `GET /health` polled every 30s by Docker Compose.

---

## 12. Adding a New Feature — Checklist

- [ ] Add or update interfaces in `src/types/index.ts`
- [ ] Create `src/prompts/<name>.ts` if a new prompt is needed
- [ ] Implement logic in `src/services/<name>.ts`
- [ ] Create route handler in `src/routes/<name>.ts`
- [ ] Register route in `src/app.ts`
- [ ] Write tests in `tests/<name>.test.ts`
- [ ] Run `npm run typecheck && npm run lint && npm test` — all must pass
- [ ] Update `README.md` if API contract or setup steps change
- [ ] Update this file if architecture changes
