# BodyPilot iOS Widgets

This document explains the native iOS WidgetKit widgets shipped with
BodyPilot, what they show, and the exact steps to build and install them.

> **Important:** Widgets are native code. They will **not** show up in Expo
> Go. You must produce a dev/preview/production build (EAS or `expo run:ios`
> on a Mac) and install it on a real iPhone.

---

## What ships

A single widget extension target (`BodyPilotWidgets`) registers five
widgets:

| Kind                       | Families                              | Purpose                                                                 |
| -------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `DailyMacrosWidget`        | systemSmall, systemMedium             | Calories remaining ring + protein/water progress bars                   |
| `ActivityWidget`           | systemSmall, systemMedium             | Steps, active energy, today's workout / streak                          |
| `StreakWidget`             | systemSmall                           | Workout streak day count + level + last lift recency                    |
| `HydrationWidget`          | systemSmall                           | Water glasses tally; tapping opens the nutrition tab to log a glass     |
| `LockScreenStreakWidget`   | accessoryCircular, accessoryRectangular | Streak count on the Lock Screen / Always-On display                    |

Tap targets deep-link via the `bodypilot://` scheme into existing
Expo Router routes (`/`, `/nutrition`, `/achievements`).

## Architecture

```
React Native (JS)                              iOS (Swift)
─────────────────                              ───────────
lib/widgetSync.ts                              targets/widgets/
  ├─ buildSnapshot()  ← Zustand stores            ├─ index.swift           (@main WidgetBundle)
  ├─ debounced write                              ├─ Snapshot.swift        (Codable + App Group reader)
  ├─ AppState flush                               ├─ WidgetSupport.swift   (TimelineProvider, deep links)
  └─ logout clears                                ├─ DailyMacrosWidget.swift
        │                                         ├─ ActivityWidget.swift
        ▼                                         ├─ StreakWidget.swift
modules/widget-bridge (local Expo Module)         ├─ HydrationWidget.swift
  ├─ setSnapshot(suite, key, json)                └─ LockScreenStreakWidget.swift
  ├─ clearSnapshot(suite, key)                          ▲
  ├─ reloadAll()           ─────────────────────────────┘
  └─ reloadKind(kind)
        │
        ▼
UserDefaults(suiteName: "group.com.dhairyagandhi.fitfusion")
```

* JS subscribes to nutrition, workout, auth, and Apple Health stores.
* Changes are coalesced (`800ms` debounce) and only persisted when the
  payload actually changes — avoids hammering `UserDefaults` and the
  widget timeline reload budget.
* App background/foreground transitions flush immediately.
* Logout calls `clearWidgetSnapshot()` which writes a signed-out
  placeholder.
* The widget timeline asks the system to refresh every 30 minutes;
  immediate refreshes come from `WidgetCenter.shared.reloadAllTimelines()`.

### App Group

Both the host app and the widget extension share the App Group
`group.com.dhairyagandhi.fitfusion`. This is the **only** way a widget
process can read data written by the React Native app.

The shared payload is a single JSON string under
`bodypilot.widget.snapshot`. Keep it small: no full workout logs, food
diary entries, or auth tokens.

---

## One-time setup (Apple Developer + EAS)

Do this once, on your **Mac** work laptop.

### 1. Apple Developer Portal

1. Sign in at <https://developer.apple.com/account>.
2. **Identifiers → App Groups → +** and register
   `group.com.dhairyagandhi.fitfusion`.
3. **Identifiers → App IDs** — open `com.dhairyagandhi.fitfusion`:
   * Enable **App Groups** and add `group.com.dhairyagandhi.fitfusion`.
   * Save.
4. Create a new App ID for the widget extension:
   `com.dhairyagandhi.fitfusion.BodyPilotWidgets` (must match the bundle
   ID that `@bacons/apple-targets` generates, derived from the parent
   bundle ID plus the target folder name).
   * Enable **App Groups** and add the same group.
5. Regenerate any provisioning profiles affected.

### 2. `app.json`

Add your Apple Developer Team ID so EAS can sign the new widget target:

```jsonc
"ios": {
  "appleTeamId": "ABCDE12345",
  // …existing config…
}
```

(EAS will warn `Expo config is missing required ios.appleTeamId property`
until this is set.)

### 3. EAS signing

When you run `npm run build:ios`, EAS will prompt you to set up signing
for the new widget extension target. Allow it to manage credentials
automatically. The first build may fail until the App Group capability
has propagated to the regenerated provisioning profiles — re-run the
build if so.

---

## Local build / test on Mac

```bash
# 1. Install JS deps (already done if you cloned fresh)
npm install

# 2. Generate the iOS project from the Expo config
npx expo prebuild --platform ios --clean

# 3. Open in Xcode (recommended for first run, to verify the widget
#    target appears and App Group entitlement is checked)
open ios/*.xcworkspace

# 4. Or run directly on a real device
npx expo run:ios --device
```

After the app launches once and signs in, the widget snapshot is written
to the App Group. Long-press the home screen → **+** → search
"BodyPilot" → pick a widget. Lock Screen widgets: long-press the lock
screen → **Customize**.

> Widgets will show placeholder data until the host app has been
> launched at least once.

## EAS dev / preview / production build

```bash
# Internal preview that you can install via QR code
npx eas-cli build --platform ios --profile preview

# App Store / TestFlight production build
npm run build:ios
```

EAS reads the new entitlement and the `@bacons/apple-targets` plugin
automatically — no extra flags.

---

## What the widgets display

The JS `WidgetSnapshot` (see `lib/widgetSync.ts`) contains:

```ts
{
  schemaVersion: 1,
  signedIn: boolean,
  updatedAt: ISOString,
  localDate: "YYYY-MM-DD",
  displayName: string | null,
  caloriesConsumed, caloriesTarget,
  proteinG, proteinTargetG,
  waterMl, waterGoalMl,
  streakCount, level, xp,
  workoutsCompleted,
  lastWorkoutDate, lastWorkoutName, activeWorkoutName,
  steps, activeEnergyKcal,
  healthStatus, healthSyncedAt,
}
```

The Swift side decodes it via the matching `BodyPilotSnapshot` struct in
`targets/widgets/Snapshot.swift`. **Keep the two in lock-step** when you
add fields, and bump `schemaVersion` for any breaking changes.

### Apple Health freshness

Steps and active energy are only as fresh as the most recent foreground
sync (the host app reads HealthKit when the app becomes active). For
near-real-time step counts, a follow-up task would be to register a
HealthKit observer with background delivery and have it write a fresh
snapshot from the native side directly — that work is **not** included
in this change.

The Activity widget shows a small "Connect Apple Health" hint if the
user has not authorized HealthKit yet.

---

## Adding a new widget

1. Create `targets/widgets/MyWidget.swift` following the existing
   pattern (`StaticConfiguration(kind:provider:)` with `SnapshotProvider`).
2. Register it in `targets/widgets/index.swift` inside the
   `WidgetBundle`.
3. If you need new data fields, add them to **both**:
   * `WidgetSnapshot` in `lib/widgetSync.ts`
   * `BodyPilotSnapshot` in `targets/widgets/Snapshot.swift`
   * Increment `SCHEMA_VERSION` / `schemaVersion` if removing/renaming
     fields.
4. Run `npx expo prebuild --platform ios --clean` and rebuild.

## Troubleshooting

* **Widget shows placeholder forever:** the host app has not written the
  snapshot yet. Open the app once, sign in, then re-add the widget.
* **`Could not load widget data` in Xcode preview:** previews use
  `BodyPilotSnapshot.placeholder` — preview rendering does not have
  access to the App Group from the simulator without entitlements.
* **App Group is empty:** confirm both bundle IDs have the App Group
  capability in the Apple Developer Portal **and** that the
  provisioning profile was regenerated after enabling it.
* **Steps stuck at 0:** Apple Health authorization may not be granted,
  or no foreground sync has happened since you opened the app. Open the
  app, pull-to-refresh in the dashboard, then long-press the widget →
  Edit Widget to force a reload.
