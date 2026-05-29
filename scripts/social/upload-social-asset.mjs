#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
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
    throw new Error(`Missing ${name}. Add it to .env.`);
  }
  return value;
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const filePath = path.resolve(process.cwd(), getArgValue('--file') ?? 'assets/social/bodypilot-launch-reel.mp4');
  const bucket = getArgValue('--bucket') ?? 'social';
  const objectPath = getArgValue('--path') ?? path.basename(filePath);
  const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const body = readFileSync(filePath);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, body, {
      cacheControl: '3600',
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  console.log(JSON.stringify({
    bucket,
    path: objectPath,
    publicUrl: data.publicUrl,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
