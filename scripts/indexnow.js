#!/usr/bin/env node
/**
 * IndexNow 即时收录：把全站 URL 推送给 IndexNow（必应 / 有道等）。
 * 实际推送逻辑复用 push-urls.js（--indexnow 只推 IndexNow）。
 */
const { spawnSync } = require('child_process');
const path = require('path');

const res = spawnSync(
  process.execPath,
  [path.join(__dirname, 'push-urls.js'), '--indexnow'],
  { stdio: 'inherit' }
);

process.exit(res.status ?? 1);
