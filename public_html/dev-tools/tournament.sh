#!/bin/bash

# Tournament Dev Tools CLI Helper
# Provides convenient commands for managing test tournaments

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$1" in
    create)
        echo "Creating test tournament..."
        name="${2:-Test Tournament}"
        teams="${3:-8}"
        maxtime="${4:-00:10:00}"
        curl -s "http://localhost/dev-tools/bootstrap_tournament.php?name=${name}&teams=${teams}&maxtime=${maxtime}" | jq
        ;;
    
    cleanup)
        if [ -z "$2" ]; then
            echo "Error: Token required"
            echo "Usage: $0 cleanup <token>"
            exit 1
        fi
        echo "Cleaning up tournament with token: $2"
        curl -s "http://localhost/dev-tools/cleanup_tournament.php?token=$2" | jq
        ;;
    
    reset)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Error: Identifier and round number required"
            echo "Usage: $0 reset <token|hash> <round>"
            exit 1
        fi
        
        # Check if $2 looks like a hash (longer) or token (16 chars)
        if [ ${#2} -gt 16 ]; then
            echo "Resetting tournament with hash $2 to round $3..."
            curl -s "http://localhost/dev-tools/reset_tournament.php?hash=$2&round=$3" | jq
        else
            echo "Resetting tournament with token $2 to round $3..."
            curl -s "http://localhost/dev-tools/reset_tournament.php?token=$2&round=$3" | jq
        fi
        ;;
    
    list)
        echo "Listing all test tournaments..."
        curl -s "http://localhost/dev-tools/list_tournaments.php" | jq
        ;;
    
    list-real)
        page="${2:-1}"
        limit="${3:-10}"
        echo "Listing production tournaments (page $page, limit $limit)..."
        curl -s "http://localhost/dev-tools/list_real_tournaments.php?page=$page&limit=$limit" | jq
        ;;
    
    export)
        if [ -z "$2" ]; then
            echo "Error: Tournament identifier required"
            echo "Usage: $0 export <id|hash|token> [output_file]"
            exit 1
        fi
        
        identifier="$2"
        output="${3:-tournament_${identifier}_export.json}"
        
        # Detect if it's an ID (numeric), hash (alphanumeric, longer), or token (16 chars)
        if [[ "$identifier" =~ ^[0-9]+$ ]]; then
            echo "Exporting tournament by ID: $identifier"
            curl -s "http://localhost/dev-tools/export_tournament.php?id=$identifier" -o "$output"
        elif [ ${#identifier} -eq 16 ]; then
            echo "Exporting tournament by token: $identifier"
            curl -s "http://localhost/dev-tools/export_tournament.php?token=$identifier" -o "$output"
        else
            echo "Exporting tournament by hash: $identifier"
            curl -s "http://localhost/dev-tools/export_tournament.php?hash=$identifier" -o "$output"
        fi
        
        if [ -f "$output" ]; then
            echo "✅ Export saved to: $output"
            echo "File size: $(du -h "$output" | cut -f1)"
        else
            echo "❌ Export failed"
        fi
        ;;
    
    import)
        if [ -z "$2" ]; then
            echo "Error: JSON file required"
            echo "Usage: $0 import <json_file> [tournament_id]"
            echo ""
            echo "Examples:"
            echo "  $0 import tournament_export.json           # Create new tournament"
            echo "  $0 import tournament_export.json 129      # Update tournament 129"
            exit 1
        fi
        
        json_file="$2"
        tournament_id="$3"
        
        if [ ! -f "$json_file" ]; then
            echo "Error: File not found: $json_file"
            exit 1
        fi
        
        if [ -z "$tournament_id" ]; then
            echo "Importing tournament (CREATE mode)..."
            curl -s -X POST "http://localhost/dev-tools/import_tournament.php" \
                -F "file=@$json_file" \
                -F "mode=create" | jq
        else
            echo "⚠️  WARNING: This will UPDATE tournament $tournament_id and DELETE all existing data!"
            read -p "Type 'YES' to confirm: " confirm
            if [ "$confirm" = "YES" ]; then
                echo "Importing tournament (UPDATE mode for tournament $tournament_id)..."
                curl -s -X POST "http://localhost/dev-tools/import_tournament.php" \
                    -F "file=@$json_file" \
                    -F "mode=update" \
                    -F "tournament_id=$tournament_id" | jq
            else
                echo "Import cancelled."
            fi
        fi
        ;;
    
    cleanup-all)
        echo "⚠️  WARNING: This will delete ALL test tournaments!"
        read -p "Type 'YES' to confirm: " confirm
        if [ "$confirm" = "YES" ]; then
            curl -s "http://localhost/dev-tools/cleanup_all.php?confirm=YES_DELETE_ALL" | jq
        else
            echo "Aborted."
        fi
        ;;
    
    web)
        echo "Opening web interface..."
        if command -v open &> /dev/null; then
            open "http://localhost/dev-tools/index.html"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost/dev-tools/index.html"
        else
            echo "Please open http://localhost/dev-tools/index.html in your browser"
        fi
        ;;
    
    help|--help|-h|"")
        cat << EOF
Tournament Dev Tools CLI

Usage: $0 <command> [options]

Commands:
    create [name] [teams] [maxtime]
        Create a test tournament
        Examples:
            $0 create "My Test" 8 00:10:00
            $0 create
    
    cleanup <token>
        Cleanup a specific tournament by token
        Example:
            $0 cleanup a1b2c3d4e5f6g7h8
    
    reset <token|hash> <round>
        Reset tournament to a specific round
        Works with both test tournaments (token) and real tournaments (hash)
        Examples:
            $0 reset a1b2c3d4e5f6g7h8 3    (test tournament by token)
            $0 reset abc123def456 2          (real tournament by hash)
    
    list
        List all test tournaments
    
    list-real [page] [limit]
        List all production (real) tournaments with pagination
        Examples:
            $0 list-real           (page 1, 10 per page)
            $0 list-real 2         (page 2, 10 per page)
            $0 list-real 1 20      (page 1, 20 per page)
    
    export <id|hash|token> [output_file]
        Export tournament data to JSON file
        Auto-detects type: numeric=ID, 16chars=token, other=hash
        Examples:
            $0 export 129                              (by ID, auto-named file)
            $0 export 129 my_tournament.json          (by ID, custom filename)
            $0 export a32eb447a2497e72                (by hash)
            $0 export a1b2c3d4e5f6g7h8                (by token)
    
    import <json_file> [tournament_id]
        Import tournament data from JSON export
        Without tournament_id: Creates new tournament (CREATE mode)
        With tournament_id: Updates existing tournament (UPDATE mode)
        Examples:
            $0 import tournament_export.json           (create new)
            $0 import tournament_export.json 129      (update tournament 129)
    
    cleanup-all
        Delete ALL test tournaments (requires confirmation)
    
    web
        Open web interface in browser
    
    help
        Show this help message

Examples:
    # Create tournament with defaults
    $0 create
    
    # Create custom tournament
    $0 create "Epic Battle" 16 00:05:00
    
    # List all tournaments
    $0 list
    
    # Export tournament
    $0 export 129
    
    # Import as new tournament
    $0 import tournament_129_export.json
    
    # Update existing tournament
    $0 import tournament_129_export.json 129
    
    # Cleanup specific tournament
    $0 cleanup a1b2c3d4e5f6g7h8
    
    # Reset tournament to round 3
    $0 reset a1b2c3d4e5f6g7h8 3
    
    # Open web interface (recommended)
    $0 web

For more information, see dev-tools/README.md
EOF
        ;;
    
    *)
        echo "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
