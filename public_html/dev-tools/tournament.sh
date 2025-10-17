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
            echo "Error: Token and round number required"
            echo "Usage: $0 reset <token> <round>"
            exit 1
        fi
        echo "Resetting tournament with token $2 to round $3..."
        curl -s "http://localhost/dev-tools/reset_tournament.php?token=$2&round=$3" | jq
        ;;
    
    list)
        echo "Listing all test tournaments..."
        curl -s "http://localhost/dev-tools/list_tournaments.php" | jq
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
    
    reset <token> <round>
        Reset tournament to a specific round
        Example:
            $0 reset a1b2c3d4e5f6g7h8 3
    
    list
        List all test tournaments
    
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
