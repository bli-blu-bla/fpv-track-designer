# PocketBase — Backend

**Domain:** The only backend: anonymous short links, optional accounts with track sync, collections (namespaces) with entries and labels. Schema, API rules, settings, routes and cron live here as code; nothing is configured by hand except superuser, SMTP, OAuth2 providers and namespace membership (dashboard).

**Pinned version:** PocketBase **0.40.5** (`Dockerfile`, `PB_VERSION` + SHA-256 per arch). The JSVM API (`pb_hooks`, `pb_migrations`) changed a lot since 0.23 — always read the docs and changelog of the pinned version. The binary writes exact typings to `pb_data/types.d.ts` on first start; use them as reference. JS SDK in the editor: `pocketbase` ^0.28 (matches server 0.40).

## STRUCTURE
```
pocketbase/
├── Dockerfile                       # alpine + checksum-verified release zip; copies migrations/hooks; PB_ORIGINS → --origins
├── pb_migrations/
│   ├── 1791590400_create_collections.js  # tracks, namespaces, entries, labels, shares (fields, rules, indexes)
│   └── 1791590401_configure_settings.js  # rate limits, trusted proxy header, daily backups
└── pb_hooks/
    ├── lib/validation.js            # shared coarse checks (require()d inside handlers)
    ├── shares.pb.js                 # POST /api/shares, GET /api/shares/{id}, cron cleanupExpiredShares
    └── records.pb.js                # onRecordValidate: tracks/entries data+name, labels entry↔namespace
```

## COLLECTIONS
| Collection | Access (API rules) | Notes |
|---|---|---|
| `users` (auth, built-in) | default: own record only | password auth on; OAuth2 providers configured in dashboard |
| `tracks` | owner only; create needs `@request.body.owner = @request.auth.id`; owner cannot change | unique `(owner, clientId)`; `clientId` = local track id; `data` = export format 2.x; `thumbnail` jpeg ≤ 200 kB |
| `namespaces` | list/view public; write superuser only | unique `slug` (`^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$`); `members` → users |
| `entries` | read public; write `namespace.members.id ?= @request.auth.id`; namespace and `createdBy` immutable | cascade-deleted with namespace |
| `labels` | read public; write members; namespace immutable | unique `(namespace, name)`; `entry` cascade; moving = update `entry` |
| `shares` | all standard actions locked (superuser) | id `^[a-z0-9]{8}$`; unique `hash` (SHA-256 of payload); only via custom routes |

Patterns mirrored in the frontend: `NAMESPACE_SLUG_PATTERN`, `LABEL_NAME_PATTERN`, `RECORD_ID_PATTERN` (`src/core/api/collections.ts`), `SHARE_ID_PATTERN` (`src/core/api/shares.ts`). Change both sides together.

## HOOKS
- `POST /api/shares` `{ payload }`: compact track JSON (`encodeCompactTrack()`), ≤ 16 kB, array with format version 1|2, ≤ 300 gates. Existing hash → touch `lastAccessedAt`, return same id (200); else create (201). Body limit 32 kB. Rate limit 30/h/IP (settings migration).
- `GET /api/shares/{id}` → `{ payload }`; touches `lastAccessedAt` at most once per 24 h.
- Cron `cleanupExpiredShares` `0 3 * * *`: deletes shares with `lastAccessedAt` older than 4 calendar months.
- Validation is coarse on purpose; readers validate fully with `parseTrackExport()` / `decodeCompactTrack()`.

## CONVENTIONS
- JSVM handlers run in isolated VMs: top-level helpers are not visible inside handlers. Put shared code in `pb_hooks/lib/*.js` and `require(`${__hooks}/lib/…`)` inside each handler. Files not ending in `.pb.js` are not loaded as hooks.
- Schema changes = new migration file (`<unix-ts>_<name>.js`) with `up` and `down`; never edit an applied migration. Alternative: change the schema in a local dashboard with `--automigrate` and commit the generated file after review.
- Rules: `null` locks an action to superusers, `""` makes it public.
- Do not add a second backend or a public track browser without a new decision.

## LOCAL DEVELOPMENT
```bash
docker compose up pocketbase                    # http://127.0.0.1:8090, dashboard /_/ (install link in the log)
# without Docker: download the pinned binary, then
./pocketbase serve --dir pb_data --hooksDir pocketbase/pb_hooks --migrationsDir pocketbase/pb_migrations
./pocketbase superuser upsert admin@example.com <password> --dir pb_data
```
`pb_data/` is git-ignored. Run a cron by hand: `POST /api/crons/cleanupExpiredShares` with a superuser token.

## TESTING
- No automated backend suite in CI (none exists). Verify rules and hooks against a local instance with `curl` (create/read/dedupe/429 for shares; member vs non-member writes; duplicate label → 400).
- Frontend tests mock `fetch` / the SDK modules; the API client shapes are covered in `src/core/api/*.test.ts`.
