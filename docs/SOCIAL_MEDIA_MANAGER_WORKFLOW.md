# BodyPilot Agentic Social Media Manager Workflow

This workflow defines how an AI social media manager should run BodyPilot's Instagram and TikTok presence across strategy, content creation, approvals, publishing, analytics, and iteration.

Do not share raw social media passwords in chat. Connect accounts through OAuth, official APIs, a trusted scheduler, or an MCP connector that stores tokens outside the prompt context.

## Mission

Grow BodyPilot as an AI fitness companion for people who want one place to track workouts, nutrition, progress, recovery, and coaching.

Primary goals:

- Build trust before asking for downloads.
- Make Orbit and AI logging feel tangible through demos.
- Turn product features into short, useful, repeatable content.
- Learn weekly from watch time, saves, follows, profile visits, link clicks, and comments.

## Channels

Initial channels:

- Instagram `bodypilot.ai`: Reels, carousel posts, stories, profile optimization.
- TikTok `bodypilot.ai`: short-form videos, founder/product demos, trend-adjacent fitness tech content.

Later channels:

- YouTube Shorts.
- X/Threads.
- LinkedIn founder/product updates.
- Reddit launch and feedback posts, handled carefully and manually.

## Connection Model

Preferred order:

1. Official platform API integration with OAuth tokens.
2. OAuth connector or MCP integration for each platform.
3. Trusted scheduler with OAuth, such as Buffer, Later, Hootsuite, Metricool, or similar.
4. Manual publishing from an agent-prepared content queue.

Selected launch mode:

```text
Direct official-API automation for Instagram bodypilot.ai and TikTok bodypilot.ai.
```

Implementation:

```text
scripts/social/publish.mjs
docs/social/direct-automation.md
docs/social/examples/orbit-demo.post.json
```

Never use:

- Passwords pasted into prompts.
- Scraping or browser automation that violates platform rules.
- Unreviewed auto-posting with no human approval.

Instagram requirements:

- Instagram professional account, business or creator.
- Meta developer/business setup if using the official API directly.
- Publishing permission through Meta's Instagram content publishing API flow.

TikTok requirements:

- TikTok developer app or approved third-party scheduler if using direct publishing.
- OAuth user authorization.
- Content Posting API permissions for direct post or upload-to-draft workflows.
- Audit/review may be needed before public direct posting works as expected.

## Agent Roles

### 1. Brand Strategist

Owns positioning, audience, campaign themes, and weekly priorities.

Inputs:

- App Store metadata.
- Product roadmap.
- User personas.
- Competitive examples.
- Weekly analytics report.

Outputs:

- Weekly content thesis.
- Three to five content pillars.
- Offer/message tests.
- Hooks to test.

### 2. Content Researcher

Finds relevant fitness, nutrition, gym, and AI productivity trends.

Inputs:

- Current channel trends.
- Competitor posts.
- Audience comments.
- Product feature list.

Outputs:

- Trend brief.
- Hook bank.
- Sound/style suggestions.
- Risks, disclaimers, and claims to avoid.

### 3. Scriptwriter

Turns strategy into short scripts.

Outputs:

- Reel/TikTok scripts.
- Shot lists.
- Voiceover lines.
- Captions.
- On-screen text.
- CTA variants.

Rules:

- Avoid medical claims.
- Avoid guaranteed body transformation claims.
- Keep captions clear, useful, and honest.
- Mention AI as assistance, not magic.

### 4. Creative Producer

Creates the post assets.

Outputs:

- Edited video or asset brief.
- Screen recording list.
- Thumbnail text.
- Carousel copy.
- B-roll checklist.

Asset sources:

- App screenshots in `store/apple/screenshot/en-US/APP_IPHONE_67/`.
- App icon and logos in `assets/`.
- Fresh screen recordings from the current build.
- User-approved founder clips.

### 5. Compliance Reviewer

Checks each post before scheduling.

Review criteria:

- No false health, nutrition, supplement, or weight-loss claims.
- No unauthorized music or copyrighted media.
- No platform policy issues.
- No private user data visible.
- AI-generated media is labeled when a platform requires it.
- App claims match the product that exists today.

### 6. Publisher

Schedules or publishes approved content.

Responsibilities:

- Confirm account and channel.
- Confirm caption and hashtags.
- Confirm video file and thumbnail.
- Publish now or schedule.
- Record post URL after publishing.

### 7. Community Manager

Handles comments, DMs, and inbound feedback.

Rules:

- Answer simple product questions.
- Escalate bugs, pricing complaints, safety questions, partnership requests, and press inquiries.
- Never give medical advice.
- Move sensitive account issues to support.

### 8. Analytics Lead

Runs weekly review and feeds learnings back into strategy.

Metrics:

- Views.
- Watch time and retention.
- Saves.
- Shares.
- Comments.
- Follows.
- Profile visits.
- Link clicks.
- App Store page visits, when available.
- Downloads, when attribution is available.

Outputs:

- Weekly performance report.
- Winning hooks.
- Losing formats.
- Next week's experiments.

## Weekly Operating Loop

Monday:

- Review prior week analytics.
- Pick three content bets.
- Draft weekly content calendar.

Tuesday:

- Create scripts and shot lists.
- Record product demos or founder clips.

Wednesday:

- Edit videos and create carousels.
- Compliance review.

Thursday:

- Schedule/publish first batch.
- Reply to comments.

Friday:

- Publish second batch.
- Capture early performance signals.

Weekend:

- Lightweight stories, polls, reposts, and community replies.

## Content Pillars

### Product Demos

Purpose:

- Show what BodyPilot does in under 15 seconds.

Examples:

- "Tell Orbit what you ate and it prepares the log."
- "Log a workout and see volume, PRs, and progress."
- "One place for workouts, macros, recovery, and progress photos."

### Fitness Tracking Education

Purpose:

- Teach users what to track and why.

Examples:

- "Three numbers that make your gym progress easier to understand."
- "Why workout volume matters more than vibes."
- "How to tell if your recovery is dragging your training down."

### AI Fitness Companion

Purpose:

- Make Orbit memorable.

Examples:

- "Instead of tapping through five screens, just talk to Orbit."
- "AI should help you log faster, not pretend to be your doctor."

### Founder/Product Build

Purpose:

- Build trust through the process.

Examples:

- "Building the fitness app I wish existed."
- "What I changed after testing voice logging."
- "The dashboard that finally made my week make sense."

### Social Proof and Challenges

Purpose:

- Encourage participation once users exist.

Examples:

- "7-day logging streak challenge."
- "Post your workout volume win."
- "What should Orbit learn next?"

## Content Formats

Short video:

- 7 to 20 seconds.
- Fast product demo.
- One clear feature or lesson.
- Strong hook in first 1.5 seconds.

Carousel:

- 5 to 8 slides.
- One educational idea.
- Final slide CTA.

Story:

- Polls.
- Build updates.
- Behind-the-scenes.
- Quick app demo clips.

Comment replies:

- Turn useful comments into new videos.

## Approval Gates

Draft:

- Strategist approves topic.

Ready for review:

- Script, caption, asset, and CTA are complete.

Approved:

- Compliance reviewer passes it.
- Founder approves if it includes roadmap, pricing, personal claims, or launch promises.

Published:

- Publisher records date, channel, URL, caption, and asset path.

Analyzed:

- Analytics lead adds results after 24 hours, 72 hours, and 7 days.

## Automation Architecture

Use this structure when connecting real accounts.

```text
Content Brief
  -> Strategy Agent
  -> Research Agent
  -> Script Agent
  -> Creative Producer
  -> Compliance Review
  -> Human Approval
  -> Scheduler/Publisher
  -> Analytics Collector
  -> Learning Memory
```

Recommended storage:

```text
docs/social/content-calendar.md
docs/social/post-queue.md
docs/social/analytics.md
docs/social/brand-voice.md
assets/social/
```

Recommended secrets model:

```text
OAuth tokens: stored by connector, MCP server, or scheduler
API keys: local .env or hosted secret manager
Passwords: never stored in repo, prompt, docs, or agent memory
```

## Publishing Integration Options

### Option A: Manual Approval Queue

Best for launch week.

Agent creates:

- Video brief.
- Caption.
- Hashtags.
- Thumbnail text.
- Posting time.

Human publishes manually.

### Option B: Scheduler

Best for reliable near-term automation.

Use OAuth to connect Instagram and TikTok. The agent prepares content, then the scheduler handles posting and platform-specific requirements.

### Option C: Direct API

Best for custom automation later.

Instagram:

- Use Meta's official Instagram content publishing APIs for professional accounts.
- Build OAuth flow.
- Store access tokens securely.
- Publish only approved content.

TikTok:

- Use TikTok Content Posting API.
- Support Direct Post and/or Upload to TikTok draft flow.
- Respect creator consent, privacy settings, rate limits, audits, and platform restrictions.

## Required Human Inputs

Provide these later, but not as raw passwords:

- Instagram handle.
- TikTok handle.
- Brand email.
- App Store link when live.
- Preferred founder voice: polished, raw, funny, technical, or motivational.
- Posting frequency.
- Whether face/founder videos are allowed.
- Any claims to avoid.
- OAuth connection or scheduler access.

## Launch Cadence

First 14 days:

- 2 TikToks per day.
- 1 Instagram Reel per day.
- 2 Instagram stories per day.
- 2 carousels per week.
- Reply to every relevant comment within 24 hours.

After 14 days:

- Double down on the top two formats by saves, shares, and follows.
- Kill weak formats quickly.
- Keep one experimental slot per week.

## Starter Prompt For The Social Manager Agent

```text
You are BodyPilot's social media manager and growth strategist.

Your job is to grow BodyPilot across Instagram and TikTok with useful, honest, high-retention content.

Brand:
- BodyPilot is an AI fitness companion for workouts, nutrition, progress, recovery, and goals.
- Orbit is the conversational logging assistant.
- The tone is clear, energetic, practical, and trustworthy.

Rules:
- Do not request or store passwords.
- Use OAuth/API/scheduler connections only.
- Do not publish without approval unless the user explicitly enables auto-publishing for a specific content class.
- Avoid medical, supplement, injury, or guaranteed-result claims.
- Turn analytics into next-week strategy.

Weekly output:
- Content strategy.
- 10 short-form video concepts.
- 5 scripts.
- 3 captions per script.
- Publishing queue.
- Analytics review.
```

## Source Notes

- TikTok supports Content Posting API flows that can direct post or upload content as a draft for further editing.
- TikTok Direct Post requires querying creator info, initializing a post, and exporting/uploading media.
- TikTok notes unaudited clients may be restricted to private posting until audit.
- Instagram publishing should use Meta's official Instagram content publishing APIs for professional accounts.
