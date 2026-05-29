#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_META_GRAPH_VERSION = 'v24.0';
const DEFAULT_INSTAGRAM_API_HOST = 'graph.instagram.com';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com';

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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function redactHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase() === 'authorization' ? 'Bearer ***' : value,
    ]),
  );
}

function redactBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;

  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      key.toLowerCase().includes('token') ? '***' : value,
    ]),
  );
}

function printDryRun(label, request) {
  const parsedBody = request.body instanceof URLSearchParams
    ? Object.fromEntries(request.body.entries())
    : request.body;
  const body = typeof parsedBody === 'string' ? parsedBody : redactBody(parsedBody);

  console.log(`\n[DRY RUN] ${label}`);
  console.log(JSON.stringify({
    ...request,
    headers: request.headers ? redactHeaders(request.headers) : undefined,
    body,
  }, null, 2));
}

async function apiRequest(label, request, dryRun) {
  if (dryRun) {
    printDryRun(label, request);
    return { dryRun: true };
  }

  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .secrets/social.env.local or your shell environment.`);
  }
  return value;
}

function envForRequest(name, dryRun, placeholder = `dry_run_${name.toLowerCase()}`) {
  if (dryRun) return process.env[name] || placeholder;
  return requireEnv(name);
}

function ensureApproved(manifest, dryRun) {
  if (dryRun) return;
  if (manifest.status !== 'Approved') {
    throw new Error('Refusing to publish. Set manifest.status to "Approved" after review.');
  }
}

function buildInstagramCreateParams(manifest, dryRun) {
  const instagram = manifest.instagram ?? {};
  const caption = instagram.caption ?? manifest.caption;
  const contentType = instagram.contentType ?? manifest.contentType;
  const mediaUrl = instagram.mediaUrl ?? manifest.mediaUrl;

  if (!mediaUrl) {
    throw new Error('Instagram publishing requires a public mediaUrl.');
  }

  const params = new URLSearchParams();
  params.set('caption', caption ?? '');
  params.set('access_token', envForRequest('INSTAGRAM_ACCESS_TOKEN', dryRun));

  if (contentType === 'reel' || contentType === 'video') {
    params.set('media_type', 'REELS');
    params.set('video_url', mediaUrl);
    if (instagram.shareToFeed !== false) params.set('share_to_feed', 'true');
  } else {
    params.set('image_url', mediaUrl);
  }

  return params;
}

async function publishInstagram(manifest, dryRun) {
  const graphVersion = process.env.META_GRAPH_VERSION || DEFAULT_META_GRAPH_VERSION;
  const apiHost = process.env.INSTAGRAM_API_HOST || DEFAULT_INSTAGRAM_API_HOST;
  const igUserId = envForRequest('INSTAGRAM_USER_ID', dryRun);
  const createParams = buildInstagramCreateParams(manifest, dryRun);
  const createUrl = `https://${apiHost}/${graphVersion}/${igUserId}/media`;

  const createResponse = await apiRequest('Instagram create media container', {
    method: 'POST',
    url: createUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createParams,
  }, dryRun);

  const creationId = createResponse.id ?? manifest.instagram?.creationId;
  if (!creationId && !dryRun) {
    throw new Error(`Instagram did not return a creation container id: ${JSON.stringify(createResponse)}`);
  }

  if (!dryRun && (manifest.contentType === 'reel' || manifest.contentType === 'video')) {
    const statusUrl = new URL(`https://${apiHost}/${graphVersion}/${creationId}`);
    statusUrl.searchParams.set('fields', 'status_code,status');
    statusUrl.searchParams.set('access_token', envForRequest('INSTAGRAM_ACCESS_TOKEN', dryRun));

    let lastStatus = null;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const statusResponse = await apiRequest(`Instagram media container status attempt ${attempt}`, {
        method: 'GET',
        url: statusUrl.toString(),
      }, dryRun);
      lastStatus = statusResponse;

      if (statusResponse.status_code === 'FINISHED') break;
      if (statusResponse.status_code === 'ERROR' || statusResponse.status_code === 'EXPIRED') {
        throw new Error(`Instagram media container failed: ${JSON.stringify(statusResponse)}`);
      }

      await sleep(5000);
    }

    if (lastStatus?.status_code !== 'FINISHED') {
      throw new Error(`Instagram media container was not ready to publish: ${JSON.stringify(lastStatus)}`);
    }
  }

  const publishParams = new URLSearchParams();
  publishParams.set('creation_id', creationId ?? 'dry_run_creation_id');
  publishParams.set('access_token', envForRequest('INSTAGRAM_ACCESS_TOKEN', dryRun));

  return apiRequest('Instagram publish media container', {
    method: 'POST',
    url: `https://${apiHost}/${graphVersion}/${igUserId}/media_publish`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams,
  }, dryRun);
}

async function queryTikTokCreatorInfo(dryRun) {
  return apiRequest('TikTok query creator info', {
    method: 'POST',
    url: `${TIKTOK_API_BASE}/v2/post/publish/creator_info/query/`,
    headers: {
      Authorization: `Bearer ${envForRequest('TIKTOK_ACCESS_TOKEN', dryRun)}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({}),
  }, dryRun);
}

function chooseTikTokPrivacy(manifest, creatorInfo) {
  const requested = manifest.tiktok?.privacyLevel;
  if (requested) return requested;

  const options = creatorInfo?.data?.privacy_level_options;
  if (Array.isArray(options)) {
    return options.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : options[0];
  }

  return 'PUBLIC_TO_EVERYONE';
}

async function publishTikTok(manifest, dryRun) {
  const tiktok = manifest.tiktok ?? {};
  const caption = tiktok.caption ?? manifest.caption;
  const mediaUrl = tiktok.mediaUrl ?? manifest.mediaUrl;
  const contentType = tiktok.contentType ?? manifest.contentType;

  if (contentType !== 'video' && contentType !== 'reel') {
    throw new Error('TikTok direct automation currently expects video/reel content.');
  }

  if (!mediaUrl) {
    throw new Error('TikTok PULL_FROM_URL publishing requires a public mediaUrl.');
  }

  const creatorInfo = await queryTikTokCreatorInfo(dryRun);
  const privacyLevel = chooseTikTokPrivacy(manifest, creatorInfo);

  return apiRequest('TikTok initialize direct post', {
    method: 'POST',
    url: `${TIKTOK_API_BASE}/v2/post/publish/video/init/`,
    headers: {
      Authorization: `Bearer ${envForRequest('TIKTOK_ACCESS_TOKEN', dryRun)}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: caption ?? '',
        privacy_level: privacyLevel,
        disable_duet: Boolean(tiktok.disableDuet),
        disable_comment: Boolean(tiktok.disableComment),
        disable_stitch: Boolean(tiktok.disableStitch),
        brand_organic_toggle: tiktok.brandOrganicToggle ?? true,
        is_aigc: Boolean(tiktok.isAigc),
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: mediaUrl,
      },
    }),
  }, dryRun);
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.secrets/social.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const manifestPath = getArgValue('--manifest') ?? process.argv.find((arg) => arg.endsWith('.json'));
  if (!manifestPath) {
    throw new Error('Usage: npm run social:dry-run -- --manifest docs/social/examples/orbit-demo.post.json');
  }

  const dryRun = hasFlag('--dry-run') || process.env.SOCIAL_DRY_RUN !== '0';
  const manifest = readJson(path.resolve(process.cwd(), manifestPath));
  ensureApproved(manifest, dryRun);

  const platforms = manifest.platforms ?? [];
  if (!platforms.length) {
    throw new Error('Manifest must include platforms, for example ["instagram", "tiktok"].');
  }

  console.log(`Preparing ${dryRun ? 'dry run' : 'publish'} for ${manifest.id ?? manifestPath}`);
  console.log(`Instagram: ${manifest.accounts?.instagram ?? process.env.SOCIAL_BRAND_INSTAGRAM_HANDLE ?? 'unknown'}`);
  console.log(`TikTok: ${manifest.accounts?.tiktok ?? process.env.SOCIAL_BRAND_TIKTOK_HANDLE ?? 'unknown'}`);

  const results = {};
  if (platforms.includes('instagram')) {
    results.instagram = await publishInstagram(manifest, dryRun);
  }

  if (platforms.includes('tiktok')) {
    results.tiktok = await publishTikTok(manifest, dryRun);
  }

  console.log('\nResult');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(`\nSocial publish failed: ${error.message}`);
  process.exit(1);
});
