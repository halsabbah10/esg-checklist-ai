#!/bin/bash

# ESG Checklist AI - Database Migration Script
# This script helps manage database migrations using Alembic

set -e  # Exit on any error

BACKEND_DIR="/Users/axerroce/esg-checklist-ai /esg-checklist-ai/backend"
PYTHON_PATH="/Users/axerroce/esg-checklist-ai /esg-checklist-ai/.venv/bin/python"

cd "$BACKEND_DIR"

echo "🗄️  ESG Checklist AI - Database Migration Tool"
echo "=============================================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  init        - Initialize Alembic (first time setup)"
    echo "  create      - Create a new migration"
    echo "  upgrade     - Apply all pending migrations"
    echo "  downgrade   - Downgrade to previous migration"
    echo "  current     - Show current migration"
    echo "  history     - Show migration history"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore from latest backup"
    echo ""
}

# Function to create database backup
backup_db() {
    if [ -f "test.db" ]; then
        BACKUP_NAME="test.db.backup.$(date +%Y%m%d_%H%M%S)"
        cp test.db "$BACKUP_NAME"
        echo "✅ Database backed up to: $BACKUP_NAME"
    else
        echo "⚠️  No database file found to backup"
    fi
}

# Function to restore database
restore_db() {
    LATEST_BACKUP=$(ls -t test.db.backup.* 2>/dev/null | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        read -p "Restore from $LATEST_BACKUP? This will overwrite current database. (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$LATEST_BACKUP" test.db
            echo "✅ Database restored from: $LATEST_BACKUP"
        else
            echo "❌ Restore cancelled"
        fi
    else
        echo "❌ No backup files found"
    fi
}

# Main script logic
case "${1:-help}" in
    "init")
        echo "🔧 Initializing Alembic..."
        "$PYTHON_PATH" -m alembic init alembic
        echo "✅ Alembic initialized"
        ;;
    "create")
        echo "📝 Creating new migration..."
        backup_db
        read -p "Enter migration message: " MESSAGE
        "$PYTHON_PATH" -m alembic revision --autogenerate -m "$MESSAGE"
        echo "✅ Migration created"
        ;;
    "upgrade")
        echo "⬆️  Applying migrations..."
        backup_db
        "$PYTHON_PATH" -m alembic upgrade head
        echo "✅ Migrations applied"
        ;;
    "downgrade")
        echo "⬇️  Downgrading migration..."
        backup_db
        "$PYTHON_PATH" -m alembic downgrade -1
        echo "✅ Migration downgraded"
        ;;
    "current")
        echo "📍 Current migration:"
        "$PYTHON_PATH" -m alembic current
        ;;
    "history")
        echo "📜 Migration history:"
        "$PYTHON_PATH" -m alembic history
        ;;
    "backup")
        backup_db
        ;;
    "restore")
        restore_db
        ;;
    "help"|*)
        show_usage
        ;;
esac
