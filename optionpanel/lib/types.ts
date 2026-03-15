export interface OptionRecord {
  symbol: string;
  underlying: string;
  expiry: string;
  expiryDate: string;
  strike: number;
  type: "C" | "P";
  bid: number;
  ask: number;
  markPrice: number;
  lastPrice: number;
  volume: number;
  amount: number;
  tradeCount: number;
  exercisePrice: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  markIV: number;
  bidIV: number;
  askIV: number;
  dte: number;
  spreadPct: number;
  thetaRatio: number;
  moneyness: "ITM" | "OTM" | "ATM" | "";
  highPriceLimit: number;
  lowPriceLimit: number;
  exchange?: string;
}

export interface ChainRow {
  strike: number;
  call: OptionRecord | null;
  put: OptionRecord | null;
}

export interface ChainResponse {
  chain: ChainRow[];
  exercisePrice: number;
  atmStrike: number;
  lastUpdated: string;
}

export interface UnderlyingsResponse {
  underlyings: string[];
  lastUpdated: string;
}

export interface ExpiriesResponse {
  expiries: string[];
  lastUpdated: string;
}

export interface SnapshotResponse {
  data: OptionRecord[];
  exercisePrice: number;
  lastUpdated: string;
}

export interface Filters {
  minOI: number;
  minVolume: number;
  maxSpreadPct: number;
  deltaMin: number;
  deltaMax: number;
  hideDeepOTM: boolean;
}
