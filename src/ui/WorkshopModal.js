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
          <h1 class="ore-gold">ANVIL & ENCHANTED WORKSHOP</h1>
          <div class="workshop-shards-counter">
            EMERALDS: <span id="workshop-shards-val" class="ore-emerald">0</span>
          </div>
        </div>
        <p class="workshop-desc">Forge permanent Netherite armor and enchanted books that persist across every respawn.</p>
        <div class="workshop-grid">
          <div class="meta-card">
            <div class="meta-title">Redstone Capacitors</div>
            <div class="meta-desc">+2.5 Starting Redstone / sec</div>
            <div class="meta-level">Level <span id="meta-lvl-baseEnergy">0</span></div>
            <button class="upgrade-btn" id="btn-meta-baseEnergy">
              UPGRADE (<span id="meta-cost-baseEnergy">10</span> E)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Netherite Plating</div>
            <div class="meta-desc">+40 Starting Beacon Base HP</div>
            <div class="meta-level">Level <span id="meta-lvl-baseHp">0</span></div>
            <button class="upgrade-btn" id="btn-meta-baseHp">
              UPGRADE (<span id="meta-cost-baseHp">12</span> E)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Power V Enchantment</div>
            <div class="meta-desc">+5 Base Arrow Impact Damage</div>
            <div class="meta-level">Level <span id="meta-lvl-baseDamage">0</span></div>
            <button class="upgrade-btn" id="btn-meta-baseDamage">
              UPGRADE (<span id="meta-cost-baseDamage">15</span> E)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Lightning Rod Array</div>
            <div class="meta-desc">Strikes nearby mobs with chained electric lightning bolts</div>
            <div class="meta-level"><span id="meta-status-tesla">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-unlockTesla">
              UNLOCK (40 E)
            </button>
          </div>

          <div class="meta-card">
            <div class="meta-title">Soul Frost Brazier</div>
            <div class="meta-desc">Blue soul fire slows monsters by 50% and burns over time</div>
            <div class="meta-level"><span id="meta-status-cryo">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-unlockCryo">
              UNLOCK (50 E)
            </button>
          </div>

          <!-- Enchantment: Multishot -->
          <div class="meta-card">
            <div class="meta-title">Enchanted Book: Multishot</div>
            <div class="meta-desc">Dispenser fires a 3-arrow spread cone simultaneously</div>
            <div class="meta-level"><span id="meta-status-multishot">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-multishot">
              ENCHANT (35 E)
            </button>
          </div>

          <!-- Enchantment: Flame I -->
          <div class="meta-card">
            <div class="meta-title">Enchanted Book: Flame I</div>
            <div class="meta-desc">Arrows ignite monsters for continuous fire damage</div>
            <div class="meta-level"><span id="meta-status-flame">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-flame">
              ENCHANT (45 E)
            </button>
          </div>

          <!-- Enchantment: Thorns -->
          <div class="meta-card">
            <div class="meta-title">Enchanted Book: Thorns</div>
            <div class="meta-desc">Beacon reflects damage back onto monsters on contact</div>
            <div class="meta-level"><span id="meta-status-thorns">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-thorns">
              ENCHANT (30 E)
            </button>
          </div>

          <!-- Enchantment: Fortune -->
          <div class="meta-card">
            <div class="meta-title">Enchanted Book: Fortune III</div>
            <div class="meta-desc">+40% Emerald bonus upon surviving waves and raids</div>
            <div class="meta-level"><span id="meta-status-fortune">LOCKED</span></div>
            <button class="upgrade-btn" id="btn-meta-fortune">
              ENCHANT (40 E)
            </button>
          </div>
        </div>
        <div class="workshop-footer">
          <button id="close-workshop-btn" class="action-btn">RETURN TO SURFACE</button>
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

    this.metaStatusMultishot = document.getElementById('meta-status-multishot');
    this.btnMetaMultishot = document.getElementById('btn-meta-multishot');

    this.metaStatusFlame = document.getElementById('meta-status-flame');
    this.btnMetaFlame = document.getElementById('btn-meta-flame');

    this.metaStatusThorns = document.getElementById('meta-status-thorns');
    this.btnMetaThorns = document.getElementById('btn-meta-thorns');

    this.metaStatusFortune = document.getElementById('meta-status-fortune');
    this.btnMetaFortune = document.getElementById('btn-meta-fortune');
  }

  attachEvents() {
    this.closeBtn.addEventListener('click', () => this.options.onClose?.());
    this.btnMetaBaseEnergy.addEventListener('click', () => this.options.onBuyMeta?.('baseEnergy'));
    this.btnMetaBaseHp.addEventListener('click', () => this.options.onBuyMeta?.('baseHp'));
    this.btnMetaBaseDamage.addEventListener('click', () => this.options.onBuyMeta?.('baseDamage'));
    this.btnMetaUnlockTesla.addEventListener('click', () => this.options.onBuyMeta?.('unlockTesla'));
    this.btnMetaUnlockCryo.addEventListener('click', () => this.options.onBuyMeta?.('unlockCryo'));

    this.btnMetaMultishot.addEventListener('click', () => this.options.onBuyMeta?.('multishot'));
    this.btnMetaFlame.addEventListener('click', () => this.options.onBuyMeta?.('flame'));
    this.btnMetaThorns.addEventListener('click', () => this.options.onBuyMeta?.('thorns'));
    this.btnMetaFortune.addEventListener('click', () => this.options.onBuyMeta?.('fortune'));
  }

  update(economy) {
    const meta = economy.meta;
    this.shardsVal.textContent = economy.coreShards;

    const energyCost = economy.getMetaCost('baseEnergy');
    this.metaLvlBaseEnergy.textContent = meta.baseEnergy;
    this.metaCostBaseEnergy.textContent = energyCost;
    this.btnMetaBaseEnergy.disabled = economy.coreShards < energyCost;

    const hpCost = economy.getMetaCost('baseHp');
    this.metaLvlBaseHp.textContent = meta.baseHp;
    this.metaCostBaseHp.textContent = hpCost;
    this.btnMetaBaseHp.disabled = economy.coreShards < hpCost;

    const damageCost = economy.getMetaCost('baseDamage');
    this.metaLvlBaseDamage.textContent = meta.baseDamage;
    this.metaCostBaseDamage.textContent = damageCost;
    this.btnMetaBaseDamage.disabled = economy.coreShards < damageCost;

    this.updateToggleBadge(this.metaStatusTesla, this.btnMetaUnlockTesla, meta.unlockTesla, 40, economy.coreShards, 'UNLOCK (40 E)');
    this.updateToggleBadge(this.metaStatusCryo, this.btnMetaUnlockCryo, meta.unlockCryo, 50, economy.coreShards, 'UNLOCK (50 E)');
    this.updateToggleBadge(this.metaStatusMultishot, this.btnMetaMultishot, meta.multishot, 35, economy.coreShards, 'ENCHANT (35 E)');
    this.updateToggleBadge(this.metaStatusFlame, this.btnMetaFlame, meta.flame, 45, economy.coreShards, 'ENCHANT (45 E)');
    this.updateToggleBadge(this.metaStatusThorns, this.btnMetaThorns, meta.thorns, 30, economy.coreShards, 'ENCHANT (30 E)');
    this.updateToggleBadge(this.metaStatusFortune, this.btnMetaFortune, meta.fortune, 40, economy.coreShards, 'ENCHANT (40 E)');
  }

  updateToggleBadge(statusEl, btnEl, isUnlocked, cost, shards, defaultText) {
    if (isUnlocked) {
      statusEl.textContent = 'INSTALLED';
      statusEl.style.color = 'var(--emerald-glow)';
      btnEl.disabled = true;
      btnEl.textContent = 'FORGED';
    } else {
      statusEl.textContent = 'LOCKED';
      statusEl.style.color = 'var(--gold-base)';
      btnEl.disabled = shards < cost;
      btnEl.textContent = defaultText;
    }
  }

  show() { this.container.classList.remove('hidden'); }
  hide() { this.container.classList.add('hidden'); }
}