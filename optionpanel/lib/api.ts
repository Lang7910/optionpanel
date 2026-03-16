import type {
  ChainResponse,
  UnderlyingsResponse,
  ExpiriesResponse,
  SnapshotResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function buildApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getUnderlyings(
  exchange: string = "binance"
): Promise<UnderlyingsResponse> {
  return fetchJson<UnderlyingsResponse>(
    buildApiUrl(`/api/options/underlyings?exchange=${exchange}`)
  );
}

export async function getExpiries(
  underlying: string,
  exchange: string = "binance"
): Promise<ExpiriesResponse> {
  return fetchJson<ExpiriesResponse>(
    buildApiUrl(
      `/api/options/expiries?underlying=${underlying}&exchange=${exchange}`
    )
  );
}

export async function getChain(
  underlying: string,
  expiry: string,
  exchange: string = "binance"
): Promise<ChainResponse> {
  return fetchJson<ChainResponse>(
    buildApiUrl(
      `/api/options/chain?underlying=${underlying}&expiry=${expiry}&exchange=${exchange}`
    )
  );
}

export async function getSnapshot(
  underlying?: string,
  exchange: string = "binance"
): Promise<SnapshotResponse> {
  const params = new URLSearchParams({ exchange });
  if (underlying) params.set("underlying", underlying);
  return fetchJson<SnapshotResponse>(
    buildApiUrl(`/api/options/snapshot?${params.toString()}`)
  );
}
