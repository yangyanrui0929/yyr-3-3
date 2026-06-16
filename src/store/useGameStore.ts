import { create } from 'zustand';
import {
  GridCell,
  ToolType,
  GRID_SIZE,
  DAY_LENGTH,
  FAULT_CHANCE,
  DAY_THRESHOLD,
} from '../utils/constants';
import { calculatePowerNetwork, countPoweredBuildings } from '../utils/powerCalculator';
import { createInitialWireData, evolveWire, getFaultChance } from '../utils/wirePersonality';

const STORAGE_KEY = 'floating-island-grid-game-save';

interface PersistedState {
  grid: GridCell[][];
  dayTime: number;
  storedPower: number;
  satisfaction: number;
}

interface GameState {
  grid: GridCell[][];
  dayTime: number;
  storedPower: number;
  maxStorage: number;
  satisfaction: number;
  selectedTool: ToolType;
  poweredCells: Set<string>;
  totalGeneration: number;
  totalConsumption: number;
  showSettlement: boolean;
  selectedWire: { x: number; y: number } | null;
  setSelectedTool: (tool: ToolType) => void;
  placeOrRemove: (x: number, y: number) => void;
  rotateCell: (x: number, y: number) => void;
  repairCell: (x: number, y: number) => void;
  tick: () => void;
  resetGame: () => void;
  openSettlement: () => void;
  closeSettlement: () => void;
  selectWire: (x: number, y: number) => void;
  deselectWire: () => void;
}

function createEmptyGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        x,
        y,
        type: 'empty',
        rotation: 0,
        powered: false,
        faulty: false,
      });
    }
    grid.push(row);
  }
  return grid;
}

function saveToLocalStorage(state: PersistedState): void {
  try {
    const data = JSON.stringify({
      grid: state.grid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // ignore storage errors
  }
}

function loadFromLocalStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.grid && Array.isArray(data.grid)) {
      for (let y = 0; y < data.grid.length; y++) {
        for (let x = 0; x < data.grid[y].length; x++) {
          const cell = data.grid[y][x];
          if (cell.type === 'wire' && !cell.wireData) {
            cell.wireData = createInitialWireData();
          }
        }
      }
      return {
        grid: data.grid,
        dayTime: data.dayTime ?? 20,
        storedPower: data.storedPower ?? 10,
        satisfaction: data.satisfaction ?? 50,
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

let tickCounter = 0;

function recalcGrid(grid: GridCell[][], dayTime: number, storedPower: number) {
  const { poweredCells, totalGeneration, totalConsumption, batteryCapacity, wireLoads } =
    calculatePowerNetwork(grid, dayTime, storedPower);

  const newGrid = grid.map((row) => row.map((c) => ({ ...c })));
  for (let yy = 0; yy < GRID_SIZE; yy++) {
    for (let xx = 0; xx < GRID_SIZE; xx++) {
      newGrid[yy][xx].powered = poweredCells.has(`${xx},${yy}`);
      if (newGrid[yy][xx].type === 'wire') {
        const load = wireLoads.get(`${xx},${yy}`) ?? 0;
        if (newGrid[yy][xx].wireData) {
          newGrid[yy][xx].wireData = {
            ...newGrid[yy][xx].wireData!,
            currentLoad: load,
          };
        }
      }
    }
  }

  return { newGrid, poweredCells, totalGeneration, totalConsumption, batteryCapacity, wireLoads };
}

function initGame(): Omit<GameState, keyof GameStateActions> {
  const saved = loadFromLocalStorage();
  const grid = saved ? saved.grid : createEmptyGrid();
  const dayTime = saved ? saved.dayTime : 20;
  const storedPower = saved ? saved.storedPower : 10;
  const satisfaction = saved ? saved.satisfaction : 50;

  const { newGrid, poweredCells, totalGeneration, totalConsumption, batteryCapacity } =
    recalcGrid(grid, dayTime, storedPower);

  return {
    grid: newGrid,
    dayTime,
    storedPower,
    maxStorage: batteryCapacity,
    satisfaction,
    selectedTool: 'windmill',
    poweredCells,
    totalGeneration,
    totalConsumption,
    showSettlement: false,
    selectedWire: null,
  };
}

type GameStateActions = Pick<
  GameState,
  | 'setSelectedTool'
  | 'placeOrRemove'
  | 'rotateCell'
  | 'repairCell'
  | 'tick'
  | 'resetGame'
  | 'openSettlement'
  | 'closeSettlement'
  | 'selectWire'
  | 'deselectWire'
>;

export const useGameStore = create<GameState>((set, get) => ({
  ...initGame(),

  setSelectedTool: (tool) => set({ selectedTool: tool, selectedWire: null }),

  selectWire: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (cell.type === 'wire') {
      set({ selectedWire: { x, y } });
    }
  },

  deselectWire: () => set({ selectedWire: null }),

  placeOrRemove: (x, y) => {
    const state = get();
    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    const cell = newGrid[y][x];
    const tool = state.selectedTool;

    if (tool === 'remove') {
      if (cell.type !== 'empty') {
        newGrid[y][x] = {
          ...cell,
          type: 'empty',
          rotation: 0,
          powered: false,
          faulty: false,
          wireData: undefined,
        };
      }
    } else {
      newGrid[y][x] = {
        ...cell,
        type: tool,
        rotation: tool === 'wire' ? cell.rotation % 6 : 0,
        powered: false,
        faulty: false,
        wireData: tool === 'wire' ? (cell.wireData ?? createInitialWireData()) : undefined,
      };
    }

    const result = recalcGrid(newGrid, state.dayTime, state.storedPower);

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
      selectedWire: null,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });

    set(nextState);
  },

  rotateCell: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (cell.type !== 'wire') return;

    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    newGrid[y][x].rotation = (cell.rotation + 1) % 6;

    const result = recalcGrid(newGrid, state.dayTime, state.storedPower);

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });

    set(nextState);
  },

  repairCell: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (!cell.faulty) return;

    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    newGrid[y][x].faulty = false;

    const result = recalcGrid(newGrid, state.dayTime, state.storedPower);

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });

    set(nextState);
  },

  tick: () => {
    tickCounter++;
    const state = get();
    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = newGrid[y][x];
        if (cell.type !== 'empty' && !cell.faulty) {
          let chance = FAULT_CHANCE;
          if (cell.type === 'wire' && cell.wireData) {
            chance = getFaultChance(cell.wireData, FAULT_CHANCE);
          }
          if (Math.random() < chance) {
            newGrid[y][x].faulty = true;
          }
        }
      }
    }

    const newDayTime = (state.dayTime + 0.5) % DAY_LENGTH;

    const { poweredCells, totalGeneration, totalConsumption, batteryCapacity, wireLoads } =
      calculatePowerNetwork(newGrid, newDayTime, state.storedPower);

    for (let yy = 0; yy < GRID_SIZE; yy++) {
      for (let xx = 0; xx < GRID_SIZE; xx++) {
        newGrid[yy][xx].powered = poweredCells.has(`${xx},${yy}`);
        if (newGrid[yy][xx].type === 'wire' && newGrid[yy][xx].wireData) {
          const load = wireLoads.get(`${xx},${yy}`) ?? 0;
          newGrid[yy][xx].wireData = evolveWire(
            newGrid[yy][xx].wireData!,
            load,
            tickCounter
          );
        }
      }
    }

    const netPower = totalGeneration - totalConsumption;
    let newStoredPower = state.storedPower;
    const isDay = newDayTime < DAY_THRESHOLD;

    if (batteryCapacity > 0) {
      if (netPower > 0) {
        newStoredPower = Math.min(batteryCapacity, state.storedPower + netPower * 0.3);
      } else if (netPower < 0 && !isDay) {
        const deficit = -netPower;
        const discharge = Math.min(state.storedPower, deficit * 0.5);
        newStoredPower = Math.max(0, state.storedPower - discharge);
      }
    }

    const { houses, poweredHouses, factories, poweredFactories } = countPoweredBuildings(
      newGrid,
      poweredCells
    );
    const totalBuildings = houses + factories;
    const totalPowered = poweredHouses + poweredFactories;
    const coverage = totalBuildings > 0 ? totalPowered / totalBuildings : 1;

    let newSatisfaction = state.satisfaction;
    if (coverage >= 0.8) {
      newSatisfaction = Math.min(100, state.satisfaction + 0.2);
    } else if (coverage >= 0.5) {
      newSatisfaction = Math.min(100, state.satisfaction + 0.05);
    } else {
      newSatisfaction = Math.max(0, state.satisfaction - 0.3);
    }

    saveToLocalStorage({
      grid: newGrid,
      dayTime: newDayTime,
      storedPower: newStoredPower,
      satisfaction: newSatisfaction,
    });

    set({
      grid: newGrid,
      dayTime: newDayTime,
      storedPower: newStoredPower,
      maxStorage: batteryCapacity,
      satisfaction: newSatisfaction,
      poweredCells,
      totalGeneration,
      totalConsumption,
    });
  },

  resetGame: () => {
    localStorage.removeItem(STORAGE_KEY);
    tickCounter = 0;
    const fresh = createEmptyGrid();
    const result = recalcGrid(fresh, 20, 10);
    set({
      grid: result.newGrid,
      dayTime: 20,
      storedPower: 10,
      maxStorage: result.batteryCapacity,
      satisfaction: 50,
      selectedTool: 'windmill',
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      showSettlement: false,
      selectedWire: null,
    });
  },

  openSettlement: () => set({ showSettlement: true }),
  closeSettlement: () => set({ showSettlement: false }),
}));
