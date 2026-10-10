# Coolify Deployment: Editor, Viewer and PocketBase

The app runs as three services from the same GitHub repository and branch.

| Service | Domain (example) | Build | Port |
| --- | --- | --- | --- |
| Editor | `trackdesigner.fpvooe.com` | `Dockerfile` | `80` |
| Viewer | `sharedtrack.fpvooe.com` | `Dockerfile.viewer` | `80` |
| PocketBase | `pb.fpvooe.com` | `pocketbase/Dockerfile` (build context `pocketbase/`) | `8090` |

## Build-time environment (editor and viewer)

Vite inlines these at build time; `.env.production` holds the defaults.

- `VITE_API_URL=https://pb.fpvooe.com` — PocketBase origin used for short links, accounts and collections.
- `VITE_VIEWER_DOMAIN=https://sharedtrack.fpvooe.com` — editor only; base for every viewer link.

## Editor service

- Dockerfile: `Dockerfile` (nginx serves `dist/`, SPA fallback to `index.html`).
- The editor talks to PocketBase directly (CORS), there is no proxy in nginx.

**Track Teilen** always builds the inline link `https://sharedtrack.fpvooe.com/#c.<compressed-compact-track>`. In the background it posts the compact track to `POST /api/shares` and shows the short link `https://sharedtrack.fpvooe.com/s/<id>`. If PocketBase is unreachable or rate-limited, the dialog says so and the long link stays usable.

## Viewer service

- Dockerfile: `Dockerfile.viewer` (builds the single-file viewer with `npm run build:viewer`, serves it with `nginx.viewer.conf`).
- The nginx config has an SPA fallback (`try_files $uri /index.html`), so `/s/<id>` and `/t/<namespace>…` return the viewer. A plain static publish of `dist-viewer/` without that fallback only works for `#c.` links.

Viewer URLs:

```text
https://sharedtrack.fpvooe.com/#c.<compressed-compact-track>   inline, no server needed
https://sharedtrack.fpvooe.com/s/<id>                           short link
https://sharedtrack.fpvooe.com/t/fpv-linz                       collection overview
https://sharedtrack.fpvooe.com/t/fpv-linz:latest                entry behind a label
https://sharedtrack.fpvooe.com/t/fpv-linz@<entryId>             one entry
```

`#c.` links never reach a server; older `z.` and prefix-less base64url links still open.

## PocketBase service

- Build context `pocketbase/`, Dockerfile `pocketbase/Dockerfile`. The image pins the PocketBase version, verifies the release checksum and copies `pb_migrations/` and `pb_hooks/`.
- **Persistent volume** at `/pb/pb_data` (SQLite database, uploaded thumbnails, backups). Without it every deploy starts empty.
- Port `8090`, own domain (e.g. `pb.fpvooe.com`).
- Environment variable `PB_ORIGINS=https://trackdesigner.fpvooe.com,https://sharedtrack.fpvooe.com` restricts CORS to editor and viewer. Empty allows every origin (local development only).
- Migrations run automatically on start (`serve` applies pending migrations).

After the first deploy:

1. Open `https://pb.fpvooe.com/_/` and create the superuser (the install link is printed in the container log).
2. **Settings → Mail settings**: configure SMTP so password resets and verification mails work.
3. Optional: **Collections → users → Options → OAuth2** to enable Google, Discord, … The editor shows only providers the server reports.
4. Check **Settings → Backups**: the migration enables daily backups at 02:00 (14 kept). Configure S3 there if backups should leave the server.

Settings applied by migration (`pocketbase/pb_migrations/1791590401_configure_settings.js`):

- Rate limiting on, incl. `POST /api/shares` at 30 requests per hour per IP.
- Client IP from the rightmost `X-Forwarded-For` value (set by Coolify's Traefik). PocketBase must only be reachable through the proxy, otherwise clients could fake their IP.
- Daily backups.

Short links are deleted by a daily cron job (03:00) once they have not been opened for 4 months.

## Old `go.fpvooe.com` links

Short links created before the switch point to the n8n workflow `shorten-track`. The app no longer calls n8n, but those links only keep working as long as n8n and its redirect stay online. Decide what happens to them before turning n8n off.

## Local development

```bash
docker compose up pocketbase   # PocketBase on http://127.0.0.1:8090 (dashboard: /_/)
npm run dev                    # editor; .env.development points VITE_API_URL at the local instance
```

To try viewer routes locally: `npx vite build --config vite.config.viewer.ts --mode development && npm run preview:viewer`, then open `http://localhost:4174/s/<id>`.

## Verification

After deployment:

1. Open `https://trackdesigner.fpvooe.com/`, generate or load a track, click **Track Teilen**.
2. The dialog shows the long `#c.` link and, after a moment, a `https://sharedtrack.fpvooe.com/s/<id>` short link.
3. Open both links; the viewer renders the track without editor controls (save, gallery, gate handles, delete).
4. `curl https://pb.fpvooe.com/api/collections/shares/records` returns 403 (short links cannot be listed).
