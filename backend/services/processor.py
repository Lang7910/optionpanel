"""
Data processing: parse symbols, merge ticker+mark data, compute derived metrics.
"""

from datetime import datetime, timezone
from typing import Any


def parse_symbol(symbol: str) -> dict[str, Any] | None:
    """
    Parse 'BTC-260327-100000-C' into components.
    Returns None if the format is unrecognized.
    """
    parts = symbol.split("-")
    if len(parts) != 4:
        return None

    underlying = parts[0]
    expiry_str = parts[1]  # YYMMDD
    try:
        strike = float(parts[2])
    except ValueError:
        return None
    option_type = parts[3]  # 'C' or 'P'

    # Parse expiry date
    try:
        expiry_date = datetime.strptime(expiry_str, "%y%m%d").replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        return None

    return {
        "underlying": underlying,
        "expiry": expiry_str,
        "expiryDate": expiry_date.isoformat(),
        "strike": strike,
        "type": option_type,
    }


def compute_dte(expiry_str: str) -> int:
    """Compute days to expiry from YYMMDD string."""
    try:
        expiry = datetime.strptime(expiry_str, "%y%m%d").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = expiry - now
        return max(0, delta.days)
    except ValueError:
        return 0


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def merge_and_process(
    tickers: list[dict], marks: list[dict]
) -> list[dict[str, Any]]:
    """
    Merge ticker + mark data by symbol. Compute derived metrics.
    Returns a list of enriched option records.
    """
    # Index mark data by symbol
    mark_by_symbol: dict[str, dict] = {}
    for m in marks:
        mark_by_symbol[m.get("symbol", "")] = m

    results: list[dict[str, Any]] = []

    for t in tickers:
        symbol = t.get("symbol", "")
        parsed = parse_symbol(symbol)
        if parsed is None:
            continue

        mark = mark_by_symbol.get(symbol, {})

        bid = safe_float(t.get("bidPrice"))
        ask = safe_float(t.get("askPrice"))
        mark_price = safe_float(mark.get("markPrice"))
        volume = safe_float(t.get("volume"))
        amount = safe_float(t.get("amount"))
        trade_count = int(safe_float(t.get("tradeCount")))
        exercise_price = safe_float(t.get("exercisePrice"))

        # Greeks from mark endpoint
        delta = safe_float(mark.get("delta"))
        gamma = safe_float(mark.get("gamma"))
        theta = safe_float(mark.get("theta"))
        vega = safe_float(mark.get("vega"))
        mark_iv = safe_float(mark.get("markIV"))
        bid_iv = safe_float(mark.get("bidIV"))
        ask_iv = safe_float(mark.get("askIV"))

        # Derived metrics
        dte = compute_dte(parsed["expiry"])

        # Bid-Ask Spread %
        spread_pct = 0.0
        if mark_price > 0:
            spread_pct = ((ask - bid) / mark_price) * 100

        # Theta cost ratio: |theta| / markPrice
        theta_ratio = 0.0
        if mark_price > 0:
            theta_ratio = abs(theta) / mark_price

        # Moneyness
        moneyness = ""
        if exercise_price > 0 and parsed["strike"] > 0:
            if parsed["type"] == "C":
                if parsed["strike"] < exercise_price:
                    moneyness = "ITM"
                elif parsed["strike"] > exercise_price:
                    moneyness = "OTM"
                else:
                    moneyness = "ATM"
            else:  # Put
                if parsed["strike"] > exercise_price:
                    moneyness = "ITM"
                elif parsed["strike"] < exercise_price:
                    moneyness = "OTM"
                else:
                    moneyness = "ATM"

        record = {
            "symbol": symbol,
            **parsed,
            "bid": bid,
            "ask": ask,
            "markPrice": mark_price,
            "lastPrice": safe_float(t.get("lastPrice")),
            "volume": volume,
            "amount": amount,
            "tradeCount": trade_count,
            "exercisePrice": exercise_price,
            "delta": delta,
            "gamma": gamma,
            "theta": theta,
            "vega": vega,
            "markIV": mark_iv,
            "bidIV": bid_iv,
            "askIV": ask_iv,
            "dte": dte,
            "spreadPct": round(spread_pct, 2),
            "thetaRatio": round(theta_ratio, 6),
            "moneyness": moneyness,
            "highPriceLimit": safe_float(mark.get("highPriceLimit")),
            "lowPriceLimit": safe_float(mark.get("lowPriceLimit")),
        }
        results.append(record)

    return results
