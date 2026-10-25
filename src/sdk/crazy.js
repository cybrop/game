/**
 * CrazyGames SDK v2 / v3 compliance wrapper
 * Safely handles midgame, rewarded ads, gameplay analytics hooks,
 * and audio suspension during ad playback.
 */
export class CrazyGamesSDK {
  constructor() {
    this.sdk = window.CrazyGames ? window.CrazyGames.SDK : null;
    this.isAvailable = !!this.sdk;
    this.lastMidgameTime = 0;
    this.midgameCooldown = 180000; // 3 minutes between automatic midgame ads

    if (this.isAvailable) {
      console.log('[CrazyGames SDK] Initialized successfully.');
    } else {
      console.log('[CrazyGames SDK] Running in offline / simulation mode.');
    }
  }

  gameplayStart() {
    if (this.sdk?.game?.gameplayStart) {
      this.sdk.game.gameplayStart();
    }
  }

  gameplayStop() {
    if (this.sdk?.game?.gameplayStop) {
      this.sdk.game.gameplayStop();
    }
  }

  /**
   * Request Midgame Interstitial ad with cooldown protection
   */
  async requestMidgameAd(callbacks = {}) {
    const now = Date.now();
    if (now - this.lastMidgameTime < this.midgameCooldown) {
      console.log('[CrazyGames SDK] Midgame ad cooldown active. Skipping.');
      if (callbacks.adFinished) callbacks.adFinished();
      return;
    }

    if (!this.sdk?.ad?.requestAd) {
      if (callbacks.adStarted) callbacks.adStarted();
      if (callbacks.adFinished) callbacks.adFinished();
      return;
    }

    try {
      this.lastMidgameTime = now;
      await this.sdk.ad.requestAd('midgame', {
        adStarted: () => {
          if (callbacks.adStarted) callbacks.adStarted();
        },
        adFinished: () => {
          if (callbacks.adFinished) callbacks.adFinished();
        },
        adError: (error) => {
          console.warn('[CrazyGames SDK] Midgame ad error:', error);
          if (callbacks.adError) callbacks.adError(error);
          if (callbacks.adFinished) callbacks.adFinished();
        }
      });
    } catch (err) {
      console.warn('[CrazyGames SDK] Midgame request exception:', err);
      if (callbacks.adFinished) callbacks.adFinished();
    }
  }

  /**
   * Request Rewarded Video ad
   */
  async requestRewardedAd(callbacks = {}) {
    if (!this.sdk?.ad?.requestAd) {
      console.log('[CrazyGames SDK SIMULATION] Rewarded ad watched & rewarded.');
      if (callbacks.adStarted) callbacks.adStarted();
      if (callbacks.rewardGiven) callbacks.rewardGiven();
      if (callbacks.adFinished) callbacks.adFinished();
      return;
    }

    try {
      await this.sdk.ad.requestAd('rewarded', {
        adStarted: () => {
          if (callbacks.adStarted) callbacks.adStarted();
        },
        rewardGiven: () => {
          if (callbacks.rewardGiven) callbacks.rewardGiven();
        },
        adFinished: () => {
          if (callbacks.adFinished) callbacks.adFinished();
        },
        adError: (error) => {
          console.warn('[CrazyGames SDK] Rewarded ad error:', error);
          if (callbacks.adError) callbacks.adError(error);
          if (callbacks.adFinished) callbacks.adFinished();
        }
      });
    } catch (err) {
      console.warn('[CrazyGames SDK] Rewarded request exception:', err);
      if (callbacks.adFinished) callbacks.adFinished();
    }
  }
}