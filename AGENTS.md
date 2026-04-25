# AGENTS.md — TribalScale Text Analyzer API

This file is the authoritative reference for any AI agent or contributor working in this codebase. Read it before making any change.

---

## Project Objective

A single-endpoint REST API that accepts a block of text, calls the OpenAI Chat Completions API (`gpt-4o-mini`), and returns a structured JSON response containing:

- `status` — HTTP status code (mirrored in the body)
- `summary` — 2–3 sentence summary of the input
- `action_items` — exactly 3 concrete next steps

The API is intentionally minimal. The evaluation criteria are clean architecture, correct AI integration, and clear communication — not feature breadth.

---

## Architecture

```
src/
├── prompts/          # AI prompt strings — one file per use case
├── services/         # Business logic — no Express imports allowed here
├── routes/           # Route handlers — no business logic allowed here
├── middleware/        # validateRequest (400) and errorHandler (500)
├── types/            # Shared TypeScript interfaces
├── app.ts            # Express app factory (used by server + tests)
└── index.ts          # Server entry point only — no logic here
```

**Strict separation of concerns:**
- `services/` → pure logic, no `Request`/`Response` types
- `routes/` → wires HTTP to services, delegates everything else
- `prompts/` → prompt strings only, no logic

---

## Coding Standards

### TypeScript
- `"strict": true` is enforced — no implicit `any`, no type assertions without justification
- Never use `any` — define explicit interfaces for all external data shapes
- All async route handlers must pass errors to `next(err)` — never swallow exceptions
- Naming: `PascalCase` for types/interfaces, `camelCase` for files/functions/variables

### Code Style (enforced by ESLint + Prettier)
- Single quotes, trailing commas, 100-char line width
- Run `npm run lint` and `npm run format:check` before committing
- CI will reject PRs with lint or format violations

### Environment & Secrets
- All secrets via `.env` (loaded by `dotenv`) — never hardcoded
- `.env` is git-ignored; `.env.example` documents every required key
- New environment variables must be added to `.env.example` immediately

---

## Testing Approach

**Rule: every code change must be accompanied by a test update.**

| Change type | Required test action |
|-------------|---------------------|
| New route or endpoint | Add happy path + all error cases in `tests/` |
| New middleware | Add unit test covering each branch |
| Modified service logic | Update or add test for the affected behaviour |
| New prompt | No direct test required, but the service using it must be tested |
| Bug fix | Add a regression test that fails before the fix and passes after |

### How tests are structured
- Framework: **Jest** + **Supertest**
- All tests live in `tests/` and match `*.test.ts`
- OpenAI is **always mocked** — tests must never make real API calls
- Mock the service at the module level using `jest.mock('../src/services/openai')`
- Test file mirrors the route/service it covers (e.g. `analyze.test.ts` covers `routes/analyze.ts`)

### Running tests
```bash
npm test                  # run all tests with coverage
npm run test:watch        # watch mode during development
npm run typecheck         # must pass before any commit
npm run lint              # must pass before any commit
```

### Coverage expectations
- `src/middleware/` → 100% statement coverage required
- `src/routes/` → 100% statement coverage required
- `src/services/` → service logic tested via mocked unit tests in a dedicated test file

---

## Adding a New Feature — Checklist

1. Define or update types in `src/types/index.ts`
2. If using a new prompt, create `src/prompts/<name>.ts`
3. Implement logic in `src/services/`
4. Wire up the route in `src/routes/`
5. Register the route in `src/app.ts`
6. Write tests in `tests/<name>.test.ts`
7. Run `npm run typecheck && npm run lint && npm test` — all must pass
8. Update `README.md` if the API contract or setup steps change

---

## CI/CD Pipeline (GitHub Actions)

Every push and PR to `main` runs these stages in order:

```
install → lint + typecheck + test (parallel) → build → docker build → deploy (main only)
```

A PR cannot be merged if any stage fails. The `deploy` stage is a placeholder — configure your target (Render / Railway / Fly.io) via repository secrets.
