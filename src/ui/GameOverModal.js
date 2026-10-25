export class GameOverModal {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.render();
    this.bindElements();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="modal-box">
        <h1 class="neon-red">CORE BREACH DETECTED</h1>
        <p>Drill overwhelmed. Shard extraction completed.</p>
        <div class="shards-payout-box">
          <span class="payout-label">CORE SHARDS EXTRACTED:</span>
          <span id="payout-shards" class="payout-val neon-yellow">+0</span>
        </div>

        <div class="reward-ad-row">
          <button id="btn-rewarded-double" class="reward-ad-btn">
            🎬 WATCH AD: 2X SHARDS (<span id="double-shards-amount">+0</span>)
          </button>
          <button id="btn-rewarded-revive" class="reward-ad-btn cyan-reward">
            ⚡ WATCH AD: EMERGENCY REBOOT (50% HP)
          </button>
        </div>

        <div class="stats-summary">
          <div>Waves Cleared: <strong id="summary-waves">0</strong></div>
          <div>Biomass Harvested: <strong id="summary-energy">0</strong></div>
          <div>Hostiles Purged: <strong id="summary-kills">0</strong></div>
          <div>Total Core Shards: <strong id="summary-total-shards" class="neon-yellow">0</strong></div>
        </div>
        <div class="modal-actions">
          <button id="modal-workshop-btn" class="secondary-btn">VISIT WORKSHOP</button>
          <button id="restart-run-btn" class="action-btn">REDEPLOY DRILL</button>
        </div>
      </div>
    `;
  }

  bindElements() {
    this.payoutShards = document.getElementById('payout-shards');
    this.doubleShardsAmount = document.getElementById('double-shards-amount');
    this.btnRewardedDouble = document.getElementById('btn-rewarded-double');
    this.btnRewardedRevive = document.getElementById('btn-rewarded-revive');
    this.summaryWaves = document.getElementById('summary-waves');
    this.summaryEnergy = document.getElementById('summary-energy');
    this.summaryKills = document.getElementById('summary-kills');
    this.summaryTotalShards = document.getElementById('summary-total-shards');
    this.modalWorkshopBtn = document.getElementById('modal-workshop-btn');
    this.restartBtn = document.getElementById('restart-run-btn');
  }

  attachEvents() {
    this.btnRewardedDouble.addEventListener('click', () => this.options.onDoubleShards?.());
    this.btnRewardedRevive.addEventListener('click', () => this.options.onRevive?.());
    this.modalWorkshopBtn.addEventListener('click', () => this.options.onOpenWorkshop?.());
    this.restartBtn.addEventListener('click', () => this.options.onRestart?.());
  }

  show({ shardsEarned, wave, totalEnergy, kills, totalShards, hasRevived }) {
    this.payoutShards.textContent = `+${shardsEarned}`;
    this.doubleShardsAmount.textContent = `+${shardsEarned}`;
    this.summaryWaves.textContent = wave;
    this.summaryEnergy.textContent = Math.floor(totalEnergy);
    this.summaryKills.textContent = kills;
    this.summaryTotalShards.textContent = totalShards;

    this.btnRewardedDouble.disabled = false;
    this.btnRewardedDouble.textContent = `🎬 WATCH AD: 2X SHARDS (+${shardsEarned})`;

    if (hasRevived) {
      this.btnRewardedRevive.disabled = true;
      this.btnRewardedRevive.textContent = 'REVIVE ALREADY USED';
    } else {
      this.btnRewardedRevive.disabled = false;
      this.btnRewardedRevive.textContent = '⚡ WATCH AD: EMERGENCY REBOOT (50% HP)';
    }

    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}