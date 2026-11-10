import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { staticFile, target } from './proxy.mjs';

test('routes api, app and landing', () => {
  assert.equal(target('/v1/feed'), 'http://127.0.0.1:8787');
  assert.equal(target('/v1/live?token=x'), 'http://127.0.0.1:8787');
  assert.equal(target('/health'), 'http://127.0.0.1:8787');
  assert.equal(target('/app'), 'http://127.0.0.1:3000');
  assert.equal(target('/app/markets/1'), 'http://127.0.0.1:3000');
  assert.equal(target('/'), 'static');
  assert.equal(target('/apple'), 'static');
});

test('serves static files safely', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'landing-'));
  writeFileSync(path.join(d, 'index.html'), 'home');
  mkdirSync(path.join(d, 'about'));
  writeFileSync(path.join(d, 'about', 'index.html'), 'about');
  writeFileSync(path.join(d, 'faq.html'), 'faq');
  assert.equal(staticFile('/', d), path.join(d, 'index.html'));
  assert.equal(staticFile('/about', d), path.join(d, 'about', 'index.html'));
  assert.equal(staticFile('/faq?x=1', d), path.join(d, 'faq.html'));
  assert.equal(staticFile('/../../etc/passwd', d), null);
  assert.equal(staticFile('/missing', d), null);
});
