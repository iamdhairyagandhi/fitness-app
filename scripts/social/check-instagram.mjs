#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (process.env[key]) continue;

    const rawValue = valueParts.join('=').trim();
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .secrets/social.env.local.`);
  }
  return value;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.secrets/social.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const graphVersion = process.env.META_GRAPH_VERSION || 'v24.0';
  const apiHost = process.env.INSTAGRAM_API_HOST || 'graph.instagram.com';
  const igUserId = requireEnv('INSTAGRAM_USER_ID');
  const accessToken = requireEnv('INSTAGRAM_ACCESS_TOKEN');
  const fields = 'id,username,name,account_type,media_count';
  const url = new URL(`https://${apiHost}/${graphVersion}/${igUserId}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Instagram check failed (${response.status}): ${JSON.stringify(data)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    account: data,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
