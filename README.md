# FinX

A local-only personal finance app for Android & iOS, built with Expo. All data
stays on your device — no account, no backend.

## Features

- **Wallets** with balances in a single app-wide currency (default BDT).
- **Income & expense** tracking that updates wallet balances atomically.
- **Lend / borrow** debts tied to people, optionally linked to a wallet, with
  repayment tracking.
- **Activity** view filterable by week / month / year / custom period.
- **PIN lock** (4-digit) with optional **biometric unlock** and biometric-based
  PIN recovery — recovery never wipes data.
- **Import / export** all data as a plain JSON backup (Android saves to a folder
  you pick; iOS uses the share sheet).
- Contacts & photo integration, Wise-inspired green theme, native tabs.

## Tech stack

- **Expo SDK 56** (expo-router, React 19, React Native 0.85)
- **Drizzle ORM** over `expo-sqlite` with generated migrations
- `expo-secure-store` + `expo-local-authentication` for PIN/biometric auth
- Amounts stored as integer minor units (cents) to avoid float drift

## Get started

1. Install dependencies

   ```bash
   bun install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   Open it in a development build, Android emulator, or iOS simulator.

## Database migrations

Schema lives in `src/db/schema.ts`. After changing it, regenerate migrations:

```bash
bun run db:generate
```

Migrations apply automatically at runtime via `useMigrations`.

## Build a release APK (Android)

```bash
cd android && ./gradlew assembleRelease
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Prebuilt APKs are attached to [GitHub Releases](https://github.com/shahriyardx/finx/releases).

## Project layout

```
src/
  app/        # expo-router routes: (auth), (tabs), modals, detail pages
  auth/       # PIN/biometric auth context + secure storage
  components/ # shared UI (pin pad, confirm dialog, empty state, ...)
  db/         # Drizzle schema, client, repo (mutations + backup)
  lib/        # backup, formatting, date-range, categories
  constants/  # theme (Wise-style green palette)
```
