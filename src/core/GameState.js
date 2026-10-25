export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.isGameOver = false;
    this.isPaused = false;
    this.kills = 0;
    this.totalDamageDealt = 0;
    this.hasDoubledShards = false;
    this.hasRevivedThisRun = false;
    this.currentRunShardsEarned = 0;
    this.screenShake = {
      intensity: 0,
      decay: 0.9,
      offsetX: 0,
      offsetY: 0
    };
  }

  triggerShake(strength = 8) {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, strength);
  }

  updateShake() {
    if (this.screenShake.intensity > 0.1) {
      this.screenShake.offsetX = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.offsetY = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.intensity *= this.screenShake.decay;
    } else {
      this.screenShake.offsetX = 0;
      this.screenShake.offsetY = 0;
      this.screenShake.intensity = 0;
    }
  }
}