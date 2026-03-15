"use client";

import type { OptionRecord } from "@/lib/types";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface Props {
  data: OptionRecord[];
  exercisePrice: number;
}

export default function IVSmileChart({ data, exercisePrice }: Props) {
  const calls = data
    .filter((d) => d.type === "C" && d.markIV > 0)
    .map((d) => ({
      strike: d.strike,
      iv: +(d.markIV * 100).toFixed(1),
      symbol: d.symbol,
      volume: d.volume,
    }))
    .sort((a, b) => a.strike - b.strike);

  const puts = data
    .filter((d) => d.type === "P" && d.markIV > 0)
    .map((d) => ({
      strike: d.strike,
      iv: +(d.markIV * 100).toFixed(1),
      symbol: d.symbol,
      volume: d.volume,
    }))
    .sort((a, b) => a.strike - b.strike);

  if (calls.length === 0 && puts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        当前选择暂无 IV 数据
      </div>
    );
  }

  return (
    <div className="p-4 h-[calc(100vh-180px)]">
      <h3 className="text-base font-bold text-foreground/80 mb-4 tracking-wide">
        隐含波动率微笑 / 偏斜
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" />
          <XAxis
            dataKey="strike"
            name="Strike"
            type="number"
            tick={{ fill: "#6b7280", fontSize: 13 }}
            tickFormatter={(v) => v.toLocaleString()}
            label={{
              value: "行权价",
              position: "bottom",
              fill: "#6b7280",
              fontSize: 13,
            }}
          />
          <YAxis
            dataKey="iv"
            name="IV %"
            type="number"
            tick={{ fill: "#6b7280", fontSize: 13 }}
            tickFormatter={(v) => v + "%"}
            label={{
              value: "IV %",
              angle: -90,
              position: "insideLeft",
              fill: "#6b7280",
              fontSize: 13,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#141820",
              border: "1px solid #1e2330",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, name: any) => [
              name === "iv" ? value + "%" : String(value),
              name === "iv" ? "IV" : "行权价",
            ]) as any}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#6b7280" }}
          />
          {exercisePrice > 0 && (
            <ReferenceLine
              x={exercisePrice}
              stroke="#2563eb"
              strokeDasharray="5 5"
              label={{
              value: "现货",
                fill: "#2563eb",
                fontSize: 11,
                position: "top",
              }}
            />
          )}
          <Scatter
            name="看涨 IV"
            data={calls}
            fill="#10b981"
            fillOpacity={0.7}
            r={4}
          />
          <Scatter
            name="看跌 IV"
            data={puts}
            fill="#ef4444"
            fillOpacity={0.7}
            r={4}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
