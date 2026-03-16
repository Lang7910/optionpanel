import type {
  ChainResponse,
  UnderlyingsResponse,
  ExpiriesResponse,
  SnapshotResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:7188`
    : "http://localhost:7188");

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getUnderlyings(
  exchange: string = "binance"
): Promise<UnderlyingsResponse> {
  return fetchJson<UnderlyingsResponse>(
    `${API_BASE}/api/options/underlyings?exchange=${exchange}`
  );
}

export async function getExpiries(
  underlying: string,
  exchange: string = "binance"
): Promise<ExpiriesResponse> {
  return fetchJson<ExpiriesResponse>(
    `${API_BASE}/api/options/expiries?underlying=${underlying}&exchange=${exchange}`
  );
}

export async function getChain(
  underlying: string,
  expiry: string,
  exchange: string = "binance"
): Promise<ChainResponse> {
  return fetchJson<ChainResponse>(
    `${API_BASE}/api/options/chain?underlying=${underlying}&expiry=${expiry}&exchange=${exchange}`
  );
}

export async function getSnapshot(
  underlying?: string,
  exchange: string = "binance"
): Promise<SnapshotResponse> {
  const params = new URLSearchParams({ exchange });
  if (underlying) params.set("underlying", underlying);
  return fetchJson<SnapshotResponse>(
    `${API_BASE}/api/options/snapshot?${params.toString()}`
  );
}
