#!/usr/bin/env node
/**
 * 百度主动推送：把全站 URL 一次性推送给百度普通收录。
 * 实际推送逻辑复用 push-urls.js（--baidu 只推百度，--all 一次推全部）。
 * 百度每日配额有限，配额未恢复时会返回 over quota，属正常情况。
 */
const { spawnSync } = require('child_process');
const path = require('path');

const res = spawnSync(
  process.execPath,
  [path.join(__dirname, 'push-urls.js'), '--baidu', '--all'],
  { stdio: 'inherit' }
);

process.exit(res.status ?? 1);
