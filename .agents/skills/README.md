# gladCode project skills

Each project skill localizes one or more of the user's global skills to this codebase: the global skill gives the method, the project skill gives what is true here (paths, helper APIs, commands, conventions) and where gladCode deliberately departs from the global method. On project facts the project skill wins; `AGENTS.md` and `CONTRIBUTING.md` win over both.

## Project skills

| Skill | Localizes | Covers |
| --- | --- | --- |
| [`api-development`](api-development/SKILL.md) | `api-building`, `security-defense-and-mitigation` | Routers in `api/route`, `auth()`, `Validate`, `CustomError` codes, route docs, battle limits |
| [`entity-models`](entity-models/SKILL.md) | `entity-models` | `api/model`: base `Model`, entity and domain models, ownership filters, row locks |
| [`mysql-helper`](mysql-helper/SKILL.md) | `mysql-helper` | `api/helpers/mysql.js` API and rules, MySQL quirks, migrations |
| [`frontend-development`](frontend-development/SKILL.md) | `web-frontend` | `web/app.js` pages, Mustache views, import map, ES modules in `web/public/script` |
| [`css-standards`](css-standards/SKILL.md) | `css-standards` | `web/public/css`: files, breakpoints, colours, fonts, how views load styles |
| [`test-first-delivery`](test-first-delivery/SKILL.md) | `testing` | Every suite, its Docker command, mocking conventions, sabotage, known flakes |
| [`documentation-maintenance`](documentation-maintenance/SKILL.md) | `documentation-maintenance`, `document-touched-code` | Which document owns what, generated docs, comment rules |
| [`gladcode-simulation`](gladcode-simulation/SKILL.md) | (domain skill) | The C engine, battle flow, programmatic battles, dev tools, migrations, balance patches |

## Global skills that apply unchanged

`git-change-workflow` (with this repository's `CONTRIBUTING.md`), `code-review`, `clean-code-and-oop`, `frontend-design` and `impeccable` (for UI work), `job-orchestration`, `grilling`, `audit-project-context`.

To refresh this set after code or global-skill changes, use the global `bootstrap-project-skills` skill.
