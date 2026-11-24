# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students in class.** Teachers run classroom trainings and tournaments (IFSUL courses, the
  CharCode event); students write a gladiator's behaviour during or after class, often on school
  machines, and follow the round results together.
- **Self-taught learners.** Beginners learning to program on their own: they read the manual and
  the function reference, test in the editor, and come back to climb the ranking.

Teachers create trainings and tournaments from the same profile; they are an occasional role of the
same account, not a separate product.

## Product Purpose

gladCode teaches programming through a game. A master writes a gladiator's behaviour in C, Python
or blocks, tests it in the editor, and sends it into ranked battles, duels with friends,
tournaments and classroom trainings. Every battle is simulated by the engine and replayed in a 2D
arena or the 3D coliseum. Success is a learner who keeps iterating on their code because the
battles make the result of their logic visible.

## Positioning

The code is the gladiator: there is no manual control in a battle, only the program the master
wrote. Every result (a win, a crash, a renown change) is a direct consequence of the learner's
logic, replayed so they can see why.

## Operating Context

- Portuguese (Brazil) for every visible string; free to use.
- Building loop: editor (code or blocks, appearance creator, attribute points) → test battle →
  save → ranked battles, duels, tournaments, trainings → replays and reports → back to the editor.
- Classroom rituals: a teacher shares a training or tournament code, teams join, rounds run on a
  deadline, standings are shown at the end.
- Reference reading: the manual (rules, attributes, abilities, potions) and the function reference
  per language, with examples.
- Masters gain renown, levels, silver; spend silver on potions; exchange messages and friend
  requests.

## Capabilities and Constraints

- Server-rendered page shells (Express + Mustache) with native ES-module scripts, no bundler; the
  API is separate. Pages must work on phones and school desktops.
- Three site themes chosen in the profile (Arena light, Arena dark, Classic) with a "follow the
  system" default; the theme choice must survive any redesign.
- Battle replays: the Three.js 3D coliseum (Synty assets) and the classic Phaser 2D renderer.
- Engine facts the UI shows: STR/AGI/INT attributes, HP/AP, levels, renown, potions, abilities.

## Brand Commitments

- The name gladCode and the Roman arena theme: gladiators, masters, renown, the coliseum.
- The 3D coliseum replay is the signature imagery (front page and replays).
- The theme choice in the profile.
- The pixel-art LPC sprites and the current page structure are not commitments: they may be
  replaced.

## Evidence on Hand

- Real replays and the 3D coliseum renders (`web/public/image/home/`), real news posts, the full
  function reference and manual content, real ranking and tournament data in the local database.
- No testimonials, user counts or school partnerships beyond what the pages already state; none may
  be invented.

## Product Principles

1. Show the consequence of the code: every surface connects a result back to the logic that caused
   it.
2. Keep the next iteration one step away: from any result, the way back to the editor is obvious.
3. Teach in the open: rules, formulas and functions are readable reference, not hidden mechanics.
4. Classroom first: shared codes, deadlines and standings must read clearly on a projector and on a
   phone.
