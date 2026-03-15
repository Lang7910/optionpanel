"""
OKX Options API V5 client.
Fetches instruments, tickers, mark-price, and index price from public endpoints.
"""

import httpx
from typing import Any

BASE_URL = "https://www.okx.com"

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15.0)
    return _client


def _extract(resp_json: dict) -> list[dict[str, Any]]:
    """Extract data array from OKX V5 response wrapper."""
    if resp_json.get("code") != "0":
        raise ValueError(f"OKX API error: {resp_json.get('msg', 'unknown')}")
    return resp_json.get("data", [])


async def fetch_instruments(uly: str) -> list[dict[str, Any]]:
    """GET /api/v5/public/instruments — option contract specs."""
    client = _get_client()
    resp = await client.get(
        f"{BASE_URL}/api/v5/public/instruments",
        params={"instType": "OPTION", "uly": f"{uly}-USD"},
    )
    resp.raise_for_status()
    return _extract(resp.json())


async def fetch_tickers(uly: str) -> list[dict[str, Any]]:
    """GET /api/v5/market/tickers — bid/ask, 24h volume."""
    client = _get_client()
    resp = await client.get(
        f"{BASE_URL}/api/v5/market/tickers",
        params={"instType": "OPTION", "uly": f"{uly}-USD"},
    )
    resp.raise_for_status()
    return _extract(resp.json())


async def fetch_mark_price(uly: str) -> list[dict[str, Any]]:
    """GET /api/v5/public/mark-price — mark price + Greeks + IV."""
    client = _get_client()
    resp = await client.get(
        f"{BASE_URL}/api/v5/public/mark-price",
        params={"instType": "OPTION", "uly": f"{uly}-USD"},
    )
    resp.raise_for_status()
    return _extract(resp.json())


async def fetch_index_price(uly: str) -> float:
    """GET /api/v5/market/index-tickers — live index price for USD conversion."""
    client = _get_client()
    resp = await client.get(
        f"{BASE_URL}/api/v5/market/index-tickers",
        params={"instId": f"{uly}-USD"},
    )
    resp.raise_for_status()
    data = _extract(resp.json())
    if data:
        return float(data[0].get("idxPx", 0))
    return 0.0
