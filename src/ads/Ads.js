'use strict';

/**
 * Ads — a thin abstraction over mobile ads with three modes:
 *
 *   native : running inside the Capacitor Android app with the AdMob plugin
 *            (@capacitor-community/admob). Real banner/interstitial/rewarded
 *            ads via window.Capacitor.Plugins.AdMob.
 *   sim    : `?ads` in the URL — draws lightweight DOM overlays that stand in
 *            for ads, so the whole flow can be previewed/tested in a browser.
 *   off    : plain web / desktop (default). Everything is a no-op and no
 *            rewarded "continue" is offered, so the itch.io build is clean.
 *
 * Every method is safe to call in any mode. Async methods always resolve.
 */
const Ads = (function () {
  const sim = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('ads');

  let native = false;
  let admob = null;
  let bannerShown = false;

  function cfg() {
    return typeof ADS_CONFIG !== 'undefined' ? ADS_CONFIG : {};
  }

  async function init() {
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()
        && cap.Plugins && cap.Plugins.AdMob) {
      admob = cap.Plugins.AdMob;
      try {
        await admob.initialize({
          initializeForTesting: !!cfg().testMode,
          testingDevices: cfg().testingDevices || []
        });
        native = true;
      } catch (e) {
        native = false;
      }
    }
  }

  // whether a rewarded "continue" can be offered at all
  function rewardReady() {
    return native || sim;
  }

  function active() {
    return native || sim;
  }

  // ------------------------------------------------------------- native ads

  async function showBanner() {
    if (bannerShown) { return; }
    bannerShown = true;
    if (native) {
      try {
        await admob.showBanner({
          adId: cfg().banner,
          adSize: 'BANNER',
          position: 'BOTTOM_CENTER',
          margin: 0,
          isTesting: !!cfg().testMode
        });
      } catch (e) { /* ignore */ }
    } else if (sim) {
      simBanner(true);
    }
  }

  async function hideBanner() {
    if (!bannerShown) { return; }
    bannerShown = false;
    if (native) {
      try { await admob.hideBanner(); } catch (e) { /* ignore */ }
    } else if (sim) {
      simBanner(false);
    }
  }

  async function showInterstitial() {
    if (native) {
      try {
        await admob.prepareInterstitial({ adId: cfg().interstitial, isTesting: !!cfg().testMode });
        await admob.showInterstitial();
      } catch (e) { /* ignore */ }
    } else if (sim) {
      await simFullscreen('Interstitial Ad', 2200, false);
    }
  }

  // resolves true if the reward was earned
  async function showRewarded() {
    if (native) {
      try {
        await admob.prepareRewardVideoAd({ adId: cfg().rewarded, isTesting: !!cfg().testMode });
        const res = await admob.showRewardVideoAd();
        return !!res; // reward item present == earned
      } catch (e) {
        return false;
      }
    }
    if (sim) {
      await simFullscreen('Rewarded Ad', 2800, true);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------- simulated overlays

  function simBanner(show) {
    let el = document.getElementById('sim-banner');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'sim-banner';
        el.textContent = 'Ad banner (simulated)';
        Object.assign(el.style, {
          position: 'fixed', left: '0', right: '0', bottom: '0', height: '50px',
          background: '#11324a', color: '#9fb4c4', font: '13px monospace',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderTop: '1px solid #2a6f97', zIndex: '20', pointerEvents: 'none'
        });
        document.body.appendChild(el);
      }
      el.style.display = 'flex';
    } else if (el) {
      el.style.display = 'none';
    }
  }

  function simFullscreen(label, ms, rewarded) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      Object.assign(ov.style, {
        position: 'fixed', inset: '0', background: 'rgba(4,18,31,0.97)',
        color: '#f4e9d8', font: '22px monospace', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '30', textAlign: 'center', gap: '14px'
      });
      const title = document.createElement('div');
      title.textContent = label + ' (simulated)';
      const sub = document.createElement('div');
      sub.style.font = '15px monospace';
      sub.style.color = '#9fb4c4';
      const count = document.createElement('div');
      count.style.font = '40px monospace';
      count.style.color = rewarded ? '#37e07a' : '#ffd27a';
      ov.appendChild(title);
      ov.appendChild(count);
      ov.appendChild(sub);
      document.body.appendChild(ov);

      const end = Date.now() + ms;
      const tick = () => {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        count.textContent = left + 's';
        sub.textContent = rewarded ? 'Reward on completion…' : 'Your game resumes after this ad';
        if (left <= 0) {
          clearInterval(iv);
          ov.remove();
          resolve();
        }
      };
      tick();
      const iv = setInterval(tick, 200);
    });
  }

  return {
    init,
    rewardReady,
    active,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded,
    isSim: () => sim,
    isNative: () => native
  };
})();
