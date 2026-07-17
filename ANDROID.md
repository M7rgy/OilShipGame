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

## Fullscreen & landscape

The game requests fullscreen and locks to landscape from JavaScript on the
first tap (works in mobile browsers and the WebView). For a **hard** landscape
lock and true edge-to-edge (no status/navigation bars) in the Android app,
apply these two edits to the generated `android/` project once. They survive
normal rebuilds; only re-apply if you delete and re-run `npx cap add android`.

**1. Lock orientation — `android/app/src/main/AndroidManifest.xml`**

On the `<activity …android:name=".MainActivity"…>` tag, add
`android:screenOrientation="sensorLandscape"` (landscape either way up):

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="sensorLandscape"
    ... >
```

**2. Hide the system bars — replace the contents of
`android/app/src/main/java/com/hormuzescape/game/MainActivity.java`** with:

```java
package com.hormuzescape.game;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableImmersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enableImmersive();
    }

    private void enableImmersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c =
            new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
```

This gives a fully immersive, landscape-locked app on any screen size (the
game scales to fit, so it's adaptive automatically). Re-run
`npx cap sync android` and rebuild.

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

## Going live with your own AdMob account

### 1. Create the app in AdMob

1. Go to [apps.admob.com](https://apps.admob.com) → **Apps → Add app**.
2. Platform: **Android**. "Is the app listed on a store?" → **No** (you can
   link it to Google Play later). Give it a name (e.g. *Hormuz Escape*) → **Add**.
3. Open the app → **App settings**. Copy the **App ID** — it looks like
   `ca-app-pub-0000000000000000~1111111111` (note the **`~`**).

### 2. Create three ad units

Under the app → **Ad units → Add ad unit**, create one of each:

| Ad unit type | Name it | You'll get an ID like |
| --- | --- | --- |
| **Banner** | Hormuz Banner | `ca-app-pub-…/2222222222` |
| **Interstitial** | Hormuz Interstitial | `ca-app-pub-…/3333333333` |
| **Rewarded** | Hormuz Rewarded | `ca-app-pub-…/4444444444` |

Each ad unit ID uses a **`/`** (App ID uses `~`). Copy all three.

### 3. Put the IDs in the project

Edit `src/config/ads.config.js`:

```js
const ADS_CONFIG = {
  testMode: false,                                   // <- flip to false for real ads
  appId: 'ca-app-pub-XXXX~YYYY',                     // your App ID (~)
  banner: 'ca-app-pub-XXXX/AAAA',                    // your Banner unit (/)
  interstitial: 'ca-app-pub-XXXX/BBBB',              // your Interstitial unit (/)
  rewarded: 'ca-app-pub-XXXX/CCCC',                  // your Rewarded unit (/)
  interstitialEveryLevels: 1,
  maxContinues: 3
};
```

Then set the same **App ID** in the Android manifest — edit
`android/app/src/main/AndroidManifest.xml` and replace the value in the
existing AdMob meta-data:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXX~YYYY"/>
```

(Also update `capacitor.config.json` → `plugins.AdMob.androidAppId` to the same
value, for good measure.)

### 4. Rebuild

```bash
npm run web
npx cap sync android
npx cap run android
```

### 5. Verify safely — DON'T click your own live ads

New ad units can take a few hours to start serving, and **clicking or
tapping your own live ads can get your AdMob account suspended.** To test with
your real ad unit IDs safely, register your phone as a test device so it shows
Google test ads instead of live ones:

1. Run the app once. In Android Studio's **Logcat**, filter for `AdMob` — it
   prints a line like:
   `Use RequestConfiguration.Builder.setTestDeviceIds(Arrays.asList("33BE2250B43518CCDA7DE426D04EE231"))`
2. In AdMob: **Settings → Test devices → Add test device**, paste that ID.

Now that device always shows test ads even though the IDs are real — so you can
tap freely. Real users still see real ads.

> Tip: keep `testMode: true` in `ads.config.js` while developing; only set it
> to `false` for release builds you actually publish.

### 6. Link to Google Play & app-ads.txt (after publishing)

Once the app is live on Google Play, link it in AdMob (**App settings → link to
store**) for better fill rates, and optionally publish an `app-ads.txt` if you
sell ads directly (not required to start).

## Play Store checklist

- Bump `version` in `package.json` and the `versionCode`/`versionName` in
  `android/app/build.gradle` for each release.
- Provide a signing key (Android Studio can generate one) and keep it safe.
- Complete the Play Console data-safety and ads declarations (this app shows
  ads and uses the Advertising ID).
