export class CrazyGamesWrapper {
  constructor() {
    this.sdk = null;
    this.enabled = false;
    this.init();
  }

  async init() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) {
        this.sdk = window.CrazyGames.SDK;
        this.enabled = true;
        await this.sdk.gameplayStart();
      }
    } catch {
      this.enabled = false;
    }
  }

  gameplayStart() {
    if (this.sdk) {
      this.sdk.gameplayStart();
    }
  }

  gameplayStop() {
    if (this.sdk) {
      this.sdk.gameplayStop();
    }
  }

  ad() {
    if (this.sdk && this.sdk.ad) {
      this.sdk.ad.requestAd();
    }
  }
}
