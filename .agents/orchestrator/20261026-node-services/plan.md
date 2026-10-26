# Node services migration

Branch `refactor/node-services` (from `refactor/frontend-modernize`). Retire PHP, Apache and the dead
`node/` Socket.IO server; replace them with two Express services built like node-aec:

- `api/`: REST JSON API (camelCase payloads, `CustomError(status, message, code, data)`, error
  middleware, `auth()` middleware on a JWT `app_session` HttpOnly cookie issued from Google sign-in).
  `route/` composes HTTP, `model/` owns persistence and rules on a base `Model`, `helpers/mysql.js`
  is the only SQL executor (parameterised), `helpers/` holds the rest (runner client, mail, google
  auth, jwt, cookies). Vitest unit tests with supertest.
- `web/`: server-rendered shells with Mustache views (`view/*.html`, partials for header/footer),
  `middleware/render.js` injecting template vars (`apiUrl`, route params) and the module import map,
  static assets served from `web/public/`. No session or user data on the server; the browser loads
  everything from the API.

Decisions taken with the user: Node Express API, REST redesign, API and web pages in scope.

## Deviations from node-aec, on purpose

- MySQL stays (schema and ids kept; no Base62 `public_id` migration). The SQL helper is MySQL.
- Existing hashes (battle logs, tournaments, trainings, news) stay the external ids.
- No webpack: the frontend keeps native ES modules with an mtime import map.

## Infra impact (needs the maintainer at deploy time)

- Browser calls the API on its own origin (`API_URL`). Production needs `api.gladcode.dev`
  (DNS + host nginx route to the `api` service) and `WEB_URL`/`API_URL` in `.env`.
- PHP sessions are not carried over: every user signs in again once.

## Phases (each committed and verified)

1. API foundation: app, helpers (mysql, error, cookies, jwt, google-auth, env), middleware (auth,
   error), base model, `/health` `/ready`, Dockerfile, compose service, Vitest.
2. Web foundation: web service, render middleware, import map, views for every page, static assets
   moved from `public_html/` to `web/public/`, frontend `helpers/request.js` on JSON + credentials.
3. Auth and users (`back_login.php`).
4. Areas, one commit each, frontend models and components switched in the same commit, verified in
   the browser: news; gladiators and editor; simulation; slots/potions; ranking; stats; reports,
   duels, friends, messages, notifications, mail; matchmaking; tournaments (setup + run);
   trainings (setup + run); playback, logs and preferences; release, thanks.
5. Admin dev-tools, cron scripts (`remove_old_battles`), engine test helper, PHP tests to Vitest.
6. Retire `public_html/`, Apache, `node/`, PHPMailer; compose and deploy; docs (README, GUIDE,
   docs/api reference, AGENTS.md, CONTRIBUTING, Copilot guide, skills).

## Endpoint inventory (frontend usage today)

| Backend | Actions used |
| --- | --- |
| back_login | GET, SET (Google token), UNSET, UPDATE, TUTORIAL_END, TUTORIAL_LANGUAGE, EDITOR |
| back_news | GET (page), POST (hash) |
| back_glad | GET, DELETE, SAVE, FILE |
| back_simulation | args JSON (editor test, ranked, duel, tournament, training) |
| back_slots | ITEMS, SLOTS, BUY, EXPIRE, UPGRADE COSTS/APOT |
| back_rank | GET, MAXMINE, GET TABS, WATCH TAB, FETCH |
| back_stats | load, save battle |
| back_report | GET, FAVORITE |
| back_duel | GET, CHALLENGE, DELETE, REPORT |
| back_friends | GET, FILTER, SEARCH, REQUEST, ADD, DELETE |
| back_message | GET, SEND, REPLY, READ, DELETE |
| back_notification | GET, SUMMARY |
| back_sendmail | MESSAGE, FRIEND, DUEL, TOURNAMENT, UPDATE |
| back_match | MATCH |
| back_tournament | CREATE, LIST, JOIN, LIST_TEAMS, TEAM_CREATE, TEAM, LEAVE_TEAM, JOIN_TEAM, ADD_GLAD, REMOVE_GLAD, KICK, DELETE, START |
| back_tournament_run | GET, REFRESH, GLADS, CHOOSE, UPDATE, END TURN |
| back_train | JOIN, CREATE, LIST, ROOM, EDIT, RENEW, KICK, DELETE, REMOVE, CHANGE, START |
| back_training_run | GET, REFRESH, DEADLINE, NEW ROUND, RERUN |
| back_log | GET, DELETE |
| back_play | GET_PREF, SET_PREF |
| back_update | GET, SET |
| back_thanks | SET |

Pages: index, about, creditos, docs, docs-ptbr, docs-blocks, manual, function, stats, post, editor,
profile, playback, tournament, training, thanks, update (+ header, footer, module_scripts).

## Progress

- [x] API foundation (88375e749), web foundation (55780e2d8), auth and users (53f60ef06), news (645f31605)
- [x] Gladiators, editor test battles, logs, battle core (c498d8e18): `model/battle.js` is the shared
      battle runner; ranked, duel, tournament and training runs still go through it in their phases.
- [x] Potions and replay preferences (3d78f9586), ranking and stats (5399815c0)
- [x] Friends, messages, reports, notifications, mail (590e73a89); duels, ranked battles, server-side stats (5f5add820)
- [x] Tournaments: setup, teams, rounds, group battles (lock per group), start and round emails sent by the API
- [ ] Trainings
- [ ] Release, thanks, admin dev-tools, cron, engine test, PHP tests
- [ ] Retire public_html/Apache/node, compose for production, docs

Local testing: `docker compose exec api node scripts/issue-session.js 277` gives an `app_session`
cookie for `localhost` (web on 8085, API on 8086, old Apache on 8087).
