#!/usr/bin/env bash

# Dump or restore the gladCode database through the mysql service.
# Usage: dev-tools/dump_restore.sh dump      # writes dev-tools/dump_gladcode.sql
#        dev-tools/dump_restore.sh restore   # loads dev-tools/dump_gladcode.sql

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi
source "$ENV_FILE"

DB_NAME="${MYSQL_DATABASE:-gladcode}"
DUMP_FILE="$SCRIPT_DIR/dump_gladcode.sql"
mysql_service() {
    (cd "$ROOT" && docker compose exec -T mysql "$@")
}

case "$1" in
    dump)
        echo "Dumping database to $DUMP_FILE..."
        mysql_service mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" > "$DUMP_FILE"
        echo "Dump completed: $DUMP_FILE"
        ;;
    restore)
        if [ ! -f "$DUMP_FILE" ]; then
            echo "Error: Dump file $DUMP_FILE not found"
            exit 1
        fi
        echo "Restoring database from $DUMP_FILE..."
        mysql_service mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$DUMP_FILE"
        echo "Restore completed"
        ;;
    *)
        echo "Usage: $0 {dump|restore}"
        echo "  dump    - Dump database to $DUMP_FILE"
        echo "  restore - Restore database from $DUMP_FILE"
        exit 1
        ;;
esac
