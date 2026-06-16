import {
  WireData,
  WirePersonality,
  LoadRecord,
  GrowthTrend,
  WIRE_BASE_MAX_CAPACITY,
  LOAD_HISTORY_SIZE,
  PERSONALITY_THRESHOLD,
  PREMIUM_BALANCE_TOLERANCE,
  WIRE_PERSONALITY_INFO,
} from './constants';

export function createInitialWireData(): WireData {
  return {
    personality: 'normal',
    loadHistory: [],
    currentLoad: 0,
    maxCapacity: WIRE_BASE_MAX_CAPACITY,
    efficiency: 1.0,
    faultResistance: 1.0,
    age: 0,
    personalityScore: {
      aggressive: 0,
      lazy: 0,
      premium: 0,
    },
  };
}

export function addLoadRecord(wire: WireData, load: number, timestamp: number): WireData {
  const normalizedLoad = Math.min(1, Math.max(0, load / wire.maxCapacity));
  const newRecord: LoadRecord = { timestamp, load: normalizedLoad };
  const newHistory = [...wire.loadHistory, newRecord].slice(-LOAD_HISTORY_SIZE);
  return { ...wire, loadHistory: newHistory, currentLoad: load };
}

export function calculateLoadStats(history: LoadRecord[]) {
  if (history.length === 0) {
    return { avg: 0, variance: 0, highRatio: 0, lowRatio: 0 };
  }
  const loads = history.map((r) => r.load);
  const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
  const variance =
    loads.reduce((acc, l) => acc + (l - avg) ** 2, 0) / loads.length;
  const highRatio = loads.filter((l) => l >= 0.7).length / loads.length;
  const lowRatio = loads.filter((l) => l <= 0.25).length / loads.length;
  return { avg, variance, highRatio, lowRatio };
}

export function updatePersonalityScores(wire: WireData): WireData {
  const history = wire.loadHistory;
  if (history.length < 10) return wire;

  const stats = calculateLoadStats(history);

  let aggressiveDelta = 0;
  let lazyDelta = 0;
  let premiumDelta = 0;

  aggressiveDelta += stats.highRatio * 2;
  aggressiveDelta += stats.avg > 0.6 ? (stats.avg - 0.6) * 3 : 0;

  lazyDelta += stats.lowRatio * 2;
  lazyDelta += stats.avg < 0.35 ? (0.35 - stats.avg) * 3 : 0;

  const isBalanced = stats.avg >= 0.35 && stats.avg <= 0.7;
  const isStable = stats.variance < 0.06;
  if (isBalanced && isStable) {
    premiumDelta += 1.5;
    premiumDelta += (1 - Math.abs(stats.avg - 0.525)) * 1.5;
  }

  const decay = 0.015;

  const newScores = {
    aggressive: Math.max(0, wire.personalityScore.aggressive + aggressiveDelta * 0.02 - decay),
    lazy: Math.max(0, wire.personalityScore.lazy + lazyDelta * 0.02 - decay),
    premium: Math.max(0, wire.personalityScore.premium + premiumDelta * 0.02 - decay),
  };

  return { ...wire, personalityScore: newScores };
}

export function determinePersonality(wire: WireData): WirePersonality {
  const { aggressive, lazy, premium } = wire.personalityScore;
  const maxScore = Math.max(aggressive, lazy, premium);

  if (maxScore < PERSONALITY_THRESHOLD) {
    return 'normal';
  }

  if (premium >= PERSONALITY_THRESHOLD && premium >= maxScore - PREMIUM_BALANCE_TOLERANCE) {
    return 'premium';
  }

  if (aggressive >= lazy) {
    return 'aggressive';
  }
  return 'lazy';
}

export function applyPersonalityEffects(wire: WireData): WireData {
  const info = WIRE_PERSONALITY_INFO[wire.personality];
  return {
    ...wire,
    maxCapacity: Math.round(WIRE_BASE_MAX_CAPACITY * info.capacityMultiplier),
    efficiency: info.efficiencyMultiplier,
    faultResistance: info.faultMultiplier,
  };
}

export function evolveWire(wire: WireData, currentLoad: number, timestamp: number): WireData {
  let result = { ...wire, age: wire.age + 1 };
  result = addLoadRecord(result, currentLoad, timestamp);
  result = updatePersonalityScores(result);
  const newPersonality = determinePersonality(result);
  if (newPersonality !== result.personality) {
    result = { ...result, personality: newPersonality };
    result = applyPersonalityEffects(result);
  }
  return result;
}

export function getGrowthTrend(wire: WireData): GrowthTrend {
  const history = wire.loadHistory;
  if (history.length < 20) return 'forming';

  const half = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, half);
  const secondHalf = history.slice(half);

  const firstStats = calculateLoadStats(firstHalf);
  const secondStats = calculateLoadStats(secondHalf);

  const oldScore = wire.personalityScore.aggressive * 0.3 + wire.personalityScore.lazy * 0.3 + wire.personalityScore.premium;
  const isBalancing = secondStats.variance < firstStats.variance * 0.8;
  const loadCentering = Math.abs(secondStats.avg - 0.525) < Math.abs(firstStats.avg - 0.525) * 0.9;

  if (isBalancing && loadCentering && wire.personalityScore.premium > 0.1) {
    return 'improving';
  }

  const gettingExtreme = secondStats.highRatio > firstStats.highRatio * 1.2 || secondStats.lowRatio > firstStats.lowRatio * 1.2;
  if (gettingExtreme && wire.personality !== 'premium' && wire.personality !== 'normal') {
    return 'declining';
  }

  if (Math.abs(secondStats.avg - firstStats.avg) < 0.1 && Math.abs(secondStats.variance - firstStats.variance) < 0.02) {
    return 'stable';
  }

  if (oldScore > 0.5) return 'stable';
  return 'forming';
}

export function getPersonalityProgress(wire: WireData) {
  const { aggressive, lazy, premium } = wire.personalityScore;
  const total = aggressive + lazy + premium;
  if (total === 0) {
    return { aggressive: 0, lazy: 0, premium: 0, normal: 100 };
  }
  const scale = Math.max(total, PERSONALITY_THRESHOLD * 1.5);
  return {
    aggressive: Math.min(100, (aggressive / scale) * 100),
    lazy: Math.min(100, (lazy / scale) * 100),
    premium: Math.min(100, (premium / scale) * 100),
    normal: Math.max(0, 100 - (aggressive + lazy + premium) / scale * 100),
  };
}

export function getFaultChance(wire: WireData, baseChance: number): number {
  return baseChance * wire.faultResistance;
}
