"""
FastAPI entry point.
- CORS middleware for frontend
- Background schedulers: Binance (30s) + OKX (5s per underlying, staggered)
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.options import router as options_router
from services import binance, processor, store
from services import okx, okx_processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OKX underlyings to fetch (only BTC and ETH have significant options liquidity)
OKX_UNDERLYINGS = ["BTC", "ETH"]

# --- Background data refresh ---

_refresh_task: asyncio.Task | None = None
_okx_refresh_task: asyncio.Task | None = None


async def refresh_binance():
    """Fetch from Binance, process, and store."""
    try:
        logger.info("Refreshing options data from Binance...")
        tickers, marks = await asyncio.gather(
            binance.fetch_ticker(),
            binance.fetch_mark(),
        )
        records = processor.merge_and_process(tickers, marks)
        store.set_data(records, "binance")

        underlyings = sorted(set(r["underlying"] for r in records))
        store.set_underlyings(underlyings, "binance")

        logger.info(
            f"Binance refreshed: {len(records)} records, "
            f"{len(underlyings)} underlyings: {underlyings}"
        )
    except Exception as e:
        logger.error(f"Failed to refresh Binance data: {e}", exc_info=True)


async def refresh_okx():
    """Fetch from OKX for all underlyings, process with USD conversion, and store."""
    try:
        logger.info("Refreshing options data from OKX...")
        all_records = []

        for uly in OKX_UNDERLYINGS:
            try:
                # Fetch index price first (needed for USD conversion)
                index_price = await okx.fetch_index_price(uly)
                if index_price <= 0:
                    logger.warning(f"OKX: No index price for {uly}, skipping")
                    continue

                # Stagger requests to respect rate limits (20 req / 2s)
                instruments = await okx.fetch_instruments(uly)
                await asyncio.sleep(0.15)
                tickers = await okx.fetch_tickers(uly)
                await asyncio.sleep(0.15)
                marks = await okx.fetch_mark_price(uly)
                await asyncio.sleep(0.15)

                records = okx_processor.merge_and_process_okx(
                    instruments, tickers, marks, index_price
                )
                all_records.extend(records)

                logger.info(
                    f"OKX {uly}: {len(records)} options, "
                    f"index=${index_price:,.2f}"
                )
            except Exception as e:
                logger.error(f"OKX fetch failed for {uly}: {e}", exc_info=True)
                continue

        store.set_data(all_records, "okx")
        underlyings = sorted(set(r["underlying"] for r in all_records))
        store.set_underlyings(underlyings, "okx")

        logger.info(f"OKX refreshed: {len(all_records)} total records")
    except Exception as e:
        logger.error(f"Failed to refresh OKX data: {e}", exc_info=True)


async def periodic_binance():
    """Run Binance refresh every 10 seconds."""
    while True:
        await refresh_binance()
        await asyncio.sleep(10)


async def periodic_okx():
    """Run OKX refresh every 10 seconds (staggered from Binance)."""
    await asyncio.sleep(3)  # Offset from Binance start
    while True:
        await refresh_okx()
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown lifecycle."""
    global _refresh_task, _okx_refresh_task
    _refresh_task = asyncio.create_task(periodic_binance())
    _okx_refresh_task = asyncio.create_task(periodic_okx())
    logger.info("Background refresh started (Binance + OKX)")
    yield
    for task in [_refresh_task, _okx_refresh_task]:
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    logger.info("Background refresh stopped")


# --- App setup ---

app = FastAPI(
    title="Options Dashboard API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(options_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "binance_updated": store.get_last_updated("binance"),
        "okx_updated": store.get_last_updated("okx"),
    }
