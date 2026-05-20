# BodyPilot App Store Launch

## Build

1. Confirm `.env` has production Supabase, USDA, and OAuth values.
2. Deploy the Supabase Edge Functions and store secrets server-side:

```sh
npx supabase functions deploy delete-account
npx supabase functions deploy openai-chat
npx supabase secrets set OPENAI_API_KEY=your-openai-key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do not put the OpenAI API key or service role key in `.env` with an `EXPO_PUBLIC_` prefix; public Expo values are bundled into the app.

3. Confirm the AI and account deletion Edge Functions work from the app before submitting the binary.
4. Confirm `app.json` has the final `ios.bundleIdentifier` and `expo.version`.
5. Log in to Expo and Apple:

```sh
npx eas login
npx eas build:configure
npm run build:ios
```

## Submit

After the production build is complete and an App Store Connect app exists for `com.dhairyagandhi.fitfusion`:

```sh
npm run submit:ios
```

EAS will prompt for the App Store Connect app, Apple ID, team, and credentials if they are not already configured.

Use `docs/APP_STORE_CONNECT_METADATA.md` for product-page copy, review notes, and privacy questionnaire answers.

## App Review Notes

BodyPilot is a fitness and nutrition tracking app. Users create an account, complete onboarding, and can log workouts, meals, progress measurements, recovery, and social challenges.

Features that use permissions:

- Camera: barcode scanning, food photo analysis, receipt/photo capture, progress photos.
- Photo Library: selecting progress photos and meal photos.
- Location: optional cardio session tracking for distance, pace, and route data.

The app does not sell user data and does not use third-party advertising tracking.

## Privacy Questionnaire

Data linked to the user:

- Contact info: email address for account authentication.
- Health and fitness: workouts, meals, calories/macros, measurements, recovery logs, goals, progress photos, and cardio route/session data when used.
- User content: profile details, social posts, comments, challenges, uploaded/selected photos.
- Identifiers: Supabase user ID.

Data not used for third-party tracking:

- No ad tracking.
- No data broker sharing.

## Pre-Submission Checks

```sh
npm run lint
npx expo-doctor
```

Manual smoke test on a physical iPhone:

- Sign up, onboarding, login, logout.
- Start and finish a workout.
- Log a food item, water, body weight, and measurement.
- Use camera/photo flows and deny permissions once to confirm graceful handling.
- Start and stop a cardio session with location permission.
- Export data from Settings.
