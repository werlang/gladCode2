# gladCode Interface Direction

Implementation contract: [docs/design-system.md](docs/design-system.md) owns the tokens, the
themes and the ownership rules behind this direction.

## Subject

gladCode is a programming game. Masters write a gladiator's behaviour in C, Python or blocks,
test it in the editor, then send it to ranked battles, duels, tournaments and classroom
trainings; every battle is replayed in a 2D arena or the 3D coliseum. The pages serve two
moments: building (the editor, the docs, the profile) and watching (replays, rankings, rounds).

## Thesis

The arena is the brand: a Roman coliseum where code fights. Building pages should feel like a
well-lit workshop next to the arena; watching pages bring the arena itself to the screen.

## Three themes

Masters choose in their profile; until they do, the system colour scheme picks Arena light or
Arena dark.

- **Arena light** (the default on light systems): the coliseum by day. Parchment and sand surfaces
  (`#fffaf0`, `#f3e8d0`) on a warm page, ink text (`#1b2a35`), the ink header and side panels
  framing the sand, bronze for small accents, torch gold for actions, Cinzel for headings.
- **Arena dark** (the default on dark systems): night over the coliseum. Ink surfaces from the
  front page and the 3D replay (`#0b1d2b` to `#1f4664`), mist text, sand for titles and the header, torch gold for actions and
  focus, blood red for danger, Cinzel for headings.
- **Classic**: the workshop, chosen explicitly. Cool light grey page (`#edf1f3`), white panels, grey
  text, the brand blue `#00638d` on the header, side panels, titles and actions, Acme for headings.
  This is how gladCode looked for years.

Every theme shares the brand blue, the type families' roles (Roboto for reading, Acme for the
game's interface lettering on cards, profile and tournaments, Source Code Pro for code and
numbers, Orbitron for countdown digits) and every content colour: game bars (HP red, AP blue, XP
yellow), the STR/AGI/INT attribute colours, medals, the profile menu's section colours and the 3D
chrome's leather, brass and parchment.

Some regions stay dark in every theme (`tone-night`, the Arena dark roles): the front page hero
over the arena video, code panels, and the 3D replay chrome. The front page's step band stays sand in every theme.

## Composition

The fixed ink (Arena) or blue (Classic) header is the constant frame. Building pages are
panels on the page colour with a clear primary action; watching pages give the canvas the whole
viewport and keep controls at its edge. Phone layouts collapse to one column and keep the
primary task first.

## Signature

The coliseum: the 3D arena on the front page and in replays, sand and torch gold around it, and
the pixel-art gladiators from the LPC sprites everywhere a gladiator is shown.

## Imagery and motion

Real replays, sprites and the Synty coliseum are the imagery; no stock art. Motion is
functional: progress while a battle runs, small lifts and colour changes on controls. Reduced
motion turns transitions and animations off (`tokens.css`).

## Voice

Portuguese for every visible string, short and direct: name the action ("Executar batalha",
"GRAVAR") and say what happened ("Duelo concluído"). Errors say what to do next.

## Anti-goals

- No generic admin theme or SaaS dashboard look (the old indigo dev tools are gone).
- No new palette outside `tokens.css`; fonts are self-hosted (Font Awesome icons and the Prism
  code theme are the only stylesheets loaded from a CDN).
- No theme that breaks another: every page is checked in Arena light, Arena dark and Classic.
- No decorative gradients over content; gradients belong to the arena art (hero fade, medals,
  the 3D chrome).
