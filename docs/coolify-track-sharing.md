# Coolify Deployment: Track Teilen Viewer

The Track Teilen feature uses two static deployments from the same GitHub repository.

## Editor service

- Domain: `trackdesigner.fpvooe.com`
- Recommended deployment: use `Dockerfile` so nginx can serve `dist/` and proxy `/api/shorten-track` to n8n.
- If using a static publish directory instead, configure an equivalent platform reverse proxy for `/api/shorten-track` or configure n8n CORS for `https://trackdesigner.fpvooe.com`.
- Required environment variable:
  - `VITE_VIEWER_DOMAIN=https://sharedtrack.fpvooe.com`
- Optional environment variable:
  - `VITE_TRACK_SHORTENER_ENDPOINT=/api/shorten-track`

This is the full FPV Track Designer editor. The **Track Teilen** button serializes the current track and creates a share URL that points to the viewer domain.
In local development, the editor calls `/api/shorten-track`; Vite proxies that same-origin request to the n8n webhook so localhost is not blocked by browser CORS preflight checks. In the Docker-based production editor, nginx proxies the same `/api/shorten-track` path to n8n so the browser never performs a cross-origin request. If you bypass the nginx proxy and call n8n directly, the webhook must return CORS headers for the deployed editor origin, for example `https://trackdesigner.fpvooe.com`.
The proxy targets n8n's production webhook path `/webhook/shorten-track`. Do not use `/webhook-test/shorten-track` for deployed traffic because n8n test webhooks only work while the workflow is in test execution mode.

## Viewer service

- Domain: `sharedtrack.fpvooe.com`
- Build command: `npm run build:viewer`
- Publish directory: `dist-viewer/`

If Nixpacks selects an unsupported Node patch version, deploy the viewer with `Dockerfile.viewer` instead. The viewer Dockerfile builds with the official `node:24-alpine` image, installs optional native dependencies on Linux, and serves `dist-viewer/` with nginx on port `80`.

This service serves the view-only build from `dist-viewer/index.html` at the domain root. It reads the encoded track data from the URL fragment:

```text
https://sharedtrack.fpvooe.com/#c.<compressed-compact-track>
```

New links use the compact `c.` format (`src/core/schemas/compactTrack.schema.ts`, about 200 characters for 11 gates). Older `z.` links and prefix-less base64url links still open. The fragment is decoded in the browser, so track data is not sent to the server as part of the HTTP request.

## Repository setup

Both Coolify services can point to the same GitHub repository and branch. Configure each service with its own build command and publish directory:

| Service | Domain | Build command | Publish directory |
| --- | --- | --- | --- |
| Editor | `trackdesigner.fpvooe.com` | `Dockerfile` | nginx on port `80` |
| Viewer | `sharedtrack.fpvooe.com` | `npm run build:viewer` | `dist-viewer/` |

For the Docker-based editor deployment, set Coolify to use `Dockerfile` and expose port `80` so `/api/shorten-track` is proxied by nginx. For the Docker-based viewer deployment, set Coolify to use `Dockerfile.viewer` and expose port `80` instead of configuring Nixpacks build/start commands.

## Verification

After deployment:

1. Open `https://trackdesigner.fpvooe.com/`.
2. Generate or load a track.
3. Click **Track Teilen**.
4. Copy the generated URL.
5. Open the URL and verify it uses `https://sharedtrack.fpvooe.com/#...` without a `/viewer.html` path.
6. Confirm the viewer renders the track without editor controls such as **Speichern**, **Galerie**, **Einstellungen**, gate handles, or delete actions.
