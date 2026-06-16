import React, { useMemo } from 'react';
import { X, AlertTriangle, TrendingUp, Shield, Activity, Clock } from 'lucide-react';
import {
  WIRE_PERSONALITY_INFO,
  GROWTH_TREND_INFO,
  WireData,
} from '../utils/constants';
import {
  getGrowthTrend,
  getPersonalityProgress,
  calculateLoadStats,
} from '../utils/wirePersonality';

interface WireDetailPanelProps {
  x: number;
  y: number;
  wireData: WireData;
  onClose: () => void;
}

export const WireDetailPanel: React.FC<WireDetailPanelProps> = ({
  x,
  y,
  wireData,
  onClose,
}) => {
  const personalityInfo = WIRE_PERSONALITY_INFO[wireData.personality];
  const trend = getGrowthTrend(wireData);
  const trendInfo = GROWTH_TREND_INFO[trend];
  const progress = getPersonalityProgress(wireData);
  const loadStats = useMemo(() => calculateLoadStats(wireData.loadHistory), [wireData.loadHistory]);

  const loadPercent = wireData.maxCapacity > 0
    ? Math.min(100, (wireData.currentLoad / wireData.maxCapacity) * 100)
    : 0;

  const getLoadColor = (pct: number) => {
    if (pct >= 80) return 'from-red-500 to-red-600';
    if (pct >= 50) return 'from-yellow-400 to-orange-500';
    return 'from-green-400 to-emerald-500';
  };

  const getTip = () => {
    if (wireData.personality === 'aggressive') {
      return { text: '建议分流或降低此线路的负载，减少故障风险', color: 'text-orange-600 bg-orange-50' };
    }
    if (wireData.personality === 'lazy') {
      return { text: '此线路闲置过久，可接入更多建筑来活化', color: 'text-blue-600 bg-blue-50' };
    }
    if (wireData.personality === 'premium') {
      return { text: '优质线路！继续保持均衡使用，可作为主干线', color: 'text-green-600 bg-green-50' };
    }
    if (trend === 'improving') {
      return { text: '状态正在变好，继续保持当前使用方式', color: 'text-green-600 bg-green-50' };
    }
    if (loadStats.avg > 0.7) {
      return { text: '长期高负载，可能会变成暴躁线路', color: 'text-red-600 bg-red-50' };
    }
    if (loadStats.avg < 0.25 && wireData.loadHistory.length > 15) {
      return { text: '长期低负载，可能会变成惰性线路', color: 'text-slate-600 bg-slate-50' };
    }
    return { text: '正常使用中，保持负载均衡可养成优质线路', color: 'text-indigo-600 bg-indigo-50' };
  };

  const tip = getTip();
  const maxHistoryBar = 30;
  const displayHistory = wireData.loadHistory.slice(-maxHistoryBar);

  return (
    <div className="fixed right-4 top-20 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden z-50 animate-in slide-in-from-right-4 fade-in duration-300">
      <div
        className="p-4 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${personalityInfo.color}, ${personalityInfo.color}dd)` }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center text-3xl shadow-inner">
            {personalityInfo.emoji}
          </div>
          <div>
            <p className="text-xs opacity-80">位置 ({x}, {y})</p>
            <h3 className="text-xl font-bold">{personalityInfo.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs bg-white/25 px-2 py-0.5 rounded-full">{trendInfo.emoji} {trendInfo.name}</span>
            </div>
          </div>
        </div>
        <p className="text-sm mt-3 opacity-95 leading-relaxed">{personalityInfo.description}</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Activity className="w-3 h-3" /> 当前负载
            </span>
            <span className="text-sm font-bold text-gray-800">
              {wireData.currentLoad.toFixed(1)} / {wireData.maxCapacity}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getLoadColor(loadPercent)}`}
              style={{ width: `${loadPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{(wireData.efficiency * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-blue-500 font-medium">传输效率</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-purple-600">{(1 / wireData.faultResistance * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-purple-500 font-medium">故障抵抗</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{wireData.age}</div>
            <div className="text-[10px] text-amber-500 font-medium flex items-center justify-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> tick
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 性格发展进度
          </p>
          <div className="space-y-2">
            {[
              { key: 'premium', label: '✨ 优质', value: progress.premium, color: 'bg-green-500' },
              { key: 'aggressive', label: '🔥 暴躁', value: progress.aggressive, color: 'bg-red-500' },
              { key: 'lazy', label: '💤 惰性', value: progress.lazy, color: 'bg-slate-500' },
              { key: 'normal', label: '⚡ 普通', value: progress.normal, color: 'bg-yellow-500' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-700">{item.value.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            <Shield className="w-3 h-3" /> 负载历史统计
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-500">平均负载</div>
              <div className="font-bold text-gray-800 mt-0.5">{(loadStats.avg * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-500">波动程度</div>
              <div className="font-bold text-gray-800 mt-0.5">{(loadStats.variance * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <div className="text-red-500">高负载占比</div>
              <div className="font-bold text-red-600 mt-0.5">{(loadStats.highRatio * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-slate-500">低负载占比</div>
              <div className="font-bold text-slate-600 mt-0.5">{(loadStats.lowRatio * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">最近负载趋势</p>
          <div className="h-16 bg-gray-50 rounded-xl p-2 flex items-end gap-0.5">
            {displayHistory.length === 0 && (
              <div className="w-full flex items-center justify-center text-[10px] text-gray-400">
                暂无数据
              </div>
            )}
            {displayHistory.map((record, i) => {
              const height = Math.max(4, record.load * 100);
              const barColor = record.load >= 0.7
                ? 'bg-red-400'
                : record.load <= 0.25
                ? 'bg-slate-400'
                : 'bg-green-400';
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${barColor} transition-all duration-300 min-w-[2px]`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-1">
            <span>较早</span>
            <span>现在</span>
          </div>
        </div>

        <div className={`rounded-xl p-3 ${tip.color}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium leading-relaxed">{tip.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
