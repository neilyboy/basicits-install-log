# Basic ITS Install Log

A mobile-first PWA for documenting security system installations. Built for Basic ITS technicians working on Verkada hardware deployments.

## Features

- **Job Management** — Create, track, and archive installation jobs
- **Device Logging** — Log cameras, access control, sensors, intercoms with photos and notes
- **Photo Documentation** — Capture photos from your phone camera (saved to camera roll), view in full-res lightbox
- **Verkada Hardware Catalog** — Pre-loaded with Verkada product lineup, admin-extensible
- **Offline Mode** — PWA works offline; data syncs when connection restores
- **Export** — Generate a portable ZIP with a self-contained HTML report + raw JSON + full-res images
- **Import** — Re-import archived job ZIPs back into the system
- **Admin Panel** — PIN-protected (default: `1234`), manage hardware models and change PIN
- **Two-user Friendly** — Both techs can use simultaneously from the same server

## Quick Start

```bash
# Clone / enter project directory
cp .env.example .env
# Edit .env to set your ADMIN_PIN and APP_PORT if needed
docker compose up -d --build
```

Access at `http://your-server-ip:3000`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_PORT` | `3000` | Host port to expose the app on |
| `ADMIN_PIN` | `1234` | Admin panel PIN (change immediately) |

## Data Persistence

All data (SQLite database + uploaded photos) is stored in a Docker named volume `app-data`. To back up:

```bash
docker run --rm -v basicits-install-log_app-data:/data -v $(pwd):/backup alpine tar czf /backup/basicits-backup.tar.gz /data
```

## Exporting a Job

1. Mark job as **Complete**
2. Tap **Export Report (ZIP)**
3. The ZIP contains:
   - `report.html` — Self-contained interactive viewer (open in any browser)
   - `data.json` — Raw structured data
   - `images/` — Full-resolution photos
   - `README.md` — Description

## Importing a Job

From the Jobs dashboard, tap **Import** and select a previously exported ZIP file.

## Admin PIN

Default PIN is `1234`. Change it immediately via **Admin → Change Admin PIN**.

The PIN can also be pre-set via the `ADMIN_PIN` environment variable in `.env`.
