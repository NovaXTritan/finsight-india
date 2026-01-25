"""
F&O Analytics Routes - Option chain, Greeks, Max Pain, PCR
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from datetime import datetime

from api.core.auth import get_current_user_id
from api.models.schemas import (
    OptionChain, OptionData, MaxPainResult, PCRResult,
    OIAnalysis, OIBuildup, FNOSymbol, MessageResponse
)
from data.options_fetcher import options_fetcher, LOT_SIZES
from data.nifty500 import FNO_STOCKS
from analysis.greeks import calculate_max_pain, calculate_pcr, interpret_oi_buildup

router = APIRouter(prefix="/options", tags=["F&O Analytics"])


# =============================================================================
# OPTION CHAIN
# =============================================================================

@router.get("/chain/{symbol}", response_model=OptionChain)
async def get_option_chain(
    symbol: str,
    expiry: Optional[str] = Query(None, description="Specific expiry date (YYYY-MM-DD)"),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get full option chain with Greeks for a symbol.

    Returns all strikes with call and put data, including:
    - LTP, Bid, Ask
    - Volume, OI, OI Change
    - Implied Volatility
    - Greeks (Delta, Gamma, Theta, Vega)
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"Fetching option chain for {symbol.upper()}")
        data = await options_fetcher.get_option_chain(symbol.upper())
        logger.info(f"Got data for {symbol.upper()}: {bool(data)}, keys: {list(data.keys()) if data else 'None'}")
    except Exception as e:
        logger.error(f"Exception fetching option chain for {symbol.upper()}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching option chain: {str(e)}"
        )

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Option chain not available for {symbol.upper()}"
        )

    return OptionChain(
        symbol=data['symbol'],
        spot_price=data['spot_price'],
        expiry_date=data['expiry_date'],
        expiry_dates=data['expiry_dates'],
        lot_size=data['lot_size'],
        options=[OptionData(**opt) for opt in data['options']],
        total_ce_oi=data['total_ce_oi'],
        total_pe_oi=data['total_pe_oi'],
        timestamp=data['timestamp']
    )


@router.get("/chain/{symbol}/strikes")
async def get_option_chain_by_strikes(
    symbol: str,
    strike_range: int = Query(10, ge=1, le=50, description="Number of strikes around ATM"),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get option chain formatted by strikes (CE and PE side by side).

    Returns a table-friendly format with strikes as rows.
    """
    data = await options_fetcher.get_option_chain(symbol.upper())

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Option chain not available for {symbol.upper()}"
        )

    spot = data['spot_price']
    options = data['options']

    # Find ATM strike
    strikes = sorted(set(opt['strike'] for opt in options))
    atm_strike = min(strikes, key=lambda x: abs(x - spot))
    atm_index = strikes.index(atm_strike)

    # Get strikes around ATM
    start_idx = max(0, atm_index - strike_range)
    end_idx = min(len(strikes), atm_index + strike_range + 1)
    selected_strikes = strikes[start_idx:end_idx]

    # Build strike-wise data
    strike_data = []
    for strike in selected_strikes:
        ce = next((o for o in options if o['strike'] == strike and o['option_type'] == 'CE'), None)
        pe = next((o for o in options if o['strike'] == strike and o['option_type'] == 'PE'), None)

        strike_data.append({
            'strike': strike,
            'is_atm': strike == atm_strike,
            'is_itm_ce': strike < spot,
            'is_itm_pe': strike > spot,
            'ce': ce,
            'pe': pe,
        })

    return {
        'symbol': data['symbol'],
        'spot_price': spot,
        'atm_strike': atm_strike,
        'expiry_date': data['expiry_date'],
        'lot_size': data['lot_size'],
        'strikes': strike_data,
        'total_ce_oi': data['total_ce_oi'],
        'total_pe_oi': data['total_pe_oi'],
    }


# =============================================================================
# EXPIRY DATES
# =============================================================================

@router.get("/expiries/{symbol}")
async def get_expiry_dates(
    symbol: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get available expiry dates for a symbol.
    """
    expiries = await options_fetcher.get_expiry_dates(symbol.upper())

    if not expiries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No expiry dates found for {symbol.upper()}"
        )

    return {
        'symbol': symbol.upper(),
        'expiry_dates': expiries,
        'nearest_expiry': expiries[0] if expiries else None,
        'total': len(expiries)
    }


# =============================================================================
# MAX PAIN
# =============================================================================

@router.get("/max-pain/{symbol}", response_model=MaxPainResult)
async def get_max_pain(
    symbol: str,
    expiry: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate Max Pain for a symbol.

    Max Pain is the strike price where option writers would lose the least money.
    Price tends to gravitate toward max pain at expiry.
    """
    data = await options_fetcher.get_option_chain(symbol.upper())

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Option chain not available for {symbol.upper()}"
        )

    options = data['options']
    spot = data['spot_price']

    # Calculate max pain
    result = calculate_max_pain(options, spot)

    return MaxPainResult(
        symbol=symbol.upper(),
        expiry_date=data['expiry_date'],
        max_pain=result['max_pain'],
        current_price=result['current_price'],
        distance_from_spot=result['distance_from_spot'],
        pain_values=result['pain_values']
    )


# =============================================================================
# PUT-CALL RATIO
# =============================================================================

@router.get("/pcr/{symbol}", response_model=PCRResult)
async def get_pcr(
    symbol: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate Put-Call Ratio (PCR) for a symbol.

    PCR > 1: More puts = Bullish (contrarian view)
    PCR < 1: More calls = Bearish (contrarian view)
    """
    data = await options_fetcher.get_option_chain(symbol.upper())

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Option chain not available for {symbol.upper()}"
        )

    options = data['options']
    result = calculate_pcr(options)

    return PCRResult(
        symbol=symbol.upper(),
        pcr_volume=result['pcr_volume'],
        pcr_oi=result['pcr_oi'],
        call_volume=result['call_volume'],
        put_volume=result['put_volume'],
        call_oi=result['call_oi'],
        put_oi=result['put_oi'],
        sentiment=result['sentiment'],
        description=result['description']
    )


# =============================================================================
# OI ANALYSIS
# =============================================================================

@router.get("/oi-analysis/{symbol}", response_model=OIAnalysis)
async def get_oi_analysis(
    symbol: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get comprehensive OI (Open Interest) analysis for a symbol.

    Includes:
    - Max OI strikes (support/resistance)
    - OI buildup interpretation
    - Overall sentiment
    """
    data = await options_fetcher.get_option_chain(symbol.upper())

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Option chain not available for {symbol.upper()}"
        )

    options = data['options']
    spot = data['spot_price']

    # Find max OI strikes
    ce_options = [o for o in options if o['option_type'] == 'CE' and o['oi'] > 0]
    pe_options = [o for o in options if o['option_type'] == 'PE' and o['oi'] > 0]

    if not ce_options or not pe_options:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insufficient OI data for analysis"
        )

    max_ce_oi = max(ce_options, key=lambda x: x['oi'])
    max_pe_oi = max(pe_options, key=lambda x: x['oi'])

    # Top 3 OI strikes for support/resistance
    top_ce = sorted(ce_options, key=lambda x: x['oi'], reverse=True)[:3]
    top_pe = sorted(pe_options, key=lambda x: x['oi'], reverse=True)[:3]

    resistance_levels = [o['strike'] for o in top_ce]
    support_levels = [o['strike'] for o in top_pe]

    # OI buildup for significant changes
    significant_buildup = []
    for opt in options:
        if abs(opt.get('oi_change', 0)) > 100000:  # Significant OI change
            interpretation = interpret_oi_buildup(
                opt.get('oi_change', 0),
                0,  # Would need price change data
                opt['option_type']
            )
            significant_buildup.append(OIBuildup(
                symbol=symbol.upper(),
                strike=opt['strike'],
                option_type=opt['option_type'],
                oi_change=opt.get('oi_change', 0),
                price_change=None,
                interpretation=interpretation,
                detected_at=datetime.now()
            ))

    # Overall sentiment based on PCR
    pcr = calculate_pcr(options)

    return OIAnalysis(
        symbol=symbol.upper(),
        spot_price=spot,
        expiry_date=data['expiry_date'],
        max_ce_oi_strike=max_ce_oi['strike'],
        max_pe_oi_strike=max_pe_oi['strike'],
        max_ce_oi=max_ce_oi['oi'],
        max_pe_oi=max_pe_oi['oi'],
        support_levels=sorted(support_levels),
        resistance_levels=sorted(resistance_levels),
        oi_buildup=significant_buildup[:10],  # Top 10
        sentiment=pcr['sentiment']
    )


# =============================================================================
# FNO SYMBOLS
# =============================================================================

@router.get("/symbols", response_model=List[FNOSymbol])
async def get_fno_symbols(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get list of all FNO enabled symbols with lot sizes.
    """
    indices = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT']

    symbols = []

    # Add indices first
    for idx in indices:
        symbols.append(FNOSymbol(
            symbol=idx,
            lot_size=LOT_SIZES.get(idx, 1),
            is_index=True
        ))

    # Add stocks
    for stock in sorted(FNO_STOCKS):
        if stock not in indices:
            symbols.append(FNOSymbol(
                symbol=stock,
                lot_size=LOT_SIZES.get(stock, 1),
                is_index=False
            ))

    return symbols


@router.get("/lot-size/{symbol}")
async def get_lot_size(
    symbol: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get lot size for a symbol.
    """
    lot_size = options_fetcher.get_lot_size(symbol.upper())

    return {
        'symbol': symbol.upper(),
        'lot_size': lot_size,
        'is_fno': symbol.upper() in FNO_STOCKS or symbol.upper() in ['NIFTY', 'BANKNIFTY', 'FINNIFTY']
    }


# =============================================================================
# GREEKS FOR SINGLE OPTION
# =============================================================================

@router.get("/greeks")
async def calculate_option_greeks(
    spot: float = Query(..., gt=0, description="Spot price"),
    strike: float = Query(..., gt=0, description="Strike price"),
    expiry_days: int = Query(..., ge=0, description="Days to expiry"),
    iv: float = Query(..., gt=0, le=500, description="Implied volatility (%)"),
    option_type: str = Query(..., pattern="^(CE|PE)$", description="CE or PE"),
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate Greeks for a custom option.

    Useful for option strategy analysis.
    """
    from analysis.greeks import bs

    T = expiry_days / 365
    sigma = iv / 100

    greeks = bs.all_greeks(spot, strike, T, sigma, option_type)

    # Calculate theoretical price
    if option_type == 'CE':
        price = bs.call_price(spot, strike, T, sigma)
    else:
        price = bs.put_price(spot, strike, T, sigma)

    return {
        'spot': spot,
        'strike': strike,
        'expiry_days': expiry_days,
        'iv': iv,
        'option_type': option_type,
        'theoretical_price': round(price, 2),
        'greeks': greeks,
        'moneyness': 'ITM' if (option_type == 'CE' and spot > strike) or (option_type == 'PE' and spot < strike) else 'OTM'
    }


# =============================================================================
# IV PERCENTILE
# =============================================================================

@router.get("/iv-percentile/{symbol}")
async def get_iv_percentile(
    symbol: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get IV percentile and rank for a symbol.

    IV Percentile shows where current IV stands relative to historical IV.
    """
    data = await options_fetcher.get_option_chain(symbol.upper())

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Option chain not available for {symbol.upper()}"
        )

    options = data['options']
    spot = data['spot_price']

    # Get ATM options for IV
    atm_strike = min(set(o['strike'] for o in options), key=lambda x: abs(x - spot))
    atm_ce = next((o for o in options if o['strike'] == atm_strike and o['option_type'] == 'CE'), None)
    atm_pe = next((o for o in options if o['strike'] == atm_strike and o['option_type'] == 'PE'), None)

    current_iv = ((atm_ce.get('iv', 0) or 0) + (atm_pe.get('iv', 0) or 0)) / 2 if atm_ce and atm_pe else 0

    # Note: For real IV percentile, we'd need historical IV data
    # This is a simplified version based on current chain
    all_ivs = [o.get('iv', 0) or 0 for o in options if o.get('iv')]
    if all_ivs:
        iv_min = min(all_ivs)
        iv_max = max(all_ivs)
        iv_percentile = ((current_iv - iv_min) / (iv_max - iv_min) * 100) if iv_max > iv_min else 50
    else:
        iv_percentile = 50

    return {
        'symbol': symbol.upper(),
        'current_iv': round(current_iv, 2),
        'atm_strike': atm_strike,
        'iv_percentile': round(iv_percentile, 1),
        'iv_interpretation': 'HIGH' if iv_percentile > 70 else 'LOW' if iv_percentile < 30 else 'NORMAL',
        'recommendation': 'Consider selling options' if iv_percentile > 70 else 'Consider buying options' if iv_percentile < 30 else 'IV is in normal range'
    }
