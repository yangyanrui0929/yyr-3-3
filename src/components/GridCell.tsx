import React from 'react';
import { GridCell as GridCellType, ToolType, WIRE_PERSONALITY_INFO } from '../utils/constants';
import { Building } from './Building';

interface GridCellProps {
  cell: GridCellType;
  selectedTool: ToolType;
  isSelected: boolean;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
}

export const GridCellComponent: React.FC<GridCellProps> = ({
  cell,
  selectedTool,
  isSelected,
  onClick,
  onRightClick,
}) => {
  const isEmpty = cell.type === 'empty';
  const canPlace = isEmpty && selectedTool !== 'remove';
  const canRemove = !isEmpty && selectedTool === 'remove';
  const canRepair = cell.faulty;

  const getWireStyles = () => {
    if (cell.type !== 'wire') return {};
    const personality = cell.wireData?.personality ?? 'normal';
    const info = WIRE_PERSONALITY_INFO[personality];
    const load = cell.wireData?.currentLoad ?? 0;
    const maxCap = cell.wireData?.maxCapacity ?? 10;
    const loadRatio = Math.min(1, load / maxCap);

    return {
      borderColor: info.color,
      boxShadow: cell.powered && !cell.faulty
        ? `0 0 ${4 + loadRatio * 8}px ${info.color}80, inset 0 0 ${2 + loadRatio * 4}px ${info.color}40`
        : 'none',
      background: cell.powered && !cell.faulty
        ? `${info.color}25`
        : undefined,
    };
  };

  const wireStyles = getWireStyles();
  const personalityEmoji = cell.type === 'wire' && cell.wireData?.personality && cell.wireData.personality !== 'normal'
    ? WIRE_PERSONALITY_INFO[cell.wireData.personality].emoji
    : null;

  return (
    <div
      onClick={onClick}
      onContextMenu={onRightClick}
      className={`
        relative w-14 h-14 border border-green-600/30 cursor-pointer
        transition-all duration-150 select-none
        ${isEmpty ? 'bg-green-400/40 hover:bg-green-300/60' : 'bg-green-500/50'}
        ${canPlace ? 'hover:ring-2 hover:ring-blue-400 hover:ring-inset' : ''}
        ${canRemove ? 'hover:ring-2 hover:ring-red-400 hover:ring-inset' : ''}
        ${canRepair ? 'ring-2 ring-orange-400 ring-inset animate-pulse' : ''}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-green-500 z-20 scale-105' : ''}
        ${cell.powered && !cell.faulty && cell.type !== 'wire' ? 'bg-green-400/60' : ''}
      `}
      style={{
        borderRadius: '4px',
        ...wireStyles,
      }}
    >
      <Building cell={cell} />
      {personalityEmoji && !cell.faulty && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/90 shadow flex items-center justify-center text-xs border border-gray-200 z-10">
          {personalityEmoji}
        </div>
      )}
      {cell.type === 'wire' && cell.wireData && !cell.faulty && cell.powered && (
        <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (cell.wireData.currentLoad / cell.wireData.maxCapacity) * 100)}%`,
              backgroundColor: WIRE_PERSONALITY_INFO[cell.wireData.personality].color,
            }}
          />
        </div>
      )}
      {canRepair && (
        <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20 z-10">
          <span className="text-xs font-bold text-white drop-shadow-lg">🔧维修</span>
        </div>
      )}
    </div>
  );
};
