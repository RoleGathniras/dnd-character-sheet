# 🐉 DnD Character Sheet

Eine webbasierte Anwendung zur Verwaltung von DnD-5e-Charakteren und
Kampagnen.

Die Anwendung besteht aus einem **FastAPI-Backend**, einer
**PostgreSQL-Datenbank** und einem browserbasierten
**Vanilla-JavaScript-Frontend**. Spieler verwalten ihre Charaktere,
während DMs eigene Kampagnen anlegen und vorhandene Spielercharaktere
einer Kampagne zuordnen können. Die Benutzeroberfläche ist
deutschsprachig.

> 🚧 **Work in Progress:** Das Projekt befindet sich aktiv in
> Entwicklung. Grundfunktionen für Spieler, DMs und Administration sind
> bereits vorhanden; weitere Funktionen folgen.

------------------------------------------------------------------------

## ✨ Aktueller Funktionsumfang

-   JWT-basierte Anmeldung mit Rollen `player`, `dm` und `admin`
-   Charakterverwaltung mit Charakterbogen, Fertigkeiten, Rettungswürfen
    und Kampfwerten
-   Zauberbuch und Zauberverwaltung
-   Aktionsübersicht
-   Inventar und Charakterbeschreibung
-   Regelwerk-Viewer für lokal bereitgestellte PDFs
-   Admin-Bereich zur Benutzerverwaltung
-   DM-Kampagnen
    -   Kampagnen erstellen, bearbeiten und löschen
    -   Kampagnenbild
    -   Spielercharaktere einer Kampagne zuordnen
    -   Kampagnenstatus wie Sitzungsnummer, Ingame-Tage, Buchseite und
        Levelbereich
-   PostgreSQL-Datenbank mit versionierten **Alembic-Migrationen**
-   Docker-basierter Betrieb
-   Automatisches Update-Script für bestehende Installationen

------------------------------------------------------------------------

## ⚙️ Voraussetzungen

-   Git
-   Docker
-   Docker Compose

------------------------------------------------------------------------

# 🚀 Erstinstallation

## 1. Repository klonen

``` bash
git clone https://github.com/RoleGathniras/dnd-character-sheet.git
cd dnd-character-sheet
```

## 2. Umgebungsvariablen anlegen

``` bash
cp .env.example .env
```

Öffne anschließend `.env` und setze mindestens einen eigenen sicheren
`SECRET_KEY`.

Beispiel:

``` env
DATABASE_URL=postgresql+psycopg://dnd:dnd@db:5432/dnd
SECRET_KEY=dein_langer_zufaelliger_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=http://localhost:8080
DB_ECHO=false
```

Einen zufälligen Secret Key kannst du unter Linux beispielsweise so
erzeugen:

``` bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Wichtige Variablen

  Variable                        Beschreibung
  ------------------------------- -----------------------------------------
  `DATABASE_URL`                  Verbindung zur PostgreSQL-Datenbank
  `SECRET_KEY`                    Schlüssel für die JWT-Authentifizierung
  `ACCESS_TOKEN_EXPIRE_MINUTES`   Gültigkeitsdauer eines Login-Tokens
  `BACKEND_CORS_ORIGINS`          Erlaubte Frontend-Ursprünge
  `DB_ECHO`                       Aktiviert SQL-Debug-Ausgaben

> ⚠️ Die `.env`-Datei enthält sensible Konfiguration und darf nicht in
> das Repository committed werden.

## 3. Regelwerk-PDFs bereitstellen

Die von der Anwendung verwendeten Regelwerk-PDFs sind **nicht
Bestandteil des Git-Repositories** und müssen separat bereitgestellt
werden.

Lege die Dateien unter folgendem Pfad ab:

``` text
frontend/pdf/
```

Beispiel:

``` text
frontend/pdf/
├── races.pdf
├── classes.pdf
├── fight.pdf
├── gear.pdf
└── ...
```

Docker bindet diesen Ordner read-only in den Webserver ein. Innerhalb
der Anwendung sind die Dateien unter folgendem Schema erreichbar:

``` text
/assets/pdf/<dateiname>.pdf
```

`frontend/pdf/` wird von Git ignoriert. Lokal hinterlegte PDFs bleiben
deshalb bei späteren Updates per Git erhalten.

## 4. Docker-Images bauen

``` bash
docker compose build
```

## 5. Datenbank starten

``` bash
docker compose up -d db
```

## 6. Datenbankschema anlegen

Die Datenbankstruktur wird mit **Alembic** verwaltet.

Bei einer neuen Installation:

``` bash
docker compose run --rm api alembic upgrade head
```

Dadurch werden alle vorhandenen Migrationen in der richtigen Reihenfolge
angewendet und die aktuelle Datenbankstruktur erzeugt.

## 7. Anwendung starten

``` bash
docker compose up -d
```

Status prüfen:

``` bash
docker compose ps
```

------------------------------------------------------------------------

# 🌐 Zugriff

Bei Verwendung der Standardports:

-   Frontend: `http://localhost:8080`
-   API: `http://localhost:8000`
-   FastAPI-Dokumentation: `http://localhost:8000/docs`

Bei Installation auf einem anderen Rechner ersetzt du `localhost` durch
dessen Hostnamen oder IP-Adresse.

------------------------------------------------------------------------

# 👑 Ersten Admin-User anlegen

Nach einer neuen Installation existiert zunächst kein Benutzer.

Einen Admin kannst du einmalig über das Backend anlegen:

``` bash
docker compose exec api python3 -m app.api.create_admin
```

Falls das Script Standard-Zugangsdaten vorgibt, sollten diese
anschließend unbedingt geändert werden.

------------------------------------------------------------------------

# 🔄 Bestehende Installation aktualisieren

Für Updates befindet sich im Projektstamm das Script:

``` text
update.sh
```

Auf einer Linux-Installation genügt:

``` bash
./update.sh
```

Das Script übernimmt den Updateprozess automatisch:

1.  Prüfen, ob das lokale Git-Repository unveränderte Dateien enthält.
2.  Prüfen, ob der Branch `master` aktiv ist.
3.  Aktuellen Stand von `origin/master` laden.
4.  Neue Docker-Images bauen.
5.  Sicherstellen, dass PostgreSQL läuft.
6.  API und Webfrontend für die Migration kurz stoppen.
7.  `alembic upgrade head` ausführen.
8.  Anwendung mit der neuen Version starten.
9.  Containerstatus anzeigen.

Dabei wird `alembic upgrade head` bei **jedem Update** ausgeführt.
Enthält das Update keine neue Datenbankmigration, muss nichts verändert
werden. Sind neue Migrationen vorhanden, werden nur die noch fehlenden
Migrationen angewendet.

Damit muss ein Betreiber bei normalen Updates nicht manuell feststellen,
ob sich das Datenbankschema geändert hat.

> Das Update-Script bricht bei Fehlern ab. Lokale, nicht commitete
> Änderungen im Repository führen ebenfalls zum Abbruch, damit sie nicht
> versehentlich durch ein Update überschrieben werden.

------------------------------------------------------------------------

# 🗄️ Datenbank und Alembic

Die Anwendung verwendet PostgreSQL im Docker-Container.

Standardkonfiguration:

``` text
Host: db
Port: 5432
Datenbank: dnd
```

Die eigentlichen Daten werden persistent in einem Docker-Volume
gespeichert.

``` text
pgdata
```

Die Datenbankstruktur wird ausschließlich über **Alembic-Migrationen**
versioniert. Dadurch können bestehende Installationen bei neuen
Versionen kontrolliert von einem Datenbankschema auf das nächste
aktualisiert werden.

Aktuelle Migration anzeigen:

``` bash
docker compose exec api alembic current
```

Verfügbare Historie anzeigen:

``` bash
docker compose exec api alembic history
```

Datenbank auf den aktuellen Stand bringen:

``` bash
docker compose exec api alembic upgrade head
```

------------------------------------------------------------------------

# 🧪 Entwicklung

## Logs anzeigen

Alle Container:

``` bash
docker compose logs -f
```

Nur das Backend:

``` bash
docker compose logs -f api
```

## Container neu bauen

``` bash
docker compose up --build -d
```

> ⚠️ `docker compose down -v` löscht auch Docker-Volumes und kann damit
> die PostgreSQL-Datenbank entfernen. Dieser Befehl sollte **nicht** für
> ein normales Rebuild oder Update verwendet werden.

## Neue Datenbankänderung entwickeln

Wenn sich ein SQLModel-Datenmodell ändert, wird dazu eine
Alembic-Migration erzeugt.

Beispiel:

``` bash
docker compose exec api alembic revision --autogenerate -m "Add enemy table"
```

Die erzeugte Datei befindet sich unter:

``` text
backend/alembic/versions/
```

Die automatisch erzeugte Migration sollte **vor dem Anwenden geprüft**
werden.

Danach:

``` bash
docker compose exec api alembic upgrade head
```

Und anschließend kontrollieren:

``` bash
docker compose exec api alembic current
```

Modelländerung und zugehörige Migration gehören gemeinsam in den
Git-Commit.

------------------------------------------------------------------------

# 📦 Projektstruktur (vereinfacht)

``` text
dnd-character-sheet/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── campaigns.py
│   │   │   ├── characters.py
│   │   │   ├── create_admin.py
│   │   │   ├── spells.py
│   │   │   └── users.py
│   │   ├── db.py
│   │   ├── deps.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── security.py
│   ├── alembic.ini
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── sheet.html
│   │   ├── skills.html
│   │   ├── actions.html
│   │   ├── spell.html
│   │   ├── inventory.html
│   │   ├── charakter.html
│   │   ├── campaigns.html
│   │   ├── campaign.html
│   │   ├── admin.html
│   │   ├── player_rules.html
│   │   ├── rule_viewer.html
│   │   ├── styles.css
│   │   └── styles/
│   │       └── dm.css
│   ├── pdf/
│   ├── Dockerfile
│   └── nginx.conf
│
├── .env.example
├── .gitattributes
├── docker-compose.yml
├── update.sh
└── README.md
```

Die Struktur ist hier bewusst vereinfacht; im Frontend existieren
zusätzlich die zugehörigen JavaScript-Module und weitere Hilfsdateien.

------------------------------------------------------------------------

# 🔐 Sicherheit

-   `.env` niemals committen.
-   Für jede Installation einen eigenen starken `SECRET_KEY` verwenden.
-   Standard- oder temporäre Admin-Zugangsdaten ändern.
-   Dev-Seeds nicht im Produktivbetrieb aktivieren.
-   Datenbank-Volumes vor größeren Änderungen sichern.
-   Die Anwendung nicht ohne passende Absicherung unkontrolliert ins
    öffentliche Internet stellen.

------------------------------------------------------------------------

# 🧠 Technik

-   **Backend:** FastAPI
-   **ORM / Modelle:** SQLModel
-   **Datenbank:** PostgreSQL 16
-   **Migrationen:** Alembic
-   **Frontend:** HTML, CSS und Vanilla JavaScript (ES Modules)
-   **Authentifizierung:** JWT
-   **Deployment:** Docker Compose
-   **Webserver:** Nginx

------------------------------------------------------------------------

# 📌 Status

🚧 **Work in Progress**

Die Anwendung wird aktiv weiterentwickelt. Der aktuelle Schwerpunkt
liegt auf dem Ausbau des DM-Bereichs und der Kampagnenfunktionen.
Weitere Bereiche wie NPCs, Gegnerverwaltung und zusätzliche DM-Werkzeuge
sind geplant.
