import { StorageManager } from './Storage.js';

export class Economy {
  constructor() {
    this.energy = 50; // Starting run seed currency
    this.totalEarned = 50;

    // Load persistent meta state
    const saved = StorageManager.load() || {};
    this.coreShards = saved.coreShards || 0;
    this.meta = {
      baseEnergy: saved.meta?.baseEnergy || 0,
      baseHp: saved.meta?.baseHp || 0,
      baseDamage: saved.meta?.baseDamage || 0,
      unlockTesla: saved.meta?.unlockTesla || false,
      unlockCryo: saved.meta?.unlockCryo || false
    };

    // In-Run upgrades
    this.upgrades = {
      damage: 1,
      firerate: 1,
      health: 1,
      yield: 1
    };

    this.baseCosts = {
      damage: 25,
      firerate: 35,
      health: 40,
      yield: 30
    };

    this.costMultipliers = {
      damage: 1.45,
      firerate: 1.55,
      health: 1.4,
      yield: 1.5
    };
  }

  save() {
    StorageManager.save({
      coreShards: this.coreShards,
      meta: this.meta
    });
  }

  getEnergyRate() {
    const baseRate = 5 + this.meta.baseEnergy * 2.5;
    return baseRate + (this.upgrades.yield - 1) * 4;
  }

  update(dt) {
    const gained = this.getEnergyRate() * dt;
    this.energy += gained;
    this.totalEarned += gained;
  }

  addEnergy(amount) {
    this.energy += amount;
    this.totalEarned += amount;
  }

  getUpgradeCost(type) {
    const level = this.upgrades[type];
    const base = this.baseCosts[type];
    const mult = this.costMultipliers[type];
    return Math.round(base * Math.pow(mult, level - 1));
  }

  buyUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    if (this.energy >= cost) {
      this.energy -= cost;
      this.upgrades[type]++;
      return true;
    }
    return false;
  }

  // Meta Progression Calculations
  calculateShardPayout(wave, kills, totalEnergy) {
    const waveBonus = Math.max(0, (wave - 1) * 4);
    const killBonus = Math.floor(kills / 4);
    const energyBonus = Math.floor(totalEnergy / 180);
    return Math.max(1, waveBonus + killBonus + energyBonus);
  }

  addShards(amount) {
    this.coreShards += amount;
    this.save();
  }

  getMetaCost(type) {
    switch (type) {
      case 'baseEnergy':
        return Math.round(10 * Math.pow(1.6, this.meta.baseEnergy));
      case 'baseHp':
        return Math.round(12 * Math.pow(1.5, this.meta.baseHp));
      case 'baseDamage':
        return Math.round(15 * Math.pow(1.6, this.meta.baseDamage));
      case 'unlockTesla':
        return 40;
      case 'unlockCryo':
        return 50;
      default:
        return 999;
    }
  }

  buyMetaUpgrade(type) {
    const cost = this.getMetaCost(type);
    if (this.coreShards < cost) return false;

    if (type === 'unlockTesla') {
      if (this.meta.unlockTesla) return false;
      this.meta.unlockTesla = true;
    } else if (type === 'unlockCryo') {
      if (this.meta.unlockCryo) return false;
      this.meta.unlockCryo = true;
    } else {
      this.meta[type]++;
    }

    this.coreShards -= cost;
    this.save();
    return true;
  }
}