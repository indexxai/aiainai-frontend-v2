# Hosting hand-off (frontend)

|        |                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Build  | `docker build -t aiainai-frontend --build-arg BACKEND_URL=<internal API URL> .` (or `pnpm build`, Next.js standalone)   |
| Start  | `node server.js` (standalone), port `PORT` (3000)                                                                       |
| Health | `GET /healthz` → 200 (this app only). `GET /api/health` checks the backend and database through the app.                |
| Env    | `BACKEND_URL`: where the NestJS API is reachable from this server (can be a private address). It is read at build time. |

- Serve on the main domain (e.g. `aiainai.ai`). The API does not need its own public domain: `/api/*` is forwarded.
- Stateless; run as many copies as needed. Static assets under `/_next/static` can be cached by a CDN for a long time.
- Preview deploys per pull request are useful for review; point them at the staging backend.
