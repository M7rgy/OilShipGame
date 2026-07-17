# Building Hormuz Escape for Android

The game is wrapped for Android with [Capacitor](https://capacitorjs.com/):
Capacitor puts the same web build (`dist-web/hormuz-escape/`) inside a native
Android app and provides the AdMob plugin for banner, interstitial, and
rewarded ads. The game code is unchanged — `src/ads/Ads.js` detects Capacitor
at runtime and uses real ads there, while staying a no-op on the web/desktop
builds.

## Prerequisites

- Node.js 18+ (already required for the game)
- **Android Studio** (includes the Android SDK, platform tools, and an
  emulator). A JDK 17 comes bundled with recent Android Studio.
- An Android device or emulator for testing.

## One-time setup

From the project root:

```bash
# 1. Install Capacitor + the AdMob plugin (added to package.json)
npm install

# 2. Build the web bundle Capacitor will wrap
npm run web

# 3. Create the native Android project (generates the android/ folder)
npx cap add android
```

If `@capacitor/*` packages are not yet in `package.json`, install them first:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/admob
```

### AdMob App ID

`capacitor.config.json` already carries the AdMob **test** App ID under
`plugins.AdMob.androidAppId`. Capacitor injects it into the manifest on sync.
When you go live, replace it with your real App ID (and see "Going live"
below). If you edit the manifest by hand instead, the entry looks like:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

## Everyday build loop

Whenever you change the game:

```bash
npm run web          # rebuild the web bundle into dist-web/hormuz-escape/
npx cap sync android # copy it + plugins into the android/ project
npx cap open android # open in Android Studio to run / build
```

Or run directly on a connected device/emulator:

```bash
npx cap run android
```

In Android Studio, **Build → Generate Signed Bundle / APK** produces the
`.aab` (for the Play Store) or `.apk` (for sideloading).

## Previewing ads without a device

You don't need Android to see where ads appear and how the "continue" flow
feels. Open the web build with `?ads` in the URL:

```
http://localhost:8080/?ads
```

This turns on a **simulated** ad mode — a placeholder bottom banner on the
menus, a full-screen "interstitial" between legs, and a "rewarded" overlay
when you choose *Watch ad* on the Ship Lost screen. It's purely for preview;
the real ads only run in the Android build.

## Ad placements

- **Banner** — bottom of the menus and end screens (hidden during gameplay so
  it never covers the controls).
- **Interstitial** — between legs, controlled by
  `ADS_CONFIG.interstitialEveryLevels` in `src/config/ads.config.js`.
- **Rewarded** — the *Watch ad → continue* option on the Ship Lost screen
  revives the ship where it went down with a full hull, keeping your score and
  level. Limited to `ADS_CONFIG.maxContinues` per run.

## Going live

In `src/config/ads.config.js`:

1. Set `testMode: false`.
2. Replace `appId`, `banner`, `interstitial`, and `rewarded` with your real
   AdMob unit IDs from the AdMob console.

Also set your real App ID in `capacitor.config.json`
(`plugins.AdMob.androidAppId`) and run `npx cap sync android`.

> Keep `testMode: true` during development. Clicking your own **live** ads can
> get your AdMob account suspended.

## Play Store checklist

- Bump `version` in `package.json` and the `versionCode`/`versionName` in
  `android/app/build.gradle` for each release.
- Provide a signing key (Android Studio can generate one) and keep it safe.
- Complete the Play Console data-safety and ads declarations (this app shows
  ads and uses the Advertising ID).
