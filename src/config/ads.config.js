'use strict';

/**
 * Ad configuration — real AdMob unit IDs for this app.
 *
 * `testMode: true` makes the game request Google TEST ads (labelled "Test Ad")
 * even though the IDs are real, so you can verify placements safely. When you
 * publish to the Play Store, set `testMode: false` for the release build so
 * real ads serve. Never tap live ads on your own device — see ANDROID.md.
 */
const ADS_CONFIG = {
  // true = show test ads (safe). Flip to false only for the published build.
  testMode: true,

  // AdMob App ID (must also be set in AndroidManifest.xml, see ANDROID.md).
  appId: 'ca-app-pub-8399875310081174~2034833058',

  // Ad unit IDs.
  banner: 'ca-app-pub-8399875310081174/2949147836',
  interstitial: 'ca-app-pub-8399875310081174/6640860699',
  rewarded: 'ca-app-pub-8399875310081174/8281365565',

  // Show an interstitial after clearing every N legs (1 = between every leg).
  interstitialEveryLevels: 1,

  // How many rewarded-ad "continues" a single run may use.
  maxContinues: 3
};
