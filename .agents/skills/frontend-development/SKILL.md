---
name: frontend-development
description: Build or change gladCode's web service and browser code — web/app.js page routes and old-address redirects, Mustache views in web/view, the render middleware and import map, and the ES modules in web/public/script (page entries, components, helpers, models, templates, profile, editor). Use for any page, frontend module or API call from the browser. Excludes the 3D renderer internals (render2/), which GUIDE.md documents in full.
---

# gladCode frontend development

Localizes the global `web-frontend` skill (with `security-defense-and-mitigation` for escaping): follow it for the method; this file holds what is true in gladCode. On project facts, this file wins. The full contract is [`docs/frontend/`](../../../docs/frontend/README.md) (conventions, component catalogue, event bus, page shell); the agent rules are AGENTS.md → [Frontend Standards](../../../AGENTS.md#frontend-standards); the architecture is [GUIDE.md](../../../GUIDE.md).

## Where

- `web/app.js`: `page(route, view, clientVars)` per page, static files (`redirect: false`), `/profpics`, maintenance mode after static files, the old-address redirect (`legacyPageUrl` in `web/helpers/urls.js`) registered after every page route.
- `web/middleware/render.js`: `res.page()`; views get `{{#asset}}`/`{{#module}}` (mtime-versioned URLs), `{{{importMap}}}` and `{{{templateVars}}}` (`web/helpers/safe-json.js`). Import maps, asset URLs and the view list are cached when `NODE_ENV=production`.
- `web/helpers/modules.js`: the import map over `MODULE_DIRS` (add new script folders there), plus three.js and `script/render2/` on every page (the cards and the editor import them on demand); `render2: true` only decides whether the replay page loads the 3D entry, not what the map contains.
- `web/view/*.html`: one Mustache view per page plus `head` (font preload, `tokens.css`, `theme-boot.js`), `header`, `footer`, `analytics` partials.
- `web/public/script/`: page entries (`*.js`), `components/`, `helpers/` (`request.js` with `api`/`site` and `BATTLE_TIMEOUT_MS`, `html.js`, `template-var.js`, `local-data.js`, `event-bus.js`), `models/` (the only callers of the API), `services/` (DOM-free state that emits app events), `templates/`, `profile/`, `editor/`; the layout and rules are in [`docs/frontend/`](../../../docs/frontend/README.md).

## Rules

- A new page: a view in `web/view/`, a `page()` line in `web/app.js` before the legacy redirect, an entry module loaded with `{{#module}}name.js{{/module}}` after `{{{importMap}}}`.
- Route values the script needs go through `clientVars` and are read with `TemplateVar.get()`; the web service never sees the session, so nothing private goes there.
- Every API call is a method on a `models/*` class over `api.get|post|put|delete`; pass `{ timeout: BATTLE_TIMEOUT_MS }` for calls that run a battle. Pages branch on `RequestError.code`, with a message for every code the route throws and a general fallback.
- UI primitives: `components/button.js` `Button` for any button that runs a request (`click(action)` shows a spinner and blocks double sends), `components/input.js` `Input` and `components/select.js` `Select` for form fields (`setError` marks a refused value), `templates/empty-state.js` for "nothing here" in lists and tables. Their styles and variants are in the `css-standards` project skill.
- Markup from user or server text: `renderTemplate` with `{{key}}`, `escapeHtml`, or `textContent`. Dialog and toast messages are markup: escape names inside them.
- No new globals; `playback.js` `exposeLegacyGlobals` is the one bridge for `render.js` and `render2/`.
- A new view includes `{{> head}}` right after its viewport meta, before any other stylesheet. The site theme goes through `helpers/theme.js` (`applyTheme`, `resolveTheme`, `storedThemeChoice`, `THEME_CHOICES`); styles follow the `css-standards` project skill.

## Deviations from `web-frontend`

- Scripts live in `web/public/script/`, not `src/js/`, and there is no bundler: native ES modules with an mtime import map, so a deploy busts caches without a build.
- Templates are markup-string modules in `templates/`, besides the server-side Mustache views.
- The classic Phaser renderer (`render.js`, `floatingText.js`) and vendored `phaser.js`/`croppie.js` stay classic scripts.

## Commands

```bash
docker run --rm -v "$PWD":/w -v /w/node_modules -w /w node:22-alpine sh -c "npm ci && npm run lint && npm test"
docker compose exec -T web npm test                          # page routes and redirects
docker run --rm -v "$PWD":/w -w /w node:22-alpine node web/scripts/compress-functions.js   # after editing script/functions/
```

## Checks before finishing

- Lint clean and `tests/frontend` green; a new pure helper gets a test there.
- The page loads on http://localhost:8085 with no console errors; new error codes show a message. Check it in Arena light, Arena dark and Classic.
