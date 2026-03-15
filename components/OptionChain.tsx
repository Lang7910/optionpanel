"use client";

import type { ChainRow, OptionRecord } from "@/lib/types";
import { useMemo, useRef, useEffect } from "react";

interface Props {
  chain: ChainRow[];
  atmStrike: number;
  exercisePrice: number;
}

function formatNum(n: number | undefined, decimals = 2): string {
  if (n === undefined || n === null) return "-";
  if (n === 0) return "-";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
  return n.toFixed(decimals);
}

function formatGreek(n: number | undefined): string {
  if (n === undefined || n === null || n === 0) return "-";
  return n.toFixed(4);
}

function formatIV(n: number | undefined): string {
  if (n === undefined || n === null || n === 0) return "-";
  return (n * 100).toFixed(1) + "%";
}

function spreadColor(pct: number): string {
  if (pct <= 0) return "";
  if (pct < 2) return "text-positive";
  if (pct < 5) return "text-yellow-400";
  if (pct < 15) return "text-orange-400";
  return "text-negative";
}

function CallCell({ opt, field }: { opt: OptionRecord | null; field: string }) {
  if (!opt) return <td className="call-side text-muted-foreground">-</td>;

  let val = "-";
  let cls = "call-side";

  switch (field) {
    case "volume":
      val = formatNum(opt.volume, 2);
      break;
    case "oi":
      val = formatNum(opt.tradeCount, 0);
      break;
    case "bid":
      val = formatNum(opt.bid);
      cls += " text-call";
      break;
    case "ask":
      val = formatNum(opt.ask);
      break;
    case "mark":
      val = formatNum(opt.markPrice);
      cls += " font-bold";
      break;
    case "iv":
      val = formatIV(opt.markIV);
      cls += " text-blue-400";
      break;
    case "delta":
      val = formatGreek(opt.delta);
      break;
    case "gamma":
      val = formatGreek(opt.gamma);
      break;
    case "theta":
      val = formatGreek(opt.theta);
      cls += opt.theta < 0 ? " text-negative" : "";
      break;
    case "vega":
      val = formatGreek(opt.vega);
      break;
    case "spread":
      val = opt.spreadPct > 0 ? opt.spreadPct.toFixed(1) + "%" : "-";
      cls += " " + spreadColor(opt.spreadPct);
      break;
    default:
      break;
  }

  return <td className={cls}>{val}</td>;
}

function PutCell({ opt, field }: { opt: OptionRecord | null; field: string }) {
  if (!opt) return <td className="put-side text-muted-foreground">-</td>;

  let val = "-";
  let cls = "put-side";

  switch (field) {
    case "spread":
      val = opt.spreadPct > 0 ? opt.spreadPct.toFixed(1) + "%" : "-";
      cls += " " + spreadColor(opt.spreadPct);
      break;
    case "iv":
      val = formatIV(opt.markIV);
      cls += " text-blue-400";
      break;
    case "delta":
      val = formatGreek(opt.delta);
      break;
    case "gamma":
      val = formatGreek(opt.gamma);
      break;
    case "theta":
      val = formatGreek(opt.theta);
      cls += opt.theta < 0 ? " text-negative" : "";
      break;
    case "vega":
      val = formatGreek(opt.vega);
      break;
    case "mark":
      val = formatNum(opt.markPrice);
      cls += " font-bold";
      break;
    case "bid":
      val = formatNum(opt.bid);
      break;
    case "ask":
      val = formatNum(opt.ask);
      cls += " text-put";
      break;
    case "volume":
      val = formatNum(opt.volume, 2);
      break;
    case "oi":
      val = formatNum(opt.tradeCount, 0);
      break;
    default:
      break;
  }

  return <td className={cls}>{val}</td>;
}

const callFields = ["volume", "oi", "spread", "vega", "theta", "gamma", "delta", "iv", "mark", "ask", "bid"];
const putFields = ["bid", "ask", "mark", "iv", "delta", "gamma", "theta", "vega", "spread", "oi", "volume"];

export default function OptionChain({ chain, atmStrike, exercisePrice }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to ATM on mount
  useEffect(() => {
    if (!tableRef.current || !atmStrike) return;
    const atmRow = tableRef.current.querySelector(`[data-strike="${atmStrike}"]`);
    if (atmRow) {
      atmRow.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [atmStrike, chain]);

  if (chain.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        当前选择暂无数据
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-auto h-[calc(100vh-180px)]">
      <table className="option-table">
        <thead>
          <tr>
            {/* Call headers  (reversed so bid/ask are near strike) */}
            <th className="call-side">成交量</th>
            <th className="call-side">笔数</th>
            <th className="call-side">价差</th>
            <th className="call-side">Vega</th>
            <th className="call-side">Theta</th>
            <th className="call-side">Gamma</th>
            <th className="call-side">Delta</th>
            <th className="call-side">IV</th>
            <th className="call-side">标记价</th>
            <th className="call-side">卖一</th>
            <th className="call-side text-call font-bold">买一</th>
            {/* Strike */}
            <th className="strike-col bg-accent/20 text-accent">行权价</th>
            {/* Put headers */}
            <th className="put-side text-put font-bold">买一</th>
            <th className="put-side">卖一</th>
            <th className="put-side">标记价</th>
            <th className="put-side">IV</th>
            <th className="put-side">Delta</th>
            <th className="put-side">Gamma</th>
            <th className="put-side">Theta</th>
            <th className="put-side">Vega</th>
            <th className="put-side">价差</th>
            <th className="put-side">笔数</th>
            <th className="put-side">成交量</th>
          </tr>
        </thead>
        <tbody>
          {chain.map((row) => {
            const isAtm = row.strike === atmStrike;
            return (
              <tr
                key={row.strike}
                data-strike={row.strike}
                className={isAtm ? "atm-row" : ""}
              >
                {callFields.map((f) => (
                  <CallCell key={`c-${f}`} opt={row.call} field={f} />
                ))}
                <td className="strike-col">
                  {row.strike.toLocaleString()}
                  {isAtm && (
                    <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </td>
                {putFields.map((f) => (
                  <PutCell key={`p-${f}`} opt={row.put} field={f} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
