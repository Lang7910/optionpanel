"""
API routes for options data.
Supports exchange parameter to switch between Binance and OKX.
"""

from fastapi import APIRouter, Query
from services import store

router = APIRouter(prefix="/api/options", tags=["options"])


@router.get("/underlyings")
async def get_underlyings(
    exchange: str = Query("binance", description="binance or okx"),
):
    """List supported underlying assets."""
    return {
        "underlyings": store.get_underlyings(exchange),
        "lastUpdated": store.get_last_updated(exchange),
    }


@router.get("/expiries")
async def get_expiries(
    underlying: str = Query(..., description="e.g. BTC"),
    exchange: str = Query("binance", description="binance or okx"),
):
    """List available expiry dates for an underlying."""
    return {
        "expiries": store.get_expiries(underlying, exchange),
        "lastUpdated": store.get_last_updated(exchange),
    }


@router.get("/chain")
async def get_chain(
    underlying: str = Query(..., description="e.g. BTC"),
    expiry: str = Query(..., description="e.g. 260327"),
    exchange: str = Query("binance", description="binance or okx"),
):
    """Get option chain for an underlying + expiry."""
    chain = store.get_chain(underlying, expiry, exchange)
    # Split into calls and puts, group by strike
    strikes: dict[float, dict] = {}
    for record in chain:
        strike = record["strike"]
        if strike not in strikes:
            strikes[strike] = {"strike": strike, "call": None, "put": None}
        if record["type"] == "C":
            strikes[strike]["call"] = record
        else:
            strikes[strike]["put"] = record

    sorted_chain = sorted(strikes.values(), key=lambda x: x["strike"])

    # Determine ATM strike (closest to exercise/spot price)
    exercise_price = 0.0
    if chain:
        exercise_price = chain[0].get("exercisePrice", 0.0)

    atm_strike = 0.0
    if sorted_chain and exercise_price > 0:
        atm_strike = min(
            sorted_chain, key=lambda x: abs(x["strike"] - exercise_price)
        )["strike"]

    return {
        "chain": sorted_chain,
        "exercisePrice": exercise_price,
        "atmStrike": atm_strike,
        "lastUpdated": store.get_last_updated(exchange),
    }


@router.get("/snapshot")
async def get_snapshot(
    underlying: str = Query(None, description="Optional filter by underlying"),
    exchange: str = Query("binance", description="binance or okx"),
):
    """Get full processed snapshot for scatter plots."""
    data = store.get_snapshot(underlying, exchange)
    exercise_price = 0.0
    if data:
        exercise_price = data[0].get("exercisePrice", 0.0)
    return {
        "data": data,
        "exercisePrice": exercise_price,
        "lastUpdated": store.get_last_updated(exchange),
    }
