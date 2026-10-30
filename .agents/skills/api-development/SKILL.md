---
name: api-development
description: Build or change gladCode API behaviour in api/ — Express routers in api/route, the auth() middleware and Google sign-in session, Validate input checks, CustomError codes, route doc comments and the generated docs/api/README.md, and anything that runs a battle through the runner. Use for any endpoint, middleware or API contract change.
---

# gladCode API development

Localizes the global `api-building` and `security-defense-and-mitigation` skills: follow them for the method; this file holds what is true in gladCode. On project facts, this file wins.

## Where

- `api/app.js`: middleware order (request log, security headers, CORS, CSRF origin check, JSON body 2 MB), `/health`, `/ready`, one `app.use('/<area>', <area>Router)` per router, the 404 and `errorMiddleware`.
- `api/route/<area>.js`: one `Router` per area, exported as `<area>Router`.
- `api/middleware/auth.js` (`auth()`), `api/middleware/error.js` (`errorMiddleware`, `asyncRoute`).
- `api/helpers/`: `validation.js` (`Validate`), `error.js` (`CustomError`), `platform.js` (CORS, CSRF, headers), `jwt.js`, `cookies.js`, `google-auth.js`, `runner.js`, `email.js`.

## Rules

- Every route has a JSDoc block whose first line is `METHOD /path` (with the router's mount prefix), then what it takes and answers. `api/scripts/api-docs.js` builds `docs/api/README.md` from these: regenerate it after any route change.
- Wrap async handlers in `asyncRoute`. Validate every `req.params`, `req.query` and `req.body` value with `Validate.text|integer|oneOf|boolean` before calling a model; a bad field throws 400 `INVALID_<FIELD>` (`maxMinutes` → `INVALID_MAX_MINUTES`). `Validate.text` refuses 4-byte characters unless `{ wide: true }`, for text never stored in a utf8mb3 column.
- Routes call models, never `Mysql` (see `entity-models`, `mysql-helper`).
- Throw `CustomError(status, message, code, data)`. Clients branch on `code`, so codes are stable SCREAMING_SNAKE names. `errorMiddleware` answers `{ error, status, type, code, message, data? }`, hides the message and data of every 500, and only keeps statuses listed in its `STATUS_TYPES`/`DEFAULT_CODES`: add a new status to both (`tests/unit/middleware/error.test.js` scans the sources for thrown statuses).
- Auth: `auth()` requires the `app_session` cookie (401 `NOT_SIGNED_IN`), `auth({ optional: true })` allows visitors (`req.user = null`), `auth({ admin: true })` also requires `req.user.isAdmin` (`ADMIN_EMAILS`, 403 `ADMIN_ONLY`). `req.user` is a `User` model. Ownership is checked in the model by filtering on `req.user.id`.
- Only `GET`, `POST`, `PUT`, `DELETE` (the CORS method list). Cookie requests that change data must come from `WEB_URL:WEB_PORT` (403 `CSRF_ORIGIN_DENIED`); foreign origins get 403 `CORS_ORIGIN_DENIED`.
- Answers are camelCase JSON, usually wrapped in a named key (`{ gladiator }`, `{ friends }`, `{ hash, error }`), even where the table columns are Portuguese (`apelido` → `nick`).
- Anything that runs a battle goes through `Battle` (`api/model/battle.js`), which queues in `helpers/runner.js` (`RUNNER_CONCURRENCY`, 503 `RUNNER_BUSY` after `MAX_QUEUE_MS`). Player-triggered battles also wrap the call in `oneBattlePerClient('user:<id>' | 'ip:<req.ip>', ...)` (429 `BATTLE_RUNNING`). Battles that count answer `NO_OUTPUT`, never compiler output.
- Large bodies are opt-in per path, behind auth first (see the 100 MB `/admin/tournaments/import` parser in `app.js`).

## Deviations from `api-building`

- Folders are `api/route/` and `api/middleware/` (singular), no `src/`: the layout came from node-aec as adapted here.
- No passwords or bcrypt: Google sign-in only (`POST /auth/google`, `helpers/google-auth.js` checks audience, issuer and `email_verified`). The session is a JWT (HS256, `SESSION_TTL_DAYS`) in an HttpOnly, `SameSite=Lax` cookie, Secure in production; there is no bearer-token API.
- No general rate limiter: the battle queue and the per-client battle limit are the only throttles.
- `trust proxy` is one hop when `TRUST_PROXY=true` (behind the host nginx), so `req.ip` is the address nginx adds.

## Commands

```bash
docker compose exec -T api npx vitest run                                              # API tests
docker run --rm -v "$PWD":/w -w /w node:22-alpine node api/scripts/api-docs.js          # regenerate docs/api/README.md
TOKEN=$(docker compose exec -T api node scripts/issue-session.js 277 | tail -1)        # local session cookie
curl -H "Origin: http://localhost:8085" -H "Cookie: app_session=$TOKEN" http://localhost:8086/users/me
```

## Checks before finishing

- A route test (`api/tests/unit/route/`) or model test for the new behaviour, including the refused cases (other user's id, missing cookie, bad input).
- `docs/api/README.md` regenerated and committed with the route change.
- New error codes handled by the frontend model or page that calls the route (see `frontend-development`).
