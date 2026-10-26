#!/usr/bin/env bash

# Tournament dev tools from the shell: runs api/scripts/dev-tournament.js in the api container,
# which uses the same model as the /dev-tools page (no sign-in needed from the host).
# Run `dev-tools/tournament.sh help` for the commands.

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dev_tournament() {
    (cd "$ROOT" && docker compose exec -T api node scripts/dev-tournament.js "$@")
}

case "$1" in
    create)
        dev_tournament create "${2:-Test Tournament $(date '+%Y-%m-%d %H:%M:%S')}" "${3:-8}" "${4:-00:10:00}" ${5:+"$5"}
        ;;
    list|list-real|reset|cleanup)
        dev_tournament "$@"
        ;;
    reset-real)
        # kept for the old command name: reset works by id or hash for every tournament
        shift
        dev_tournament reset "$@"
        ;;
    export)
        if [ -z "$2" ]; then
            echo "Usage: $0 export <id|hash> [output_file]"
            exit 1
        fi
        output="${3:-tournament_${2}_export_$(date +%Y%m%d_%H%M%S).json}"
        dev_tournament export "$2" > "$output"
        echo "Exported to $output"
        ;;
    import)
        if [ ! -f "$2" ]; then
            echo "Usage: $0 import <json_file> [tournament_id]"
            exit 1
        fi
        dev_tournament import ${3:+"$3"} < "$2"
        ;;
    cleanup-all)
        read -r -p "Delete ALL test tournaments? Type YES_DELETE_ALL to confirm: " answer
        dev_tournament cleanup-all "$answer"
        ;;
    web)
        url="http://localhost:${WEB_PORT:-8085}/dev-tools"
        if command -v open > /dev/null; then open "$url"; elif command -v xdg-open > /dev/null; then xdg-open "$url"; else echo "Open $url"; fi
        ;;
    help|--help|-h|"")
        cat << EOF
Tournament dev tools

Usage: $0 <command> [options]

    create [name] [teams] [maxtime] [manager_email]
                                 test tournament of random full teams (manager defaults to the
                                 first ADMIN_EMAILS account)
    list                         test tournaments
    list-real [page] [limit]     real tournaments
    reset <id|hash> <round>      take a started tournament back to the start of a round
    cleanup <id>                 delete a test tournament (real ones are refused)
    cleanup-all                  delete every test tournament (asks for confirmation)
    export <id|hash> [file]      export a tournament with its rounds and battle logs to JSON
    import <file> [id]           import an export as a new tournament, or replace tournament <id>
    web                          open the /dev-tools page (administrators only)
EOF
        ;;
    *)
        echo "Unknown command: $1 (try: $0 help)"
        exit 1
        ;;
esac
