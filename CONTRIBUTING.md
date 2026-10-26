# Contributing

gladCode 2 is maintained by Pablo Werlang; changes reach production by merging `dev` into `main`.

## Setup and tests

See [README.md](README.md) for the local Docker stack and [AGENTS.md](AGENTS.md) for the architecture and coding standards. Never run Node or Python on the host; everything runs in Docker.

Before merging, run the checks for what you touched:

```bash
# frontend lint and unit tests (public_html/script, tests/frontend, tests/render2)
docker run --rm -v "$PWD":/w -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"

# PHP helpers
for t in tests/*.test.php; do docker run --rm -v "$PWD":/w -w /w php:8-cli php "$t"; done

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
  | `web` | PHP pages and the ES module frontend in `public_html/script/` |
  | `home` | the front page |
  | `editor` | the gladiator editor |
  | `profile` | the profile page and its tabs |
  | `tournament` | tournaments and trainings |
  | `news` | news posts and release notes |
  | `playback` | the replay page and the classic 2D renderer |
  | `render2` | the Three.js 3D renderer in `script/render2/` |
  | `audio` | battle sound and music |
  | `api` | `back_*.php` endpoints |
  | `sim` | `back_simulation.php` and battle results |
  | `engine` | the C engine in `Payload/` |
  | `runner` | the runner service in `runner/` |
  | `node` | the Socket.IO server in `node/` |
  | `db` | migrations and schema |
  | `docker` | Dockerfiles and `compose.yaml` |
  | `deps` | dependency manifests and lockfiles |
  | `config` | configuration, lint rules and ignore files |
  | `ci` | GitHub Actions |
  | `agents` | `AGENTS.md`, `.agents/` and `.github/copilot-instructions.md` |
  | `release` | version bumps |

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
