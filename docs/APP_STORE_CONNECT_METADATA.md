# BodyPilot App Store Connect Metadata

## App Info

- Name: BodyPilot
- App Store Connect app name: BodyPilot: AI Fitness
- App Store Connect app ID: 6770682935
- Bundle ID: com.dhairyagandhi.fitfusion
- Subtitle: Workout & Nutrition Tracker
- Category: Health & Fitness
- Content rights: BodyPilot owns or has rights to the app content.
- Age rating notes: Fitness, nutrition, social challenges, user-generated posts/comments, no gambling, no unrestricted web access.

## Product Page Copy

### Promotional Text

Track workouts, nutrition, progress, recovery, and goals with AI-powered coaching tools.

### Description

BodyPilot helps you train smarter, eat better, and understand your progress in one fitness companion.

Plan and log workouts, track sets and personal records, monitor nutrition and macros, record body measurements, follow recovery trends, and use AI tools for meal ideas, food scanning, meal plans, weekly insights, and coaching support.

Key features:
- Workout tracking with exercises, volume, personal records, warmups, cardio, and strength standards
- Nutrition logging with macros, water, food search, barcode scanning, meal planning, recipes, and grocery lists
- AI food scanning, receipt/menu parsing, natural language food logging, meal plans, and coaching chat
- Progress tracking for weight, measurements, body composition, photos, goals, and analytics
- Recovery tools for sleep, energy, soreness, supplements, fasting, and weekly reports
- Social features with profiles, activity, challenges, comments, and leaderboards

BodyPilot does not sell user data and does not use third-party advertising tracking.

### Keywords

fitness,workout,nutrition,calorie,macros,meal,tracker,gym,progress,AI coach

## Required URLs

- Privacy Policy URL: https://iamdhairyagandhi.github.io/fitness-app/privacy/
- Support URL: https://iamdhairyagandhi.github.io/fitness-app/help/
- Privacy Choices URL: https://iamdhairyagandhi.github.io/fitness-app/feedback/
- Marketing URL: optional.

## Review Notes

BodyPilot is a fitness and nutrition tracking app. Users create an account, complete onboarding, and can log workouts, meals, progress measurements, recovery data, and social challenges.

Backend services are required for authentication, syncing, AI features, and account deletion. The Supabase Edge Functions `openai-chat` and `delete-account` must be deployed and reachable during review.

Permissions:
- Camera: barcode scanning, food photo analysis, receipt/menu capture, and progress photos.
- Photo Library: selecting progress photos and meal images.
- Location: optional cardio session tracking for distance, pace, and route data.

Account deletion is available in Profile > Account Settings > Delete Account.

Demo account:
- Email: app-review@bodypilot.app
- Password: FitFusionReview2026!

App Review contact:
- Name: Dhairya Gandhi
- Email: dhairya5402@gmail.com
- Phone: +1 240 726 3426

## App Privacy Questionnaire

Data linked to the user:
- Contact info: email address and optional phone number.
- Health and fitness: workouts, meals, calories/macros, water, measurements, weight, goals, recovery logs, supplements, progress photos, and cardio route/session data when used.
- User content: profile details, social posts, comments, challenges, uploaded or selected photos.
- Identifiers: Supabase user ID.
- Diagnostics: disclose only if you add crash or analytics tooling before release.

Data use:
- App functionality
- Personalization
- Analytics, only if you add analytics tooling before release

Tracking:
- No third-party advertising tracking.
- No data broker sharing.
