#!/bin/sh
# One-shot database migration runner.
#
# Builds the migrate image and runs it with plain `docker run` on the MySQL
# container's network. It intentionally does NOT use `docker compose run` and
# does NOT depend on the long-lived `runner` service (or its node_modules
# volume): dependencies are baked into the image at build time.
#
# Usage: ./migrations/migrate.sh [--baseline=N]
#   Extra arguments are forwarded to `npm run db:migrate`.
#   DB connection comes from the environment, falling back to `.env`, then
#   to compose defaults (host `mysql`, port 3306, user `root`, db `gladcode`).
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIGRATIONS_DIR=$(cd "$(dirname "$0")" && pwd)

# Load .env for variables not already exported (shell wins, like compose).
if [ -f "$ROOT/.env" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in ''|'#'*) continue ;; esac
        key=${line%%=*}
        value=${line#*=}
        case "$key" in *[!A-Za-z0-9_]*|'') continue ;; esac
        value=${value%\"}; value=${value#\"}
        value=${value%\'}; value=${value#\'}
        if eval "[ -z \"\${$key+x}\" ]"; then
            eval "$key=\"\$value\""
        fi
    done < "$ROOT/.env"
fi

MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-gladcode}"

echo "[migrate] Building gladcode2-migrate image..."
docker build -f "$MIGRATIONS_DIR/Dockerfile" -t gladcode2-migrate "$MIGRATIONS_DIR"

# The MySQL container name follows compose naming for this checkout.
PROJECT=$(basename "$ROOT")
MYSQL_CONTAINER="${PROJECT}-mysql-1"
if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
    echo "[migrate] error: expected a running MySQL container named '$MYSQL_CONTAINER'." >&2
    exit 1
fi
NETWORK=$(docker inspect "$MYSQL_CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
if [ -z "$NETWORK" ]; then
    echo "[migrate] error: could not determine the network of '$MYSQL_CONTAINER'." >&2
    exit 1
fi

# Wait for MySQL to accept connections (deploy restarts it right before us).
echo "[migrate] Waiting for MySQL at $MYSQL_HOST:$MYSQL_PORT..."
tries=0
while true; do
    if [ -n "$MYSQL_PASSWORD" ]; then
        ping_ok=$(docker run --rm --network "$NETWORK" mysql:8.0 mysqladmin ping -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" 2>&1) || true
    else
        ping_ok=$(docker run --rm --network "$NETWORK" mysql:8.0 mysqladmin ping -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" 2>&1) || true
    fi
    case "$ping_ok" in
        *alive*) break ;;
    esac
    tries=$((tries + 1))
    if [ "$tries" -ge 30 ]; then
        echo "[migrate] error: MySQL did not become ready in time." >&2
        exit 1
    fi
    sleep 2
done

echo "[migrate] Running migrations..."
# Tolerate an npm-style `--` separator before forwarded arguments.
if [ "${1:-}" = "--" ]; then
    shift
fi
docker run --rm --network "$NETWORK" \
    -e MYSQL_HOST="$MYSQL_HOST" \
    -e MYSQL_PORT="$MYSQL_PORT" \
    -e MYSQL_USER="$MYSQL_USER" \
    -e MYSQL_PASSWORD="$MYSQL_PASSWORD" \
    -e MYSQL_DATABASE="$MYSQL_DATABASE" \
    gladcode2-migrate npm run db:migrate -- "$@"
