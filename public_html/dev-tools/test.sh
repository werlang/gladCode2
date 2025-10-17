#!/bin/bash

# Test script for dev-tools
# Verifies all components are working

echo "🧪 Testing Tournament Dev Tools"
echo "================================"
echo ""

# Check if Docker is running
echo "1. Checking Docker..."
if ! docker compose ps | grep -q "apache.*Up"; then
    echo "❌ Apache container is not running"
    echo "   Run: docker compose up -d"
    exit 1
fi
echo "✅ Docker containers are running"
echo ""

# Test list endpoint
echo "2. Testing list endpoint..."
response=$(curl -s "http://localhost/dev-tools/list_tournaments.php")
if echo "$response" | grep -q '"status"'; then
    echo "✅ List endpoint is accessible"
else
    echo "❌ List endpoint failed"
    echo "Response: $response"
    exit 1
fi
echo ""

# Test web interface
echo "3. Testing web interface..."
if curl -s "http://localhost/dev-tools/index.html" | grep -q "Tournament Dev Tools"; then
    echo "✅ Web interface is accessible"
else
    echo "❌ Web interface failed"
    exit 1
fi
echo ""

# Test CLI script
echo "4. Testing CLI script..."
if [ -x "./public_html/dev-tools/tournament.sh" ]; then
    echo "✅ CLI script is executable"
else
    echo "❌ CLI script is not executable"
    echo "   Run: chmod +x ./public_html/dev-tools/tournament.sh"
    exit 1
fi
echo ""

# Test PHP syntax (optional - only if php is available on host)
echo "5. Testing PHP syntax..."
if command -v php &> /dev/null; then
    php_files=(
        "public_html/dev-tools/bootstrap_tournament.php"
        "public_html/dev-tools/cleanup_tournament.php"
        "public_html/dev-tools/list_tournaments.php"
        "public_html/dev-tools/cleanup_all.php"
    )

    for file in "${php_files[@]}"; do
        if php -l "$file" > /dev/null 2>&1; then
            echo "✅ $file - syntax OK"
        else
            echo "❌ $file - syntax error"
            php -l "$file"
            exit 1
        fi
    done
else
    echo "⚠️  PHP not found on host (skipping syntax check)"
    echo "   PHP files will be validated when accessed via Apache"
fi
echo ""

# Check tokens directory
echo "6. Checking tokens directory..."
if [ -d "public_html/dev-tools/tokens" ]; then
    echo "✅ Tokens directory exists"
    if [ -f "public_html/dev-tools/tokens/.gitignore" ]; then
        echo "✅ .gitignore exists"
    else
        echo "⚠️  .gitignore missing"
    fi
else
    echo "❌ Tokens directory missing"
    exit 1
fi
echo ""

# Final summary
echo "================================"
echo "✅ All tests passed!"
echo ""
echo "Ready to use:"
echo "  Web UI: http://localhost/dev-tools/index.html"
echo "  CLI: ./public_html/dev-tools/tournament.sh help"
echo ""
echo "Quick test:"
echo "  ./public_html/dev-tools/tournament.sh create \"Test\" 4"
echo ""
