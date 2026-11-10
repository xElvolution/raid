# Preview deploy

One port serves the whole app: `proxy.mjs` routes `/v1/*` and `/health` (including websocket upgrades) to the API and everything else to Next.js.

Processes (each from its own folder, env from `.env`):
- resolver `node dist/server.js` (8788)
- api `node dist/main.js` (8787) and worker `node dist/worker.js`
- web `next start -p 3000`
- edge `PORT=8795 node proxy.mjs`

`api/scripts/seed.ts` seeds demo data for previews (refuses NODE_ENV=production). Seeded users, posts and Called-market trades are synthetic; Polymarket markets are real and live.

## Shared-host preview (pm2)
```
docker run -d --name called-preview-redis -p 127.0.0.1:4716:6379 redis:7-alpine
docker run -d --name called-preview-pg -p 127.0.0.1:4717:5432 -e POSTGRES_USER=called -e POSTGRES_DB=called -e POSTGRES_PASSWORD=... postgres:17-alpine
# build sdk, resolver, api, web; write ../.env (DATABASE_URL, REDIS_URL, JWT_SECRET, RESOLVER_TOKEN, RESOLVER_URL=http://127.0.0.1:4711)
pm2 start deploy/preview.config.cjs          # api 4710, resolver 4711, web 4712 (localhost), edge 4715
pm2 start cloudflared --name called-preview-tunnel -- tunnel --no-autoupdate --url http://127.0.0.1:4715
```
All processes and containers are prefixed `called-preview-` so nothing else on the host is touched.
