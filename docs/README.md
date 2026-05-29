# BodyPilot GitHub Pages

This folder is the free static website for BodyPilot.

## Publish

1. Push this repo to GitHub.
2. Open `Settings` -> `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Set `Branch` to `main` and folder to `/docs`.
5. Save.

GitHub will publish the site at:

```text
https://iamdhairyagandhi.github.io/fitness-app/
```

The email confirmation landing page is:

```text
https://iamdhairyagandhi.github.io/fitness-app/confirm/
```

The ad/questionnaire landing page is:

```text
https://iamdhairyagandhi.github.io/fitness-app/questionnaire/
```

## Supabase Auth URLs

In Supabase, open `Authentication` -> `URL Configuration`.

Set `Site URL` to:

```text
https://iamdhairyagandhi.github.io/fitness-app/
```

Add these `Redirect URLs`:

```text
https://iamdhairyagandhi.github.io/fitness-app/confirm/
bodypilot://auth/callback
com.dhairyagandhi.fitfusion://auth/callback
```

The confirmation page forwards Supabase auth params to the installed app with:

```text
bodypilot://auth/callback
```

## Web Questionnaire Database

Run this migration before sending ad traffic to the questionnaire:

```text
supabase/migrations/008_onboarding_leads.sql
```

The public website can only insert questionnaire submissions. When a user signs into BodyPilot with the same email, the app calls `claim_latest_onboarding_lead()` and copies the latest matching answers into that user's profile.
