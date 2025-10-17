#!/usr/bin/env bash

# Simple dump/restore script for gladCode database
# Usage: ./dump_restore.sh dump    # to dump database to dump_gladcode.sql
#        ./dump_restore.sh restore # to restore database from dump_gladcode.sql

set -e

# Load environment variables from .env file
ENV_FILE="../../.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi
source "$ENV_FILE"

MYSQL_CONTAINER="gladcode2-mysql-1"
DB_NAME="${MYSQL_DATABASE:-gladcode}"
DUMP_FILE="dump_gladcode.sql"

case "$1" in
    dump)
        echo "Dumping database to $DUMP_FILE..."
        docker exec $MYSQL_CONTAINER mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" $DB_NAME > $DUMP_FILE
        echo "Dump completed: $DUMP_FILE"
        ;;
    restore)
        if [ ! -f "$DUMP_FILE" ]; then
            echo "Error: Dump file $DUMP_FILE not found"
            exit 1
        fi
        echo "Restoring database from $DUMP_FILE..."
        docker exec -i $MYSQL_CONTAINER mysql -u root -p"$MYSQL_ROOT_PASSWORD" $DB_NAME < $DUMP_FILE
        echo "Restore completed"
        ;;
    *)
        echo "Usage: $0 {dump|restore}"
        echo "  dump   - Dump database to $DUMP_FILE"
        echo "  restore - Restore database from $DUMP_FILE"
        exit 1
        ;;
esac