import {
  GridCell,
  GRID_SIZE,
  WIRE_CONNECTIONS,
  DIR_OFFSETS,
  BUILDING_STATS,
  DAY_THRESHOLD,
  WIRE_BASE_MAX_CAPACITY,
} from './constants';

export function isWireConnected(wire: GridCell, direction: number): boolean {
  if (wire.type !== 'wire') return false;
  const connections = WIRE_CONNECTIONS[wire.rotation % 6];
  if (!connections) return false;
  return connections[direction];
}

export function getOppositeDirection(dir: number): number {
  return (dir + 2) % 4;
}

interface PathNode {
  x: number;
  y: number;
  path: string[];
}

function traceWirePaths(
  grid: GridCell[][],
  sources: Array<{ x: number; y: number }>
): {
  wirePaths: Map<string, string[][]>;
  connectedCells: Set<string>;
} {
  const wirePaths = new Map<string, string[][]>();
  const connectedCells = new Set<string>();
  const visited = new Set<string>();
  const queue: PathNode[] = sources.map((s) => ({ x: s.x, y: s.y, path: [`${s.x},${s.y}`] }));

  for (const s of sources) {
    visited.add(`${s.x},${s.y}`);
    connectedCells.add(`${s.x},${s.y}`);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentCell = grid[current.y][current.x];

    for (let dir = 0; dir < 4; dir++) {
      const [dx, dy] = DIR_OFFSETS[dir];
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

      const neighbor = grid[ny][nx];
      if (neighbor.faulty) continue;

      const neighborKey = `${nx},${ny}`;
      if (visited.has(neighborKey)) continue;

      let canConnectFromCurrent = false;
      if (currentCell.type === 'wire') {
        canConnectFromCurrent = isWireConnected(currentCell, dir);
      } else if (
        currentCell.type === 'windmill' ||
        currentCell.type === 'house' ||
        currentCell.type === 'factory' ||
        currentCell.type === 'battery'
      ) {
        canConnectFromCurrent = true;
      }

      let canConnectFromNeighbor = false;
      if (neighbor.type === 'wire') {
        canConnectFromNeighbor = isWireConnected(neighbor, getOppositeDirection(dir));
      } else if (
        neighbor.type === 'windmill' ||
        neighbor.type === 'house' ||
        neighbor.type === 'factory' ||
        neighbor.type === 'battery'
      ) {
        canConnectFromNeighbor = true;
      }

      if (canConnectFromCurrent && canConnectFromNeighbor) {
        visited.add(neighborKey);
        connectedCells.add(neighborKey);

        const newPath = [...current.path, neighborKey];
        if (neighbor.type === 'wire') {
          if (!wirePaths.has(neighborKey)) {
            wirePaths.set(neighborKey, []);
          }
          wirePaths.get(neighborKey)!.push(newPath);
          queue.push({ x: nx, y: ny, path: newPath });
        } else {
          for (const node of newPath) {
            if (grid[Number(node.split(',')[1])][Number(node.split(',')[0])].type === 'wire') {
              if (!wirePaths.has(node)) {
                wirePaths.set(node, []);
              }
              wirePaths.get(node)!.push(newPath);
            }
          }
        }
      }
    }
  }

  return { wirePaths, connectedCells };
}

export function calculatePowerNetwork(
  grid: GridCell[][],
  dayTime: number,
  storedPower: number
): {
  poweredCells: Set<string>;
  totalGeneration: number;
  totalConsumption: number;
  batteryCapacity: number;
  wireLoads: Map<string, number>;
} {
  const isDay = dayTime < DAY_THRESHOLD;
  let totalGeneration = 0;
  let totalConsumption = 0;
  let batteryCapacity = 0;

  const windmillSources: Array<{ x: number; y: number; gen: number }> = [];
  const batterySources: Array<{ x: number; y: number; discharge: number }> = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.faulty) continue;

      if (cell.type === 'windmill') {
        const gen = isDay
          ? BUILDING_STATS.windmill.dayGen
          : BUILDING_STATS.windmill.nightGen;
        totalGeneration += gen;
        windmillSources.push({ x, y, gen });
      }
      if (cell.type === 'battery') {
        batteryCapacity += BUILDING_STATS.battery.storage;
      }
      if (cell.type === 'house') {
        totalConsumption += BUILDING_STATS.house.consumption;
      }
      if (cell.type === 'factory') {
        totalConsumption += BUILDING_STATS.factory.consumption;
      }
    }
  }

  const availableFromBatteries = Math.max(0, storedPower);
  const totalAvailable = totalGeneration + availableFromBatteries;

  if (availableFromBatteries > 0) {
    const batteryCount = grid.flat().filter(
      (c) => c.type === 'battery' && !c.faulty
    ).length;
    if (batteryCount > 0) {
      const dischargePerBattery = availableFromBatteries / batteryCount;
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          if (cell.type === 'battery' && !cell.faulty) {
            batterySources.push({ x, y, discharge: dischargePerBattery });
          }
        }
      }
    }
  }

  const allSources = [
    ...windmillSources.map((s) => ({ x: s.x, y: s.y })),
    ...batterySources.map((s) => ({ x: s.x, y: s.y })),
  ];

  const { wirePaths, connectedCells } = traceWirePaths(grid, allSources);

  const wireLoads = new Map<string, number>();
  const wireEfficiencies = new Map<string, number>();

  for (const [wireKey] of wirePaths) {
    const [wx, wy] = wireKey.split(',').map(Number);
    const wireCell = grid[wy][wx];
    const efficiency = wireCell.wireData?.efficiency ?? 1.0;
    const maxCap = wireCell.wireData?.maxCapacity ?? WIRE_BASE_MAX_CAPACITY;
    wireEfficiencies.set(wireKey, efficiency);
    wireLoads.set(wireKey, 0);
    void maxCap;
  }

  const poweredCells = new Set<string>();

  for (const s of allSources) {
    poweredCells.add(`${s.x},${s.y}`);
  }

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.type === 'wire' && connectedCells.has(`${x},${y}`)) {
        poweredCells.add(`${x},${y}`);
      }
    }
  }

  const connectedConsumers: Array<{
    x: number;
    y: number;
    consumption: number;
    wiresUsed: string[];
  }> = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (
        (cell.type === 'house' || cell.type === 'factory') &&
        connectedCells.has(`${x},${y}`)
      ) {
        const consumerKey = `${x},${y}`;
        const nearbyWires = new Set<string>();
        for (const [wireKey, paths] of wirePaths) {
          for (const path of paths) {
            if (path.includes(consumerKey)) {
              nearbyWires.add(wireKey);
            }
          }
        }
        connectedConsumers.push({
          x,
          y,
          consumption:
            cell.type === 'house'
              ? BUILDING_STATS.house.consumption
              : BUILDING_STATS.factory.consumption,
          wiresUsed: Array.from(nearbyWires),
        });
      }
    }
  }

  connectedConsumers.sort((a, b) => a.consumption - b.consumption);

  let remainingPower = totalAvailable;
  for (const consumer of connectedConsumers) {
    let effectiveConsumption = consumer.consumption;
    for (const wireKey of consumer.wiresUsed) {
      const eff = wireEfficiencies.get(wireKey) ?? 1.0;
      if (eff < 1.0) {
        effectiveConsumption = effectiveConsumption / eff;
      }
    }
    effectiveConsumption = Math.round(effectiveConsumption * 100) / 100;

    if (remainingPower >= effectiveConsumption) {
      remainingPower -= effectiveConsumption;
      poweredCells.add(`${consumer.x},${consumer.y}`);

      for (const wireKey of consumer.wiresUsed) {
        const currentLoad = wireLoads.get(wireKey) ?? 0;
        const wireLoadContribution = consumer.consumption / Math.max(1, consumer.wiresUsed.length);
        wireLoads.set(wireKey, currentLoad + wireLoadContribution);
      }
    }
  }

  for (const [wireKey, load] of wireLoads) {
    const [wx, wy] = wireKey.split(',').map(Number);
    const wireCell = grid[wy][wx];
    const maxCap = wireCell.wireData?.maxCapacity ?? WIRE_BASE_MAX_CAPACITY;
    const genShare = totalGeneration > 0 ? (totalGeneration / Math.max(1, wirePaths.size)) * 0.3 : 0;
    wireLoads.set(wireKey, Math.min(maxCap, Math.round((load + genShare) * 100) / 100));
  }

  return { poweredCells, totalGeneration, totalConsumption, batteryCapacity, wireLoads };
}

export function countPoweredBuildings(
  grid: GridCell[][],
  poweredCells: Set<string>
): { houses: number; poweredHouses: number; factories: number; poweredFactories: number } {
  let houses = 0;
  let poweredHouses = 0;
  let factories = 0;
  let poweredFactories = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.type === 'house') {
        houses++;
        if (poweredCells.has(`${x},${y}`)) poweredHouses++;
      }
      if (cell.type === 'factory') {
        factories++;
        if (poweredCells.has(`${x},${y}`)) poweredFactories++;
      }
    }
  }

  return { houses, poweredHouses, factories, poweredFactories };
}
