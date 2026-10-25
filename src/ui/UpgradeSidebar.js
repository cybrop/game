export class UpgradeSidebar {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.render();
    this.bindElements();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="sidebar-header">
        <h2>IN-RUN UPGRADES</h2>
        <p class="sidebar-sub">Enhance current run defenses</p>
      </div>

      <div class="upgrade-list">
        <div class="upgrade-card" id="card-damage">
          <div class="upgrade-info">
            <span class="upgrade-name">Turret Damage</span>
            <span class="upgrade-level">Lv <span id="lvl-damage">1</span></span>
          </div>
          <div class="upgrade-effect">Damage: <span id="val-damage">15</span></div>
          <button class="upgrade-btn" id="btn-upgrade-damage">
            UPGRADE (<span id="cost-damage">25</span>)
          </button>
        </div>

        <div class="upgrade-card" id="card-firerate">
          <div class="upgrade-info">
            <span class="upgrade-name">Firing Rate</span>
            <span class="upgrade-level">Lv <span id="lvl-firerate">1</span></span>
          </div>
          <div class="upgrade-effect">Cooldown: <span id="val-firerate">0.45</span>s</div>
          <button class="upgrade-btn" id="btn-upgrade-firerate">
            UPGRADE (<span id="cost-firerate">35</span>)
          </button>
        </div>

        <div class="upgrade-card" id="card-health">
          <div class="upgrade-info">
            <span class="upgrade-name">Reinforced Core</span>
            <span class="upgrade-level">Lv <span id="lvl-health">1</span></span>
          </div>
          <div class="upgrade-effect">Max HP: <span id="val-health">100</span></div>
          <button class="upgrade-btn" id="btn-upgrade-health">
            UPGRADE (<span id="cost-health">40</span>)
          </button>
        </div>

        <div class="upgrade-card" id="card-yield">
          <div class="upgrade-info">
            <span class="upgrade-name">Extractor Yield</span>
            <span class="upgrade-level">Lv <span id="lvl-yield">1</span></span>
          </div>
          <div class="upgrade-effect">Yield: +<span id="val-yield">5</span>/s</div>
          <button class="upgrade-btn" id="btn-upgrade-yield">
            UPGRADE (<span id="cost-yield">30</span>)
          </button>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="stat-row">
          <span>Tesla Coil:</span>
          <span id="stat-tesla" class="neon-cyan">Locked</span>
        </div>
        <div class="stat-row">
          <span>Cryo Field:</span>
          <span id="stat-cryo" class="neon-cyan">Locked</span>
        </div>
        <div class="stat-row">
          <span>Turret Range:</span>
          <span id="stat-range">240px</span>
        </div>
        <div class="stat-row">
          <span>Enemies Defeated:</span>
          <span id="stat-kills">0</span>
        </div>
        <button id="btn-open-workshop" class="secondary-btn">OPEN WORKSHOP</button>
      </div>
    `;
  }

  bindElements() {
    this.lvlDamage = document.getElementById('lvl-damage');
    this.valDamage = document.getElementById('val-damage');
    this.costDamage = document.getElementById('cost-damage');
    this.btnDamage = document.getElementById('btn-upgrade-damage');

    this.lvlFirerate = document.getElementById('lvl-firerate');
    this.valFirerate = document.getElementById('val-firerate');
    this.costFirerate = document.getElementById('cost-firerate');
    this.btnFirerate = document.getElementById('btn-upgrade-firerate');

    this.lvlHealth = document.getElementById('lvl-health');
    this.valHealth = document.getElementById('val-health');
    this.costHealth = document.getElementById('cost-health');
    this.btnHealth = document.getElementById('btn-upgrade-health');

    this.lvlYield = document.getElementById('lvl-yield');
    this.valYield = document.getElementById('val-yield');
    this.costYield = document.getElementById('cost-yield');
    this.btnYield = document.getElementById('btn-upgrade-yield');

    this.statTesla = document.getElementById('stat-tesla');
    this.statCryo = document.getElementById('stat-cryo');
    this.statRange = document.getElementById('stat-range');
    this.statKills = document.getElementById('stat-kills');
    this.btnOpenWorkshop = document.getElementById('btn-open-workshop');
  }

  attachEvents() {
    this.btnDamage.addEventListener('click', () => this.options.onBuyUpgrade?.('damage'));
    this.btnFirerate.addEventListener('click', () => this.options.onBuyUpgrade?.('firerate'));
    this.btnHealth.addEventListener('click', () => this.options.onBuyUpgrade?.('health'));
    this.btnYield.addEventListener('click', () => this.options.onBuyUpgrade?.('yield'));
    this.btnOpenWorkshop.addEventListener('click', () => this.options.onOpenWorkshop?.());
  }

  update({ economy, turret, core, kills }) {
    // Damage
    const dmgCost = economy.getUpgradeCost('damage');
    this.lvlDamage.textContent = economy.upgrades.damage;
    this.valDamage.textContent = turret.damage;
    this.costDamage.textContent = dmgCost;
    this.btnDamage.disabled = economy.energy < dmgCost;

    // Fire rate
    const frCost = economy.getUpgradeCost('firerate');
    this.lvlFirerate.textContent = economy.upgrades.firerate;
    this.valFirerate.textContent = (turret.fireCooldown / 1000).toFixed(2);
    this.costFirerate.textContent = frCost;
    this.btnFirerate.disabled = economy.energy < frCost;

    // Health
    const hpCost = economy.getUpgradeCost('health');
    this.lvlHealth.textContent = economy.upgrades.health;
    this.valHealth.textContent = core.maxHp;
    this.costHealth.textContent = hpCost;
    this.btnHealth.disabled = economy.energy < hpCost;

    // Yield
    const yldCost = economy.getUpgradeCost('yield');
    this.lvlYield.textContent = economy.upgrades.yield;
    this.valYield.textContent = economy.getEnergyRate().toFixed(1);
    this.costYield.textContent = yldCost;
    this.btnYield.disabled = economy.energy < yldCost;

    // Footer stats
    this.statTesla.textContent = economy.meta.unlockTesla ? 'Active' : 'Locked';
    this.statTesla.style.color = economy.meta.unlockTesla ? '#00ff88' : '#7482a5';

    this.statCryo.textContent = economy.meta.unlockCryo ? 'Active' : 'Locked';
    this.statCryo.style.color = economy.meta.unlockCryo ? '#00f3ff' : '#7482a5';

    this.statRange.textContent = `${turret.range}px`;
    this.statKills.textContent = kills;
  }
}