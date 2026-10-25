/**
 * CrazyGames SDK v2 / v3 wrapper stub
 * Handles ad lifecycle events and gameplay analytics hooks safely.
 */
export class CrazyGamesSDK {
  constructor() {
    this.sdk = window.CrazyGames ? window.CrazyGames.SDK : null;
    this.isAvailable = !!this.sdk;
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

  async requestAd(type = 'midgame') {
    if (!this.sdk?.ad) return;

    try {
      if (type === 'rewarded') {
        await this.sdk.ad.requestAd('rewarded');
      } else {
        await this.sdk.ad.requestAd('midgame');
      }
    } catch (error) {
      console.warn('Ad error or blocked:', error);
    }
  }
}