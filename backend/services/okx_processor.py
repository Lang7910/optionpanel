"""
OKX data processor: parse symbols, convert coin-margined prices to USD,
and produce records identical in shape to Binance processor output.
"""

from datetime import datetime, timezone
from typing import Any


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_okx_symbol(inst_id: str) -> dict[str, Any] | None:
    """
    Parse OKX instId 'BTC-USD-260315-70000-C' into components.
    Returns None if format unrecognized.
    """
    parts = inst_id.split("-")
    if len(parts) != 5:
        return None

    underlying = parts[0]             # BTC
    # parts[1] is 'USD', skip
    expiry_str = parts[2]             # 260315 (YYMMDD)
    try:
        strike = float(parts[3])
    except ValueError:
        return None
    option_type = parts[4]            # C or P

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
    try:
        expiry = datetime.strptime(expiry_str, "%y%m%d").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        return max(0, (expiry - now).days)
    except ValueError:
        return 0


def merge_and_process_okx(
    instruments: list[dict],
    tickers: list[dict],
    marks: list[dict],
    index_price: float,
) -> list[dict[str, Any]]:
    """
    Merge OKX instruments + tickers + mark data.
    Convert coin-margined prices to USD using index_price.
    Output format matches Binance processor records.
    """
    # Index by instId for fast lookup
    inst_by_id: dict[str, dict] = {i["instId"]: i for i in instruments}
    mark_by_id: dict[str, dict] = {m["instId"]: m for m in marks}

    results: list[dict[str, Any]] = []

    for t in tickers:
        inst_id = t.get("instId", "")
        parsed = parse_okx_symbol(inst_id)
        if parsed is None:
            continue

        inst = inst_by_id.get(inst_id, {})
        mark = mark_by_id.get(inst_id, {})

        # Contract multiplier: ctMult (e.g. 0.01) × ctVal (e.g. 1)
        ct_mult = safe_float(inst.get("ctMult"), 1.0)
        ct_val = safe_float(inst.get("ctVal"), 1.0)
        contract_size = ct_mult * ct_val  # in BTC/ETH

        # Raw coin-denominated prices
        raw_bid = safe_float(t.get("bidPx"))
        raw_ask = safe_float(t.get("askPx"))
        raw_last = safe_float(t.get("last"))
        raw_mark = safe_float(mark.get("markPx"))

        # Convert to USD
        bid = raw_bid * index_price
        ask = raw_ask * index_price
        last_price = raw_last * index_price
        mark_price = raw_mark * index_price

        # Volume: OKX reports in contracts → multiply by contract_size for coin qty
        vol_contracts = safe_float(t.get("vol24h"))
        volume = vol_contracts * contract_size

        # Open Interest in contracts
        oi_contracts = safe_float(t.get("oi"))
        amount = oi_contracts * contract_size

        # Greeks from mark-price endpoint (these are NOT coin-denominated)
        delta = safe_float(mark.get("delta"))
        gamma = safe_float(mark.get("gamma"))
        theta = safe_float(mark.get("theta"))
        vega = safe_float(mark.get("vega"))
        mark_iv = safe_float(mark.get("markVol")) * 100  # OKX vol is 0-1 fraction

        # Derived metrics
        dte = compute_dte(parsed["expiry"])

        spread_pct = 0.0
        if mark_price > 0:
            spread_pct = ((ask - bid) / mark_price) * 100

        theta_ratio = 0.0
        if mark_price > 0:
            theta_ratio = abs(theta) / mark_price

        # Moneyness using index_price as exercise/spot reference
        exercise_price = index_price
        moneyness = ""
        if exercise_price > 0 and parsed["strike"] > 0:
            if parsed["type"] == "C":
                if parsed["strike"] < exercise_price:
                    moneyness = "ITM"
                elif parsed["strike"] > exercise_price:
                    moneyness = "OTM"
                else:
                    moneyness = "ATM"
            else:
                if parsed["strike"] > exercise_price:
                    moneyness = "ITM"
                elif parsed["strike"] < exercise_price:
                    moneyness = "OTM"
                else:
                    moneyness = "ATM"

        record = {
            "symbol": inst_id,
            **parsed,
            "exchange": "okx",
            "bid": round(bid, 2),
            "ask": round(ask, 2),
            "markPrice": round(mark_price, 2),
            "lastPrice": round(last_price, 2),
            "volume": round(volume, 4),
            "amount": round(amount, 4),
            "tradeCount": 0,  # OKX doesn't provide trade count in tickers
            "exercisePrice": exercise_price,
            "delta": delta,
            "gamma": gamma,
            "theta": theta,
            "vega": vega,
            "markIV": round(mark_iv, 2),
            "bidIV": 0.0,  # OKX doesn't provide bid/ask IV separately
            "askIV": 0.0,
            "dte": dte,
            "spreadPct": round(spread_pct, 2),
            "thetaRatio": round(theta_ratio, 6),
            "moneyness": moneyness,
            "highPriceLimit": 0.0,
            "lowPriceLimit": 0.0,
        }
        results.append(record)

    return results
