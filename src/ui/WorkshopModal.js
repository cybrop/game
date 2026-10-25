export class WorkshopModal {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.render();
    this.bindElements();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="modal-box workshop-box">
        <div class="workshop-header">
          <h1 class="neon-cyan">TECH LAB // WORKSHOP</h1>
          <div class="workshop-shards-counter">
            CORE SHARDS: <span id="workshop-shards-val" class="neon-yellow">0</span>
          </div>
        </div>
        <p class="workshop-desc">Install permanent orbital modifications that persist across all extractions.</p>
        <div class="workshop-grid">
          <div class="meta-card">
            <div class="meta-title">Overcharged Capacitors</div>
            <div class="meta-desc">+2.5 Base Energy / sec</div>
            <div class="meta-level">Level <span id="meta-lvl-baseEnergy">0</span></div>
            <button class="upgrade-btn" id="btn-meta-baseEnergy">
              UPGRADE (<span id="meta-cost-baseEnergy">10</span> SHARDS)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Reinforced Plating</div>
            <div class="meta-desc">+40 Starting Core HP</div>
            <div class="meta-level">Level <span id="meta-lvl-baseHp">0</span></div>
            <button class="upgrade-btn" id="btn-meta-baseHp">
              UPGRADE (<span id="meta-cost-baseHp">12</span> SHARDS)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">High-Velocity Cores</div>
            <div class="meta-desc">+5 Base Projectile Damage</div>
            <div class="meta-level">Level <span id="meta-lvl-baseDamage">0</span></div>
            <button class="upgrade-btn" id="btn-meta-baseDamage">
              UPGRADE (<span id="meta-cost-baseDamage">15</span> SHARDS)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Tesla Arc Coil</div>
            <div class="meta-desc">Automated lightning discharge jumping to 3 enemies</div>
            <div class="meta-level"><span id="meta-status-tesla">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-unlockTesla">
              UNLOCK (40 SHARDS)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Cryo Emitter Field</div>
            <div class="meta-desc">Aura slows enemies near core by 50% + frost damage</div>
            <div class="meta-level"><span id="meta-status-cryo">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-unlockCryo">
              UNLOCK (50 SHARDS)
            </button>
          </div>
        </div>
        <div class="workshop-footer">
          <button id="close-workshop-btn" class="action-btn">RETURN TO MISSION</button>
        </div>
      </div>
    `;
  }

  bindElements() {
    this.shardsVal = document.getElementById('workshop-shards-val');
    this.closeBtn = document.getElementById('close-workshop-btn');

    this.metaLvlBaseEnergy = document.getElementById('meta-lvl-baseEnergy');
    this.metaCostBaseEnergy = document.getElementById('meta-cost-baseEnergy');
    this.btnMetaBaseEnergy = document.getElementById('btn-meta-baseEnergy');

    this.metaLvlBaseHp = document.getElementById('meta-lvl-baseHp');
    this.metaCostBaseHp = document.getElementById('meta-cost-baseHp');
    this.btnMetaBaseHp = document.getElementById('btn-meta-baseHp');

    this.metaLvlBaseDamage = document.getElementById('meta-lvl-baseDamage');
    this.metaCostBaseDamage = document.getElementById('meta-cost-baseDamage');
    this.btnMetaBaseDamage = document.getElementById('btn-meta-baseDamage');

    this.metaStatusTesla = document.getElementById('meta-status-tesla');
    this.btnMetaUnlockTesla = document.getElementById('btn-meta-unlockTesla');

    this.metaStatusCryo = document.getElementById('meta-status-cryo');
    this.btnMetaUnlockCryo = document.getElementById('btn-meta-unlockCryo');
  }

  attachEvents() {
    this.closeBtn.addEventListener('click', () => this.options.onClose?.());
    this.btnMetaBaseEnergy.addEventListener('click', () => this.options.onBuyMeta?.('baseEnergy'));
    this.btnMetaBaseHp.addEventListener('click', () => this.options.onBuyMeta?.('baseHp'));
    this.btnMetaBaseDamage.addEventListener('click', () => this.options.onBuyMeta?.('baseDamage'));
    this.btnMetaUnlockTesla.addEventListener('click', () => this.options.onBuyMeta?.('unlockTesla'));
    this.btnMetaUnlockCryo.addEventListener('click', () => this.options.onBuyMeta?.('unlockCryo'));
  }

  update(economy) {
    const meta = economy.meta;
    this.shardsVal.textContent = economy.coreShards;

    // Base Energy
    const energyCost = economy.getMetaCost('baseEnergy');
    this.metaLvlBaseEnergy.textContent = meta.baseEnergy;
    this.metaCostBaseEnergy.textContent = energyCost;
    this.btnMetaBaseEnergy.disabled = economy.coreShards < energyCost;

    // Base HP
    const hpCost = economy.getMetaCost('baseHp');
    this.metaLvlBaseHp.textContent = meta.baseHp;
    this.metaCostBaseHp.textContent = hpCost;
    this.btnMetaBaseHp.disabled = economy.coreShards < hpCost;

    // Base Damage
    const damageCost = economy.getMetaCost('baseDamage');
    this.metaLvlBaseDamage.textContent = meta.baseDamage;
    this.metaCostBaseDamage.textContent = damageCost;
    this.btnMetaBaseDamage.disabled = economy.coreShards < damageCost;

    // Tesla
    if (meta.unlockTesla) {
      this.metaStatusTesla.textContent = 'INSTALLED';
      this.metaStatusTesla.style.color = '#00ff88';
      this.btnMetaUnlockTesla.disabled = true;
      this.btnMetaUnlockTesla.textContent = 'PURCHASED';
    } else {
      this.metaStatusTesla.textContent = 'LOCKED';
      this.metaStatusTesla.style.color = '#ffd000';
      this.btnMetaUnlockTesla.disabled = economy.coreShards < 40;
      this.btnMetaUnlockTesla.textContent = 'UNLOCK (40 SHARDS)';
    }

    // Cryo
    if (meta.unlockCryo) {
      this.metaStatusCryo.textContent = 'INSTALLED';
      this.metaStatusCryo.style.color = '#00ff88';
      this.btnMetaUnlockCryo.disabled = true;
      this.btnMetaUnlockCryo.textContent = 'PURCHASED';
    } else {
      this.metaStatusCryo.textContent = 'LOCKED';
      this.metaStatusCryo.style.color = '#ffd000';
      this.btnMetaUnlockCryo.disabled = economy.coreShards < 50;
      this.btnMetaUnlockCryo.textContent = 'UNLOCK (50 SHARDS)';
    }
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}