'use strict';

/**
 * Ad configuration. The IDs below are Google's official AdMob *test* unit IDs
 * — safe to develop against and they show real test ads. Before publishing,
 * set `testMode` to false and replace each ID with your own AdMob unit IDs
 * (and put your App ID in android/app/src/main/AndroidManifest.xml — see
 * ANDROID.md).
 */
const ADS_CONFIG = {
  // Keep true until you ship: uses Google demo ads and avoids policy strikes
  // from clicking your own live ads during testing.
  testMode: true,

  // AdMob App ID (goes in AndroidManifest.xml). Test app ID shown here.
  appId: 'ca-app-pub-3940256099942544~3347511713',

  // Ad unit IDs (Android test units).
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',

  // Show an interstitial after clearing every N legs (1 = between every leg).
  interstitialEveryLevels: 1,

  // How many rewarded-ad "continues" a single run may use.
  maxContinues: 3
};
