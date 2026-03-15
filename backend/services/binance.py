"""
Binance Options API client.
Fetches ticker, mark price/Greeks, and exchange info from public endpoints.
"""

import httpx
from typing import Any

BASE_URL = "https://eapi.binance.com"

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15.0)
    return _client


async def fetch_ticker() -> list[dict[str, Any]]:
    """GET /eapi/v1/ticker — 24h ticker for all option contracts."""
    client = _get_client()
    resp = await client.get(f"{BASE_URL}/eapi/v1/ticker")
    resp.raise_for_status()
    return resp.json()


async def fetch_mark() -> list[dict[str, Any]]:
    """GET /eapi/v1/mark — mark price + Greeks for all contracts."""
    client = _get_client()
    resp = await client.get(f"{BASE_URL}/eapi/v1/mark")
    resp.raise_for_status()
    return resp.json()


async def fetch_exchange_info() -> dict[str, Any]:
    """GET /eapi/v1/exchangeInfo — trading rules & symbol info."""
    client = _get_client()
    resp = await client.get(f"{BASE_URL}/eapi/v1/exchangeInfo")
    resp.raise_for_status()
    return resp.json()


async def fetch_open_interest(underlying: str) -> list[dict[str, Any]]:
    """GET /eapi/v1/openInterest — open interest for an underlying."""
    client = _get_client()
    resp = await client.get(
        f"{BASE_URL}/eapi/v1/openInterest",
        params={"underlyingAsset": underlying},
    )
    resp.raise_for_status()
    return resp.json()
