import { StorageManager } from './Storage.js';

export class Economy {
  constructor() {
    this.energy = 50;
    this.totalEarned = 50;

    const saved = StorageManager.load() || {};
    this.coreShards = saved.coreShards || 0;
    this.meta = {
      baseEnergy: saved.meta?.baseEnergy || 0,
      baseHp: saved.meta?.baseHp || 0,
      baseDamage: saved.meta?.baseDamage || 0,
      unlockTesla: saved.meta?.unlockTesla || false,
      unlockCryo: saved.meta?.unlockCryo || false,
      // Enchanted Book Workshop
      multishot: saved.meta?.multishot || false,
      flame: saved.meta?.flame || false,
      thorns: saved.meta?.thorns || false,
      fortune: saved.meta?.fortune || false
    };

    this.upgrades = {
      damage: 1,
      firerate: 1,
      health: 1,
      yield: 1,
      golem: 0
    };

    this.baseCosts = {
      damage: 25,
      firerate: 35,
      health: 40,
      yield: 30,
      golem: 60
    };

    this.costMultipliers = {
      damage: 1.45,
      firerate: 1.55,
      health: 1.4,
      yield: 1.5,
      golem: 1.65
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
    return Math.round(base * Math.pow(mult, Math.max(0, level - 1)));
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

  calculateShardPayout(wave, kills, totalEnergy) {
    const waveBonus = Math.max(0, (wave - 1) * 4);
    const killBonus = Math.floor(kills / 4);
    const energyBonus = Math.floor(totalEnergy / 180);
    const fortuneMult = this.meta.fortune ? 1.4 : 1.0;
    return Math.max(1, Math.round((waveBonus + killBonus + energyBonus) * fortuneMult));
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
      case 'multishot':
        return 35;
      case 'flame':
        return 45;
      case 'thorns':
        return 30;
      case 'fortune':
        return 40;
      default:
        return 999;
    }
  }

  buyMetaUpgrade(type) {
    const cost = this.getMetaCost(type);
    if (this.coreShards < cost) return false;

    if (typeof this.meta[type] === 'boolean') {
      if (this.meta[type]) return false;
      this.meta[type] = true;
    } else {
      this.meta[type]++;
    }

    this.coreShards -= cost;
    this.save();
    return true;
  }
}