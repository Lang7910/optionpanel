"""
In-memory data store for the latest processed options snapshot.
Supports multiple exchanges (Binance, OKX).
"""

from datetime import datetime, timezone
from typing import Any

# Per-exchange storage
_stores: dict[str, dict[str, Any]] = {
    "binance": {"data": [], "underlyings": [], "last_updated": ""},
    "okx": {"data": [], "underlyings": [], "last_updated": ""},
}


def _get_store(exchange: str) -> dict[str, Any]:
    return _stores.get(exchange, _stores["binance"])


def set_data(records: list[dict[str, Any]], exchange: str = "binance") -> None:
    store = _get_store(exchange)
    store["data"] = records
    store["last_updated"] = datetime.now(timezone.utc).isoformat()


def get_data(exchange: str = "binance") -> list[dict[str, Any]]:
    return _get_store(exchange)["data"]


def set_underlyings(underlyings: list[str], exchange: str = "binance") -> None:
    _get_store(exchange)["underlyings"] = underlyings


def get_underlyings(exchange: str = "binance") -> list[str]:
    return _get_store(exchange)["underlyings"]


def get_last_updated(exchange: str = "binance") -> str:
    return _get_store(exchange)["last_updated"]


def get_expiries(underlying: str, exchange: str = "binance") -> list[str]:
    """Get unique expiry dates for a given underlying, sorted."""
    expiries = set()
    for r in get_data(exchange):
        if r.get("underlying") == underlying:
            expiries.add(r["expiry"])
    return sorted(expiries)


def get_chain(underlying: str, expiry: str, exchange: str = "binance") -> list[dict[str, Any]]:
    """Get option chain for a given underlying + expiry, sorted by strike."""
    chain = [
        r
        for r in get_data(exchange)
        if r.get("underlying") == underlying and r.get("expiry") == expiry
    ]
    chain.sort(key=lambda r: (r.get("strike", 0), r.get("type", "")))
    return chain


def get_snapshot(underlying: str | None = None, exchange: str = "binance") -> list[dict[str, Any]]:
    """Get full snapshot, optionally filtered by underlying."""
    data = get_data(exchange)
    if underlying:
        return [r for r in data if r.get("underlying") == underlying]
    return data
