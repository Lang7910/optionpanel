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
  Cell,
} from "recharts";

interface Props {
  data: OptionRecord[];
  exercisePrice: number;
}

function getSpreadColor(pct: number): string {
  if (pct < 2) return "#10b981";
  if (pct < 5) return "#facc15";
  if (pct < 15) return "#f97316";
  return "#ef4444";
}

export default function SpreadChart({ data, exercisePrice }: Props) {
  const calls = data
    .filter((d) => d.type === "C" && d.spreadPct > 0 && d.markPrice > 0)
    .map((d) => ({
      strike: d.strike,
      spread: d.spreadPct,
      symbol: d.symbol,
      volume: d.volume,
      type: "Call",
    }))
    .sort((a, b) => a.strike - b.strike);

  const puts = data
    .filter((d) => d.type === "P" && d.spreadPct > 0 && d.markPrice > 0)
    .map((d) => ({
      strike: d.strike,
      spread: d.spreadPct,
      symbol: d.symbol,
      volume: d.volume,
      type: "Put",
    }))
    .sort((a, b) => a.strike - b.strike);

  if (calls.length === 0 && puts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        暂无价差数据
      </div>
    );
  }

  return (
    <div className="p-4 h-[calc(100vh-180px)]">
      <h3 className="text-base font-bold text-foreground/80 mb-2 tracking-wide">
        买卖价差率 % — 按行权价分布
      </h3>
      <p className="text-sm text-foreground/60 mb-4">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-positive mr-1.5" />
        {"<2%"}
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 ml-4 mr-1.5" />
        {"2-5%"}
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 ml-4 mr-1.5" />
        {"5-15%"}
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-negative ml-4 mr-1.5" />
        {">15%"}
      </p>
      <ResponsiveContainer width="100%" height="85%">
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
            dataKey="spread"
            name="Spread %"
            type="number"
            tick={{ fill: "#6b7280", fontSize: 13 }}
            tickFormatter={(v) => v + "%"}
            label={{
              value: "价差率 %",
              angle: -90,
              position: "insideLeft",
              fill: "#6b7280",
              fontSize: 11,
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
              name === "spread" ? Number(value).toFixed(1) + "%" : String(value),
              name === "spread" ? "价差率" : "行权价",
            ]) as any}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
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
          <Scatter name="看涨价差" data={calls} shape="circle">
            {calls.map((entry, i) => (
              <Cell
                key={`c-${i}`}
                fill={getSpreadColor(entry.spread)}
                fillOpacity={0.8}
                r={5}
              />
            ))}
          </Scatter>
          <Scatter name="看跌价差" data={puts} shape="diamond">
            {puts.map((entry, i) => (
              <Cell
                key={`p-${i}`}
                fill={getSpreadColor(entry.spread)}
                fillOpacity={0.6}
                r={5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
