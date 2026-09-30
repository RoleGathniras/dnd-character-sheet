#!/usr/bin/env bash

set -euo pipefail

echo "=== DnD Character Sheet Update ==="
echo
echo "Prüfe Git-Repository..."

if [[ -n "$(git status --porcelain)" ]]; then
    echo "FEHLER: Das Repository enthält lokale Änderungen."
    echo "Update wurde abgebrochen."
    exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"

if [[ "$CURRENT_BRANCH" != "master" ]]; then
    echo "FEHLER: Aktueller Branch ist '$CURRENT_BRANCH', erwartet wurde 'master'."
    echo "Update wurde abgebrochen."
    exit 1
fi

echo "Hole aktuelle Version..."
git pull --ff-only origin master

echo "✓ Repository aktualisiert"

echo
echo "Baue Docker-Images..."
docker compose build

echo
echo "Stelle sicher, dass die Datenbank läuft..."
docker compose up -d db

echo
echo "Stoppe Anwendung für die Datenbankmigration..."
docker compose stop api web

echo
echo "Aktualisiere Datenbank..."
docker compose run --rm api alembic upgrade head

echo "✓ Datenbank ist aktuell"

echo
echo "Starte Anwendung..."
docker compose up -d

echo
echo "=== Update erfolgreich ==="
docker compose ps