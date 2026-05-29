# BodyPilot Direct Social Automation

Direct automation is configured for these handles:

```text
Instagram: bodypilot.ai
TikTok: bodypilot.ai
```

This pipeline uses official platform APIs and token-based auth. Do not put passwords in chat, docs, source code, or committed environment files.

## Files

```text
scripts/social/publish.mjs
docs/social/examples/orbit-demo.post.json
.secrets/social.env.local
```

Create `.secrets/social.env.local` locally. It is ignored by git and lives outside Expo's root dotenv sweep.

```text
SOCIAL_BRAND_INSTAGRAM_HANDLE=bodypilot.ai
SOCIAL_BRAND_TIKTOK_HANDLE=bodypilot.ai
INSTAGRAM_API_HOST=graph.instagram.com
META_GRAPH_VERSION=v24.0
INSTAGRAM_USER_ID=your_instagram_professional_account_id
INSTAGRAM_ACCESS_TOKEN=your_instagram_oauth_access_token
TIKTOK_ACCESS_TOKEN=your_tiktok_oauth_access_token
```

## Instagram Setup

Required:

- Instagram `bodypilot.ai` must be a professional account.
- Meta developer app must have the needed Instagram publishing permissions.
- OAuth must authorize the BodyPilot account.
- `INSTAGRAM_USER_ID` must be the Instagram professional account ID.
- `INSTAGRAM_ACCESS_TOKEN` must be a valid Instagram User access token with content publishing permission.

Publishing flow:

```text
Create media container -> Publish media container
```

Instagram requires a public `mediaUrl`. Local files must be uploaded somewhere publicly reachable first.

For Instagram Login tokens, use:

```text
INSTAGRAM_API_HOST=graph.instagram.com
```

For the older Facebook Login/Page token flow, use:

```text
INSTAGRAM_API_HOST=graph.facebook.com
```

## TikTok Setup

Required:

- TikTok `bodypilot.ai` must authorize the developer app through OAuth.
- Token must include posting permission.
- For public direct posting, TikTok may require app audit/review.

Publishing flow:

```text
Query creator info -> Initialize direct post from public media URL
```

The script currently uses TikTok `PULL_FROM_URL`, so each video needs a public `mediaUrl`.

## Hosting Social Assets

The first generated video lives at:

```text
assets/social/bodypilot-launch-reel.mp4
```

Create the Supabase public storage bucket by applying:

```text
supabase/migrations/007_social_media_storage.sql
```

Then upload:

```bash
npm run social:upload-asset -- --file assets/social/bodypilot-launch-reel.mp4 --bucket social --path bodypilot-launch-reel.mp4
```

Use the returned `publicUrl` as the manifest `mediaUrl`.

## Dry Run

```bash
npm run social:dry-run -- --manifest docs/social/examples/orbit-demo.post.json
```

Dry run prints the requests without exposing authorization headers.

## Publish

Before publishing, set the post manifest status:

```json
"status": "Approved"
```

Then run:

```bash
npm run social:publish -- --manifest docs/social/examples/orbit-demo.post.json
```

The script refuses to publish anything that is not marked `Approved`.

## Post Manifest Shape

```json
{
  "id": "BP-001",
  "status": "Approved",
  "platforms": ["instagram", "tiktok"],
  "accounts": {
    "instagram": "bodypilot.ai",
    "tiktok": "bodypilot.ai"
  },
  "contentType": "reel",
  "mediaUrl": "https://example.com/bodypilot-demo.mp4",
  "caption": "Caption text",
  "instagram": {
    "shareToFeed": true
  },
  "tiktok": {
    "privacyLevel": "PUBLIC_TO_EVERYONE",
    "brandOrganicToggle": true,
    "isAigc": false
  }
}
```

## Safety Rules

- No raw passwords.
- No publishing unless `status` is `Approved`.
- No private user data in media.
- No unsupported health or transformation claims.
- Use public media URLs only for assets you own.
