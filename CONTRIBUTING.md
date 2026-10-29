# Contributing

gladCode 2 is maintained by Pablo Werlang; changes reach production by merging `dev` into `main`.

## Setup and tests

See [README.md](README.md) for the local Docker stack and [AGENTS.md](AGENTS.md) for the architecture and coding standards. Never run Node or Python on the host; everything runs in Docker.

Before merging, run the checks for what you touched:

```bash
# lint (web/ and api/) and frontend unit tests (tests/frontend, tests/render2)
docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"

# API unit tests
docker compose exec -T api npx vitest run
docker compose exec -T web npm test

# after changing a route: regenerate docs/api/README.md
docker run --rm -v "$PWD":/w -w /w node:22-alpine node api/scripts/api-docs.js

# engine regression battles (needs the gladcode2-vm image)
bash tests/engine/run.sh
```

## Branches

- `main`: production. Every push deploys through `.github/workflows/master-deploy.yml`.
- `dev`: integration branch and the base for all work.
- Work branches start from `dev` and are named `<type>/<short-slug>`, using the commit types below (`feat/front-page-redesign`, `refactor/frontend-modernize`).

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(<scope>): <imperative summary, at most 72 characters>
```

- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
- Scope is optional; use one when a single area explains the change. Allowed scopes:

  | Scope | Area |
  | --- | --- |
  | `web` | the web service in `web/` and the ES module frontend in `web/public/script/` |
  | `home` | the front page |
  | `editor` | the gladiator editor |
  | `profile` | the profile page and its tabs |
  | `tournament` | tournaments and trainings |
  | `news` | news posts and release notes |
  | `playback` | the replay page and the classic 2D renderer |
  | `render2` | the Three.js 3D renderer in `script/render2/` |
  | `audio` | battle sound and music |
  | `api` | the REST API in `api/` |
  | `sim` | battles and their results (`api/model/battle.js`, `api/helpers/battle-results.js`) |
  | `engine` | the C engine in `Payload/` |
  | `runner` | the runner service in `runner/` |
  | `db` | migrations and schema |
  | `docker` | Dockerfiles, `compose.yaml` and `compose.dev.yaml` |
  | `deps` | dependency manifests and lockfiles |
  | `config` | environment examples, lint rules and ignore files |
  | `ci` | GitHub Actions |
  | `agents` | `AGENTS.md`, `.agents/` and `.github/copilot-instructions.md` |
  | `release` | version bumps (`api/version`) |
  | `devtools` | `dev-tools/` and the admin tools |

- One logical change per commit. Keep tests with the change they cover.
- Add a body when the reason is not obvious from the subject.
- Mark breaking changes with `!` and a `BREAKING CHANGE:` trailer.

Examples from this repository:

```text
fix(news): encode HTML entities and set utf8mb4 charset for news posts
feat(render2): touch gestures and a phone layout for the 3D arena
chore(release): bump version to 2.10.0 and carry gladiators forward
```

## Integration

- Merge finished work branches into `dev` with `git merge --no-ff` so their commits stay grouped.
- Release by merging `dev` into `main`; the push deploys.
- Do not rewrite history that others may have pulled.
