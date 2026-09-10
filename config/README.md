# Private runtime config (NOT web-accessible)

This directory holds `config.json` with database + mailer secrets. It is
mounted read-only into the Apache container at `/var/www/private/` (see
`compose.yaml`), i.e. **outside** `public_html/` (`/var/www/html`), so it can
never be fetched via HTTP.

Layout:

```
config/
  config.json          # real secrets (gitignored, never commit)
  config.json.example  # template (tracked)
```

Setup:

```bash
cp config/config.json.example config/config.json
# edit config/config.json with real credentials
```

`public_html/connection.php` loads in this order:

1. Environment variables (`MYSQL_*`, `MAILER_*` from `.env` / compose)
2. `/var/www/private/config.json` (Docker mount of this directory)
3. `../config/config.json` (repo / sibling layout, e.g. production host)
4. Legacy `public_html/config.json` (deprecated fallback, web-accessible —
   remove it; `.htaccess` denies it as defense-in-depth)

`node/server.js` uses the same precedence (env → `../config/config.json` →
`node/config.json`).

If you are migrating an old install, move the file once:

```bash
mv public_html/config.json config/config.json
```
