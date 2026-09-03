# 🐉 DnD Character Sheet

Eine webbasierte Anwendung zur Verwaltung von DnD-Charakteren mit FastAPI-Backend, PostgreSQL-Datenbank und Frontend im Browser.

---

## ⚙️ Voraussetzungen

* Docker
* Docker Compose

---

## 🚀 Setup

### 1. Repository klonen

```bash
git clone <REPO_URL>
cd dnd-character-sheet
```

### 2. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

Dann in `.env` anpassen:

```env
SECRET_KEY=dein_langer_sicherer_key
```

(Optional weitere Werte anpassen)


### 3. Regelwerk-PDFs bereitstellen

Die von der Anwendung verwendeten Regelwerk-PDFs sind **nicht Bestandteil des Git-Repositories** und müssen separat bereitgestellt werden.

Kopiere die PDF-Dateien nach:

```text
frontend/pdf/
```

Beispiel:

```text
frontend/pdf/
├── races.pdf
├── classes.pdf
├── fight.pdf
├── gear.pdf
└── ...
```

Docker bindet diesen Ordner beim Start automatisch read-only in den Webserver ein. Die Dateien sind innerhalb der Anwendung anschließend unter folgendem Pfad verfügbar:

```text
/assets/pdf/<dateiname>.pdf
```

Die Dateien in `frontend/pdf/` werden von Git ignoriert und bleiben dadurch auch bei späteren Updates per `git pull` lokal erhalten.

---
## ▶️ Anwendung starten

```bash
docker compose up --build
```

---

## 🌐 Zugriff

* Frontend: http://localhost:8080
* API: http://localhost:8000

---

## 👑 Admin-User anlegen

Nach dem ersten Start existiert noch kein Benutzer.

Admin einmalig erstellen:

```bash
docker compose exec api python3 -m app.api.create_admin
```

Standard-Zugang (falls im Script so definiert):

```
Username: admin
Password: admin
```

👉 Danach unbedingt Passwort ändern.

---

## 🗄️ Datenbank

Die App nutzt PostgreSQL im Docker-Container.

* Host: `db`
* Port: `5432`
* DB: `dnd`

Daten werden in einem Docker-Volume gespeichert:

```
pgdata
```

---

## 🔐 Sicherheit

* `.env` **niemals committen**
* `SECRET_KEY` immer individuell setzen
* Default-Admin-Passwort nach Erstellung ändern
* Keine Dev-Seeds im Produktivbetrieb aktiv lassen

---

## 🧪 Entwicklung

Logs anzeigen:

```bash
docker compose logs -f
```

Container neu bauen:

```bash
docker compose down -v
docker compose up --build
```

---

## 📦 Projektstruktur (vereinfacht)

backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── characters.py
│   │   ├── create_admin.py
│   │   ├── health.py
│   │   └── users.py
│   ├── __init__.py
│   ├── db.py
│   ├── deps.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── security.py
├── env.example
├── gitignore
├── docker-compose.yml
└── README.md

frontend/
├── public/
│   ├── admin.html
│   ├── admin.js
│   ├── api.js
│   ├── app.js
│   ├── charakter.html
│   ├── charakter.js
│   ├── index.html
│   ├── index.js
│   ├── inventory.html
│   ├── inventory.js
│   ├── mapper.js
│   ├── nav_config.js
│   ├── nav.js
│   ├── notes.html
│   ├── notes.js
│   ├── overlay_i18n.js
│   ├── overlay.js
│   ├── sheet.html
│   ├── sheet.js
│   ├── spell.html
│   ├── spells.js
│   └── styles.css
├── Dockerfile
└── nginx.conf

## 🧠 Hinweise

* Backend: FastAPI + SQLModel
* Datenbank: PostgreSQL
* Deployment erfolgt vollständig über Docker

---

## 📌 Status

🚧 Work in Progress
Grundfunktionen laufen, weitere Features folgen.

---
## ⚙️ Konfiguration (.env)

Die Anwendung nutzt Umgebungsvariablen für Konfiguration und Sicherheit.

### 1. `.env` Datei erstellen

```bash
cp .env.example .env
```

### 2. Wichtige Werte anpassen

Öffne die `.env` und setze mindestens:

```env
SECRET_KEY=dein_langer_zufaelliger_key
```

Einen sicheren Key kannst du so generieren:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Erklärung der wichtigsten Variablen

| Variable                      | Beschreibung                                              |
| ----------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                | Verbindung zur PostgreSQL-Datenbank (Docker-Service `db`) |
| `SECRET_KEY`                  | Wird für Authentifizierung (JWT) verwendet                |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token-Laufzeit                                            |
| `BACKEND_CORS_ORIGINS`        | Erlaubte Frontend-URLs                                    |
| `DB_ECHO`                     | SQL-Debug-Logging                                         |

⚠️ **Wichtig:**
Die `.env` Datei darf **nicht ins Repository committed werden** (ist in `.gitignore` enthalten).

---

### 🧪 Beispiel für lokale Entwicklung

```env
DATABASE_URL=postgresql+psycopg://dnd:dnd@db:5432/dnd
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=http://localhost:8080
DB_ECHO=false
```
