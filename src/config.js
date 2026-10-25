export const CONFIG = {
  CANVAS: {
    DEFAULT_WIDTH: 760,
    DEFAULT_HEIGHT: 656,
    GRID_SIZE: 45
  },
  CORE: {
    BASE_HP: 100,
    HP_PER_META_LEVEL: 40,
    RADIUS: 34
  },
  TURRET: {
    BASE_DAMAGE: 15,
    DAMAGE_PER_META_LEVEL: 5,
    RANGE: 240,
    BASE_FIRE_COOLDOWN: 450, // ms
    MIN_FIRE_COOLDOWN: 120   // ms
  },
  TESLA: {
    RANGE: 200,
    BASE_DAMAGE: 18,
    MAX_CHAINS: 3,
    COOLDOWN: 1.3,
    CHAIN_RANGE: 140,
    UNLOCK_COST: 40
  },
  CRYO: {
    RADIUS: 160,
    SLOW_MULTIPLIER: 0.5,
    SLOW_DURATION: 0.6,
    DAMAGE_PER_TICK: 2,
    TICK_INTERVAL: 0.5,
    UNLOCK_COST: 50
  },
  ECONOMY: {
    START_ENERGY: 50,
    BASE_RATE: 5,
    BASE_RATE_PER_META_LEVEL: 2.5,
    RATE_PER_UPGRADE_LEVEL: 4,
    UPGRADE_COSTS: {
      damage: 25,
      firerate: 35,
      health: 40,
      yield: 30
    },
    UPGRADE_MULTIPLIERS: {
      damage: 1.45,
      firerate: 1.55,
      health: 1.4,
      yield: 1.5
    },
    META_COSTS: {
      baseEnergy: { base: 10, multiplier: 1.6 },
      baseHp: { base: 12, multiplier: 1.5 },
      baseDamage: { base: 15, multiplier: 1.6 }
    }
  },
  WAVES: {
    INITIAL_COUNT: 8,
    COUNT_PER_WAVE: 4,
    SPAWN_INTERVAL_BASE: 1.1,
    SPAWN_INTERVAL_MIN: 0.4,
    INTERMISSION_TIME: 3.0
  },
  STRIKE: {
    DAMAGE_FACTOR: 0.9,
    RADIUS: 75,
    KNOCKBACK: 24
  }
};