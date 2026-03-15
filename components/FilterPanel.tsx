"use client";

import type { Filters } from "@/lib/types";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function FilterPanel({ filters, onChange }: Props) {
  const update = (partial: Partial<Filters>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold tracking-wide text-foreground">
        筛选条件
      </h3>

      {/* Min Volume */}
      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          最小24h交易量
          <span className="float-right font-mono text-foreground">
            {filters.minVolume}
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={filters.minVolume}
          onChange={(e) => update({ minVolume: Number(e.target.value) })}
        />
      </div>

      {/* Max Spread % */}
      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          最大买卖价差 %
          <span className="float-right font-mono text-foreground">
            {filters.maxSpreadPct >= 999 ? "∞" : filters.maxSpreadPct + "%"}
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.min(filters.maxSpreadPct, 100)}
          onChange={(e) => {
            const v = Number(e.target.value);
            update({ maxSpreadPct: v >= 100 ? 999 : v });
          }}
        />
      </div>

      {/* Delta Min */}
      <div>
        <label className="block text-sm text-foreground/70 mb-1.5">
          Delta 范围
          <span className="float-right font-mono text-foreground">
            [{filters.deltaMin.toFixed(2)}, {filters.deltaMax.toFixed(2)}]
          </span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={filters.deltaMin}
            onChange={(e) => update({ deltaMin: Number(e.target.value) })}
            className="flex-1"
          />
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={filters.deltaMax}
            onChange={(e) => update({ deltaMax: Number(e.target.value) })}
            className="flex-1"
          />
        </div>
      </div>

      {/* Hide Deep OTM */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hideDeepOTM"
          checked={filters.hideDeepOTM}
          onChange={(e) => update({ hideDeepOTM: e.target.checked })}
          className="w-4 h-4 rounded border-border bg-muted accent-accent"
        />
        <label htmlFor="hideDeepOTM" className="text-sm text-foreground/70">
          隐藏深度虚值（偏离现货{">"}50%）
        </label>
      </div>

      {/* Reset */}
      <button
        onClick={() =>
          onChange({
            minOI: 0,
            minVolume: 0,
            maxSpreadPct: 999,
            deltaMin: -1,
            deltaMax: 1,
            hideDeepOTM: false,
          })
        }
        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-border bg-muted hover:bg-border transition-colors text-foreground"
      >
        重置筛选
      </button>
    </div>
  );
}
