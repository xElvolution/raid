// pm2 process file for an isolated preview. Reads ../.env; ports are configurable so the
// preview never collides with other services on a shared host.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const P = { api: env.API_PORT ?? '4710', resolver: env.RESOLVER_PORT ?? '4711', web: env.WEB_PORT ?? '4712', edge: env.EDGE_PORT ?? '4715' };
const app = (name, cwd, script, args, extra = {}) => ({ name: `called-preview-${name}`, cwd: path.join(root, cwd), script, args, env: { ...env, NODE_ENV: 'production', ...extra }, max_memory_restart: '600M' });
module.exports = {
  apps: [
    app('resolver', 'resolver', 'dist/server.js', '', { PORT: P.resolver, HOST: '127.0.0.1' }),
    app('api', 'api', 'dist/main.js', '', { PORT: P.api, HOST: '127.0.0.1' }),
    app('worker', 'api', 'dist/worker.js', ''),
    app('web', 'web', 'node_modules/next/dist/bin/next', `start -p ${P.web} -H 127.0.0.1`, { APP_BASE_PATH: env.APP_BASE_PATH ?? '/app' }),
    app('edge', 'deploy', 'proxy.mjs', '', { PORT: P.edge, API_ORIGIN: `http://127.0.0.1:${P.api}`, WEB_ORIGIN: `http://127.0.0.1:${P.web}`, LANDING_DIR: path.join(root, 'landing', 'out') }),
  ],
};
