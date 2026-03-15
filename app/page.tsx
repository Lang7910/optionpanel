"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChainRow, Filters, OptionRecord } from "@/lib/types";
import { getUnderlyings, getExpiries, getChain, getSnapshot } from "@/lib/api";
import OptionChain from "@/components/OptionChain";
import FilterPanel from "@/components/FilterPanel";
import IVSmileChart from "@/components/IVSmileChart";
import SpreadChart from "@/components/SpreadChart";
import {
  RefreshCw,
  Activity,
  TrendingUp,
  BarChart3,
  Filter,
} from "lucide-react";

export default function Home() {
  const [exchange, setExchange] = useState("binance");
  const [underlyings, setUnderlyings] = useState<string[]>([]);
  const [selectedUnderlying, setSelectedUnderlying] = useState("BTC");
  const [expiries, setExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [chain, setChain] = useState<ChainRow[]>([]);
  const [exercisePrice, setExercisePrice] = useState(0);
  const [atmStrike, setAtmStrike] = useState(0);
  const [snapshot, setSnapshot] = useState<OptionRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chain" | "iv" | "spread">(
    "chain"
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    minOI: 0,
    minVolume: 0,
    maxSpreadPct: 999,
    deltaMin: -1,
    deltaMax: 1,
    hideDeepOTM: false,
  });

  // Load underlyings on mount
  useEffect(() => {
    setChain([]);
    setSelectedExpiry("");
    getUnderlyings(exchange)
      .then((res) => {
        setUnderlyings(res.underlyings);
        if (res.underlyings.length > 0) {
          const defaultUly = res.underlyings.includes("BTC") ? "BTC" : res.underlyings[0];
          setSelectedUnderlying(defaultUly);
        }
      })
      .catch(console.error);
  }, [exchange]);

  // Load expiries when underlying changes
  useEffect(() => {
    if (!selectedUnderlying) return;
    getExpiries(selectedUnderlying, exchange)
      .then((res) => {
        setExpiries(res.expiries);
        if (res.expiries.length > 0) {
          setSelectedExpiry(res.expiries[0]);
        }
      })
      .catch(console.error);
  }, [selectedUnderlying, exchange]);

  // Load chain + snapshot data
  const loadData = useCallback(async () => {
    if (!selectedUnderlying || !selectedExpiry) return;
    try {
      setLoading(true);
      const [chainRes, snapRes] = await Promise.all([
        getChain(selectedUnderlying, selectedExpiry, exchange),
        getSnapshot(selectedUnderlying, exchange),
      ]);
      setChain(chainRes.chain);
      setExercisePrice(chainRes.exercisePrice);
      setAtmStrike(chainRes.atmStrike);
      setSnapshot(snapRes.data.filter((d) => d.expiry === selectedExpiry));
      setLastUpdated(chainRes.lastUpdated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedUnderlying, selectedExpiry, exchange]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Apply filters to chain
  const filteredChain = chain.filter((row) => {
    const check = (opt: OptionRecord | null) => {
      if (!opt) return false;
      if (opt.volume < filters.minVolume) return false;
      if (filters.maxSpreadPct < 999 && opt.spreadPct > filters.maxSpreadPct)
        return false;
      if (opt.delta < filters.deltaMin || opt.delta > filters.deltaMax)
        return false;
      if (
        filters.hideDeepOTM &&
        opt.moneyness === "OTM" &&
        exercisePrice > 0
      ) {
        const pctAway =
          Math.abs(opt.strike - exercisePrice) / exercisePrice;
        if (pctAway > 0.5) return false;
      }
      return true;
    };
    return check(row.call) || check(row.put);
  });

  // Format expiry for display
  const formatExpiry = (exp: string) => {
    if (exp.length !== 6) return exp;
    return `20${exp.slice(0, 2)}-${exp.slice(2, 4)}-${exp.slice(4, 6)}`;
  };

  const formatTime = (iso: string) => {
    if (!iso) return "--";
    const d = new Date(iso);
    return d.toLocaleTimeString();
  };

  const tabs = [
    { key: "chain" as const, label: "期权链", icon: BarChart3 },
    { key: "iv" as const, label: "IV 微笑", icon: TrendingUp },
    { key: "spread" as const, label: "价差分布", icon: Activity },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <BarChart3 size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              期权
              <span className="text-accent ml-1">看板</span>
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Exchange selector */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setExchange("binance")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  exchange === "binance"
                    ? "bg-[#F0B90B] text-black"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Binance
              </button>
              <button
                onClick={() => setExchange("okx")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  exchange === "okx"
                    ? "bg-white text-black"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                OKX
              </button>
            </div>

            {/* Underlying selector */}
            <select
              value={selectedUnderlying}
              onChange={(e) => setSelectedUnderlying(e.target.value)}
              className="bg-muted border border-border rounded-lg px-4 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {underlyings.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {/* Expiry selector */}
            <select
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-muted border border-border rounded-lg px-4 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {expiries.map((exp) => (
                <option key={exp} value={exp}>
                  {formatExpiry(exp)}
                </option>
              ))}
            </select>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-lg border transition-colors ${
                showFilters
                  ? "bg-accent border-accent text-white"
                  : "bg-muted border-border hover:border-accent/50"
              }`}
              title="筛选过滤"
            >
              <Filter size={16} />
            </button>

            {/* Refresh indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              <span>{formatTime(lastUpdated)}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1920px] mx-auto px-5 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex max-w-[1920px] mx-auto w-full">
        {/* Filter panel */}
        {showFilters && (
          <aside className="w-72 border-r border-border p-5 bg-card/60 shrink-0">
            <FilterPanel filters={filters} onChange={setFilters} />
          </aside>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {loading && chain.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw
                  size={32}
                  className="animate-spin text-accent mx-auto mb-3"
                />
                <p className="text-muted-foreground">正在加载行情数据...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="px-5 py-3 border-b border-border bg-card/40 flex items-center gap-8 text-sm">
                <span className="text-muted-foreground">
                  现货价:{" "}
                  <span className="text-foreground font-mono font-bold">
                    ${exercisePrice.toLocaleString()}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  平值行权价:{" "}
                  <span className="text-foreground font-mono font-bold">
                    ${atmStrike.toLocaleString()}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  合约数:{" "}
                  <span className="text-foreground font-mono">
                    {filteredChain.length}
                  </span>
                </span>
                {chain.length > 0 && (
                  <span className="text-muted-foreground">
                    到期天数:{" "}
                    <span className="text-foreground font-mono">
                      {chain[0]?.call?.dte ?? chain[0]?.put?.dte ?? "?"}天
                    </span>
                  </span>
                )}
              </div>

              {activeTab === "chain" && (
                <OptionChain
                  chain={filteredChain}
                  atmStrike={atmStrike}
                  exercisePrice={exercisePrice}
                />
              )}
              {activeTab === "iv" && (
                <IVSmileChart
                  data={snapshot}
                  exercisePrice={exercisePrice}
                />
              )}
              {activeTab === "spread" && (
                <SpreadChart
                  data={snapshot}
                  exercisePrice={exercisePrice}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
