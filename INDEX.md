# gladCode 2 index

The map of the repository's documents. Read the row that matches your job.

## Start here

| Document | What it is |
| :--- | :--- |
| [README.md](README.md) | What gladCode is, the services, the local stack and the deploy. |
| [GUIDE.md](GUIDE.md) | Architecture and ownership boundaries: services, data flow, repository map, where each kind of code lives, the frontend layers and the 3D renderer. |
| [TESTING.md](TESTING.md) | Every validation command, what it covers and how to run it through Docker. |
| [AGENTS.md](AGENTS.md) | The agent rule book: execution rules, coding and security standards, frontend standards, workflows and diagnostics. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, commit types and scopes, and how work is merged. |

## Design

| Document | What it is |
| :--- | :--- |
| [DESIGN.md](DESIGN.md) | The visual direction: three themes, composition, voice, anti-goals. |
| [docs/design-system.md](docs/design-system.md) | The implementation contract: tokens, themes, primitives, CSS architecture, ownership, governance. |
| [docs/design/painel/README.md](docs/design/painel/README.md) | The Painel boards (`*.dc.html`), their route/view/entry/component/API mapping, and how Arena dark and Classic map. Live canvas: <https://claude.ai/artifact/3ZpFREySqX238vTF3ER3fn>. |
| [docs/design/painel/FIDELITY.md](docs/design/painel/FIDELITY.md) | The board-by-board WP9 audit: side-by-side evidence, every element's status and the intentional differences. |

## Frontend

| Document | What it is |
| :--- | :--- |
| [docs/frontend/README.md](docs/frontend/README.md) | Overview and reading order of the frontend contract. |
| [docs/frontend/conventions.md](docs/frontend/conventions.md) | Folder ownership, module rules, naming, file size, CSS ownership, accessibility and testing. |
| [docs/frontend/components.md](docs/frontend/components.md) | The component catalogue: purpose, API, events, stylesheet, the boards that show it, and whether it exists today. |
| [docs/frontend/events.md](docs/frontend/events.md) | Component events and the app event bus, naming, payloads and the end-to-end flows. |
| [docs/frontend/pages.md](docs/frontend/pages.md) | The page shell, section routing, section lifecycle, states and the phone layout. |

## API, data and operations

| Document | What it is |
| :--- | :--- |
| [docs/api/README.md](docs/api/README.md) | The REST API reference, generated from the `METHOD /path` route comments. |
| [docs/synty-assets/README.md](docs/synty-assets/README.md) | How the Synty packs are measured and loaded (units, pivots, materials). |
| [docs/synty-assets/INDEX.md](docs/synty-assets/INDEX.md) | The pack index; each `<pack>.tsv` lists its FBX files and `<pack>.textures.tsv` its images. |
| [web/public/assets/README.md](web/public/assets/README.md) | The runtime Synty folder: the loaders that consume it and the licence note. |
| [web/public/res/audio/arena/CREDITS.md](web/public/res/audio/arena/CREDITS.md) | Sources and licences of the arena sounds. |
| [web/public/sprite/Universal-LPC-spritesheet/README.md](web/public/sprite/Universal-LPC-spritesheet/README.md) | The LPC spritesheet notice and its authors. |
| [migrations/](migrations/) | Numbered SQL migrations and the runner (`migrations/migrate.sh`). |
| [dev-tools/README.md](dev-tools/README.md) | The tournament CLI, database dump/restore, release news SQL, board renderer, documentation checker and phone/theme/axe audit. |
| [Setup/README](Setup/README) | The `gladcode2-vm` engine image. |
| [backup/README.md](backup/README.md) | The database backup helper. |

## Agent guidance

| Document | What it is |
| :--- | :--- |
| [.agents/skills/README.md](.agents/skills/README.md) | The project skills index; each skill localizes a global skill to this codebase. |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | A short summary for Copilot. |
| [.agents/skills/gladcode-simulation/](.agents/skills/gladcode-simulation/SKILL.md) | The engine, battle flow, programmatic battles, dev tools, migrations and balance. |

## Internal plans

| Document | What it is |
| :--- | :--- |
| `.orchestration/PLAN.md` (local, not in git) | The Painel redesign master plan (roles, work packages, gates). It is excluded from git by `.git/info/exclude` and resolves only in the orchestration workspace. |
| [.agents/orchestrator/](.agents/orchestrator/) | Earlier migration and design-system plans (tracked). |

## Runtime layout

```text
compose.yaml / compose.dev.yaml
├── web/       Express + Mustache page shells and the browser ES modules
├── api/       Express JSON API, models, routes and battle orchestration
├── runner/    Battle executor driving the host Docker
├── mysql      MySQL 8.0
└── Payload/   C simulation engine run inside the gladcode2-vm image
```
