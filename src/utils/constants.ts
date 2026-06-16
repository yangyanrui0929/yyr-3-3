export type CellType = 'empty' | 'windmill' | 'house' | 'factory' | 'battery' | 'wire';

export type ToolType = CellType | 'remove';

export type WirePersonality = 'normal' | 'aggressive' | 'lazy' | 'premium';

export type GrowthTrend = 'improving' | 'declining' | 'stable' | 'forming';

export interface LoadRecord {
  timestamp: number;
  load: number;
}

export interface WireData {
  personality: WirePersonality;
  loadHistory: LoadRecord[];
  currentLoad: number;
  maxCapacity: number;
  efficiency: number;
  faultResistance: number;
  age: number;
  personalityScore: {
    aggressive: number;
    lazy: number;
    premium: number;
  };
}

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
  rotation: number;
  powered: boolean;
  faulty: boolean;
  wireData?: WireData;
}

export const GRID_SIZE = 8;

export const BUILDING_STATS = {
  windmill: { dayGen: 5, nightGen: 1, consumption: 0, name: '风车', emoji: '🌀' },
  house: { dayGen: 0, nightGen: 0, consumption: 2, name: '住房', emoji: '🏠' },
  factory: { dayGen: 0, nightGen: 0, consumption: 4, name: '工坊', emoji: '🏭' },
  battery: { dayGen: 0, nightGen: 0, consumption: 0, storage: 20, name: '蓄电池', emoji: '🔋' },
  wire: { dayGen: 0, nightGen: 0, consumption: 0, name: '电线', emoji: '⚡' },
} as const;

export const WIRE_CONNECTIONS: Record<number, [boolean, boolean, boolean, boolean]> = {
  0: [true, false, true, false],
  1: [false, true, false, true],
  2: [true, true, false, false],
  3: [true, false, false, true],
  4: [false, true, true, false],
  5: [false, false, true, true],
};

export const DIR_OFFSETS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const TOOLS: Array<{ type: ToolType; name: string; emoji: string; description: string }> = [
  { type: 'windmill', name: '风车', emoji: '🌀', description: '白天+5电，夜晚+1电' },
  { type: 'house', name: '住房', emoji: '🏠', description: '消耗2电，提供满意度' },
  { type: 'factory', name: '工坊', emoji: '🏭', description: '消耗4电，生产物资' },
  { type: 'battery', name: '蓄电池', emoji: '🔋', description: '存储20电量' },
  { type: 'wire', name: '电线', emoji: '⚡', description: '传导电力，右键/R旋转' },
  { type: 'remove', name: '拆除', emoji: '🗑️', description: '移除建筑或电线' },
];

export const DAY_LENGTH = 100;
export const DAY_THRESHOLD = 50;
export const TICK_INTERVAL = 300;
export const FAULT_CHANCE = 0.002;

export const WIRE_BASE_MAX_CAPACITY = 10;
export const LOAD_HISTORY_SIZE = 50;
export const PERSONALITY_THRESHOLD = 0.6;
export const PREMIUM_BALANCE_TOLERANCE = 0.15;

export const WIRE_PERSONALITY_INFO: Record<WirePersonality, {
  name: string;
  emoji: string;
  description: string;
  color: string;
  capacityMultiplier: number;
  efficiencyMultiplier: number;
  faultMultiplier: number;
}> = {
  normal: {
    name: '普通线路',
    emoji: '⚡',
    description: '标准电线，正常传输电力',
    color: '#fbbf24',
    capacityMultiplier: 1.0,
    efficiencyMultiplier: 1.0,
    faultMultiplier: 1.0,
  },
  aggressive: {
    name: '暴躁线路',
    emoji: '🔥',
    description: '长期高负载养成，传输能力强但易故障',
    color: '#ef4444',
    capacityMultiplier: 1.5,
    efficiencyMultiplier: 0.95,
    faultMultiplier: 2.5,
  },
  lazy: {
    name: '惰性线路',
    emoji: '💤',
    description: '长期低负载养成，稳定但有能量损耗',
    color: '#94a3b8',
    capacityMultiplier: 0.7,
    efficiencyMultiplier: 0.8,
    faultMultiplier: 0.3,
  },
  premium: {
    name: '优质线路',
    emoji: '✨',
    description: '均衡使用成长，高效稳定的理想线路',
    color: '#22c55e',
    capacityMultiplier: 1.2,
    efficiencyMultiplier: 1.1,
    faultMultiplier: 0.5,
  },
};

export const GROWTH_TREND_INFO: Record<GrowthTrend, {
  name: string;
  emoji: string;
  color: string;
}> = {
  improving: { name: '成长中', emoji: '📈', color: '#22c55e' },
  declining: { name: '衰退中', emoji: '📉', color: '#ef4444' },
  stable: { name: '稳定', emoji: '➡️', color: '#60a5fa' },
  forming: { name: '形成中', emoji: '🌱', color: '#a78bfa' },
};
