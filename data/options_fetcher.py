"""
Options Data Fetcher
Fetches option chain data from NSE with Yahoo Finance fallback
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import aiohttp
import json

from data.nifty500 import FNO_STOCKS
from analysis.greeks import bs, calculate_time_to_expiry

logger = logging.getLogger(__name__)

# NSE Headers to mimic browser
NSE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.nseindia.com/option-chain',
    'X-Requested-With': 'XMLHttpRequest',
    'Connection': 'keep-alive',
}

# Common FNO lot sizes
LOT_SIZES = {
    "NIFTY": 50, "BANKNIFTY": 15, "FINNIFTY": 40,
    "RELIANCE": 250, "TCS": 150, "HDFCBANK": 550, "INFY": 300,
    "ICICIBANK": 700, "SBIN": 1500, "BHARTIARTL": 950, "ITC": 1600,
    "KOTAKBANK": 400, "LT": 225, "AXISBANK": 600, "MARUTI": 100,
    "HINDUNILVR": 300, "BAJFINANCE": 125, "TATAMOTORS": 1425,
    "TATASTEEL": 1700, "WIPRO": 1500, "HCLTECH": 350, "SUNPHARMA": 700,
    "ASIANPAINT": 200, "TITAN": 175, "NTPC": 2250, "POWERGRID": 2700,
    "M&M": 350, "ULTRACEMCO": 100, "ONGC": 3850, "JSWSTEEL": 675,
    "COALINDIA": 2100, "ADANIENT": 250, "ADANIPORTS": 625,
    "BAJAJFINSV": 125, "TECHM": 300, "HINDALCO": 1350, "INDUSINDBK": 400,
    "DRREDDY": 125, "CIPLA": 650, "DIVISLAB": 100, "EICHERMOT": 175,
    "APOLLOHOSP": 125, "TATACONSUM": 450, "BPCL": 1800, "GRASIM": 475,
}

# Sample option chain data for demo/fallback
SAMPLE_OPTION_DATA = {
    "NIFTY": {
        "spot": 24500,
        "strikes": [
            {"strike": 24000, "ce_ltp": 520, "ce_oi": 8500000, "ce_vol": 250000, "ce_iv": 14.5, "pe_ltp": 45, "pe_oi": 3200000, "pe_vol": 120000, "pe_iv": 15.2},
            {"strike": 24100, "ce_ltp": 430, "ce_oi": 7200000, "ce_vol": 180000, "ce_iv": 13.8, "pe_ltp": 55, "pe_oi": 4100000, "pe_vol": 150000, "pe_iv": 14.8},
            {"strike": 24200, "ce_ltp": 350, "ce_oi": 9100000, "ce_vol": 220000, "ce_iv": 13.2, "pe_ltp": 70, "pe_oi": 5200000, "pe_vol": 180000, "pe_iv": 14.2},
            {"strike": 24300, "ce_ltp": 275, "ce_oi": 10500000, "ce_vol": 280000, "ce_iv": 12.5, "pe_ltp": 95, "pe_oi": 6800000, "pe_vol": 210000, "pe_iv": 13.5},
            {"strike": 24400, "ce_ltp": 210, "ce_oi": 12000000, "ce_vol": 320000, "ce_iv": 11.8, "pe_ltp": 130, "pe_oi": 8500000, "pe_vol": 260000, "pe_iv": 12.8},
            {"strike": 24500, "ce_ltp": 155, "ce_oi": 15000000, "ce_vol": 450000, "ce_iv": 11.2, "pe_ltp": 175, "pe_oi": 12000000, "pe_vol": 380000, "pe_iv": 11.5},
            {"strike": 24600, "ce_ltp": 105, "ce_oi": 11000000, "ce_vol": 290000, "ce_iv": 12.0, "pe_ltp": 230, "pe_oi": 9200000, "pe_vol": 240000, "pe_iv": 12.2},
            {"strike": 24700, "ce_ltp": 68, "ce_oi": 8500000, "ce_vol": 200000, "ce_iv": 12.8, "pe_ltp": 295, "pe_oi": 7100000, "pe_vol": 180000, "pe_iv": 13.0},
            {"strike": 24800, "ce_ltp": 42, "ce_oi": 6200000, "ce_vol": 150000, "ce_iv": 13.5, "pe_ltp": 370, "pe_oi": 5500000, "pe_vol": 140000, "pe_iv": 13.8},
            {"strike": 24900, "ce_ltp": 25, "ce_oi": 4800000, "ce_vol": 100000, "ce_iv": 14.2, "pe_ltp": 460, "pe_oi": 4200000, "pe_vol": 110000, "pe_iv": 14.5},
            {"strike": 25000, "ce_ltp": 15, "ce_oi": 7500000, "ce_vol": 180000, "ce_iv": 15.0, "pe_ltp": 560, "pe_oi": 3500000, "pe_vol": 95000, "pe_iv": 15.2},
        ],
    },
    "BANKNIFTY": {
        "spot": 52000,
        "strikes": [
            {"strike": 51000, "ce_ltp": 1150, "ce_oi": 2500000, "ce_vol": 85000, "ce_iv": 16.5, "pe_ltp": 85, "pe_oi": 1200000, "pe_vol": 45000, "pe_iv": 17.2},
            {"strike": 51200, "ce_ltp": 980, "ce_oi": 2200000, "ce_vol": 72000, "ce_iv": 15.8, "pe_ltp": 105, "pe_oi": 1500000, "pe_vol": 52000, "pe_iv": 16.5},
            {"strike": 51400, "ce_ltp": 820, "ce_oi": 2800000, "ce_vol": 95000, "ce_iv": 15.2, "pe_ltp": 135, "pe_oi": 1800000, "pe_vol": 65000, "pe_iv": 15.8},
            {"strike": 51600, "ce_ltp": 670, "ce_oi": 3200000, "ce_vol": 110000, "ce_iv": 14.5, "pe_ltp": 180, "pe_oi": 2200000, "pe_vol": 78000, "pe_iv": 15.2},
            {"strike": 51800, "ce_ltp": 530, "ce_oi": 3800000, "ce_vol": 135000, "ce_iv": 13.8, "pe_ltp": 240, "pe_oi": 2800000, "pe_vol": 95000, "pe_iv": 14.5},
            {"strike": 52000, "ce_ltp": 400, "ce_oi": 4500000, "ce_vol": 180000, "ce_iv": 13.2, "pe_ltp": 320, "pe_oi": 3500000, "pe_vol": 125000, "pe_iv": 13.5},
            {"strike": 52200, "ce_ltp": 285, "ce_oi": 3600000, "ce_vol": 120000, "ce_iv": 13.8, "pe_ltp": 420, "pe_oi": 2900000, "pe_vol": 98000, "pe_iv": 14.0},
            {"strike": 52400, "ce_ltp": 190, "ce_oi": 2800000, "ce_vol": 85000, "ce_iv": 14.5, "pe_ltp": 535, "pe_oi": 2300000, "pe_vol": 75000, "pe_iv": 14.8},
            {"strike": 52600, "ce_ltp": 115, "ce_oi": 2200000, "ce_vol": 62000, "ce_iv": 15.2, "pe_ltp": 670, "pe_oi": 1800000, "pe_vol": 58000, "pe_iv": 15.5},
            {"strike": 52800, "ce_ltp": 65, "ce_oi": 1800000, "ce_vol": 45000, "ce_iv": 16.0, "pe_ltp": 825, "pe_oi": 1400000, "pe_vol": 42000, "pe_iv": 16.2},
            {"strike": 53000, "ce_ltp": 35, "ce_oi": 2500000, "ce_vol": 65000, "ce_iv": 16.8, "pe_ltp": 1000, "pe_oi": 1100000, "pe_vol": 35000, "pe_iv": 17.0},
        ],
    },
    "RELIANCE": {
        "spot": 2900,
        "strikes": [
            {"strike": 2800, "ce_ltp": 120, "ce_oi": 1500000, "ce_vol": 45000, "ce_iv": 22.5, "pe_ltp": 12, "pe_oi": 800000, "pe_vol": 25000, "pe_iv": 24.2},
            {"strike": 2850, "ce_ltp": 78, "ce_oi": 1800000, "ce_vol": 55000, "ce_iv": 21.5, "pe_ltp": 22, "pe_oi": 1100000, "pe_vol": 35000, "pe_iv": 23.0},
            {"strike": 2900, "ce_ltp": 48, "ce_oi": 2200000, "ce_vol": 72000, "ce_iv": 20.5, "pe_ltp": 42, "pe_oi": 1600000, "pe_vol": 52000, "pe_iv": 21.5},
            {"strike": 2950, "ce_ltp": 28, "ce_oi": 1600000, "ce_vol": 48000, "ce_iv": 21.8, "pe_ltp": 72, "pe_oi": 1200000, "pe_vol": 38000, "pe_iv": 22.5},
            {"strike": 3000, "ce_ltp": 15, "ce_oi": 2000000, "ce_vol": 58000, "ce_iv": 23.0, "pe_ltp": 115, "pe_oi": 950000, "pe_vol": 28000, "pe_iv": 23.5},
        ],
    },
}


class OptionsFetcher:
    """Fetches option chain data from NSE and Yahoo Finance."""

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.nse_cookies = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None or self.session.closed:
            connector = aiohttp.TCPConnector(limit=10, ssl=False)
            self.session = aiohttp.ClientSession(connector=connector, headers=NSE_HEADERS)
        return self.session

    async def close(self):
        """Close the session."""
        if self.session and not self.session.closed:
            await self.session.close()

    async def _init_nse_session(self):
        """Initialize NSE session to get cookies."""
        session = await self._get_session()
        try:
            async with session.get(
                'https://www.nseindia.com/option-chain',
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    self.nse_cookies = response.cookies
                    return True
        except Exception as e:
            logger.warning(f"Failed to init NSE session: {e}")
        return False

    async def fetch_nse_option_chain(self, symbol: str) -> Optional[Dict]:
        """
        Fetch option chain from NSE.

        Args:
            symbol: Stock/Index symbol (e.g., 'NIFTY', 'RELIANCE')

        Returns:
            Option chain data or None
        """
        # Initialize session if needed
        if not self.nse_cookies:
            await self._init_nse_session()

        session = await self._get_session()

        # Determine URL based on symbol type
        if symbol.upper() in ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT']:
            url = f"https://www.nseindia.com/api/option-chain-indices?symbol={symbol.upper()}"
        else:
            url = f"https://www.nseindia.com/api/option-chain-equities?symbol={symbol.upper()}"

        try:
            async with session.get(
                url,
                cookies=self.nse_cookies,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    logger.warning(f"NSE returned {response.status} for {symbol}")
        except Exception as e:
            logger.warning(f"NSE fetch failed for {symbol}: {e}")

        return None

    async def fetch_yahoo_option_chain(self, symbol: str) -> Optional[Dict]:
        """
        Fetch option chain from Yahoo Finance as fallback.

        Args:
            symbol: Stock symbol

        Returns:
            Option chain data in standardized format
        """
        try:
            import yfinance as yf

            # Get ticker
            ticker = yf.Ticker(f"{symbol}.NS")

            # Get available expiry dates
            try:
                expiries = ticker.options
                if not expiries:
                    return None
            except Exception:
                return None

            # Get current price
            info = ticker.info
            spot_price = info.get('currentPrice') or info.get('regularMarketPrice')
            if not spot_price:
                return None

            # Fetch option chain for nearest expiry
            nearest_expiry = expiries[0]
            opt_chain = ticker.option_chain(nearest_expiry)

            # Convert to standard format
            records = []

            # Process calls
            for _, row in opt_chain.calls.iterrows():
                records.append({
                    'strikePrice': row['strike'],
                    'expiryDate': nearest_expiry,
                    'CE': {
                        'strikePrice': row['strike'],
                        'lastPrice': row.get('lastPrice', 0),
                        'bid': row.get('bid', 0),
                        'ask': row.get('ask', 0),
                        'openInterest': row.get('openInterest', 0),
                        'changeinOpenInterest': 0,
                        'totalTradedVolume': row.get('volume', 0),
                        'impliedVolatility': row.get('impliedVolatility', 0) * 100,
                    }
                })

            # Process puts
            for _, row in opt_chain.puts.iterrows():
                # Find existing record or create new
                existing = next((r for r in records if r['strikePrice'] == row['strike']), None)
                if existing:
                    existing['PE'] = {
                        'strikePrice': row['strike'],
                        'lastPrice': row.get('lastPrice', 0),
                        'bid': row.get('bid', 0),
                        'ask': row.get('ask', 0),
                        'openInterest': row.get('openInterest', 0),
                        'changeinOpenInterest': 0,
                        'totalTradedVolume': row.get('volume', 0),
                        'impliedVolatility': row.get('impliedVolatility', 0) * 100,
                    }
                else:
                    records.append({
                        'strikePrice': row['strike'],
                        'expiryDate': nearest_expiry,
                        'PE': {
                            'strikePrice': row['strike'],
                            'lastPrice': row.get('lastPrice', 0),
                            'bid': row.get('bid', 0),
                            'ask': row.get('ask', 0),
                            'openInterest': row.get('openInterest', 0),
                            'changeinOpenInterest': 0,
                            'totalTradedVolume': row.get('volume', 0),
                            'impliedVolatility': row.get('impliedVolatility', 0) * 100,
                        }
                    })

            return {
                'records': {'data': records},
                'filtered': {
                    'data': records,
                    'CE': {'totOI': sum(r.get('CE', {}).get('openInterest', 0) for r in records)},
                    'PE': {'totOI': sum(r.get('PE', {}).get('openInterest', 0) for r in records)},
                },
                'underlyingValue': spot_price,
                'expiryDates': list(expiries),
            }

        except Exception as e:
            logger.error(f"Yahoo Finance option chain failed for {symbol}: {e}")
            return None

    def _generate_sample_data(self, symbol: str) -> Optional[Dict]:
        """
        Generate sample option chain data for demo purposes.

        Args:
            symbol: Stock/Index symbol

        Returns:
            Sample option chain data
        """
        symbol_upper = symbol.upper()

        # Use predefined sample data if available
        if symbol_upper in SAMPLE_OPTION_DATA:
            sample = SAMPLE_OPTION_DATA[symbol_upper]
            spot = sample["spot"]
            strikes_data = sample["strikes"]
        else:
            # Generate generic sample data for unknown symbols
            spot = 1000  # Default spot
            base_strikes = [-200, -150, -100, -50, 0, 50, 100, 150, 200]
            strikes_data = []
            for offset in base_strikes:
                strike = spot + offset
                itm_ce = offset < 0
                strikes_data.append({
                    "strike": strike,
                    "ce_ltp": max(5, spot - strike + 20) if itm_ce else max(5, 50 - abs(offset) * 0.2),
                    "ce_oi": 500000 + abs(offset) * 10000,
                    "ce_vol": 20000 + abs(offset) * 500,
                    "ce_iv": 18 + abs(offset) * 0.02,
                    "pe_ltp": max(5, strike - spot + 20) if not itm_ce else max(5, 50 - abs(offset) * 0.2),
                    "pe_oi": 400000 + abs(offset) * 8000,
                    "pe_vol": 15000 + abs(offset) * 400,
                    "pe_iv": 19 + abs(offset) * 0.02,
                })

        expiry_date = date.today() + timedelta(days=(3 - date.today().weekday()) % 7 + 7)  # Next Thursday
        T = calculate_time_to_expiry(expiry_date)

        options = []
        for strike_data in strikes_data:
            strike = strike_data["strike"]

            # CE data
            ce_iv = strike_data["ce_iv"] / 100
            ce_greeks = bs.all_greeks(spot, strike, T, ce_iv, 'CE') if T > 0 else {}
            options.append({
                'strike': strike,
                'expiry_date': expiry_date.isoformat(),
                'option_type': 'CE',
                'ltp': strike_data["ce_ltp"],
                'bid': strike_data["ce_ltp"] - 1,
                'ask': strike_data["ce_ltp"] + 1,
                'volume': strike_data["ce_vol"],
                'oi': strike_data["ce_oi"],
                'oi_change': int(strike_data["ce_oi"] * 0.05),
                'iv': round(strike_data["ce_iv"], 2),
                **ce_greeks
            })

            # PE data
            pe_iv = strike_data["pe_iv"] / 100
            pe_greeks = bs.all_greeks(spot, strike, T, pe_iv, 'PE') if T > 0 else {}
            options.append({
                'strike': strike,
                'expiry_date': expiry_date.isoformat(),
                'option_type': 'PE',
                'ltp': strike_data["pe_ltp"],
                'bid': strike_data["pe_ltp"] - 1,
                'ask': strike_data["pe_ltp"] + 1,
                'volume': strike_data["pe_vol"],
                'oi': strike_data["pe_oi"],
                'oi_change': int(strike_data["pe_oi"] * 0.03),
                'iv': round(strike_data["pe_iv"], 2),
                **pe_greeks
            })

        total_ce_oi = sum(o['oi'] for o in options if o['option_type'] == 'CE')
        total_pe_oi = sum(o['oi'] for o in options if o['option_type'] == 'PE')

        return {
            'symbol': symbol_upper,
            'spot_price': spot,
            'expiry_date': expiry_date.isoformat(),
            'expiry_dates': [expiry_date.isoformat(), (expiry_date + timedelta(days=7)).isoformat()],
            'lot_size': LOT_SIZES.get(symbol_upper, 1),
            'options': sorted(options, key=lambda x: (x['strike'], x['option_type'])),
            'total_ce_oi': total_ce_oi,
            'total_pe_oi': total_pe_oi,
            'timestamp': datetime.now().isoformat(),
            'is_sample_data': True,
        }

    async def get_option_chain(self, symbol: str) -> Optional[Dict]:
        """
        Get option chain with NSE primary, Yahoo Finance fallback, and sample data as last resort.

        Args:
            symbol: Stock/Index symbol

        Returns:
            Standardized option chain data
        """
        # Try NSE first
        try:
            nse_data = await self.fetch_nse_option_chain(symbol)
            if nse_data and 'records' in nse_data:
                logger.info(f"Got option chain from NSE for {symbol}")
                return self._standardize_nse_data(nse_data, symbol)
        except Exception as e:
            logger.warning(f"NSE fetch failed for {symbol}: {e}")

        # Fallback to Yahoo Finance
        try:
            yahoo_data = await self.fetch_yahoo_option_chain(symbol)
            if yahoo_data:
                logger.info(f"Got option chain from Yahoo Finance for {symbol}")
                return self._standardize_yahoo_data(yahoo_data, symbol)
        except Exception as e:
            logger.warning(f"Yahoo Finance fetch failed for {symbol}: {e}")

        # Last resort: use sample data
        logger.info(f"Using sample option chain data for {symbol}")
        return self._generate_sample_data(symbol)

    def _standardize_nse_data(self, data: Dict, symbol: str) -> Dict:
        """Standardize NSE option chain data."""
        records = data.get('records', {}).get('data', [])
        filtered = data.get('filtered', {})
        spot_price = data.get('records', {}).get('underlyingValue', 0)
        expiry_dates = data.get('records', {}).get('expiryDates', [])

        # Current expiry
        current_expiry = expiry_dates[0] if expiry_dates else None
        if current_expiry:
            try:
                expiry_date = datetime.strptime(current_expiry, '%d-%b-%Y').date()
            except:
                expiry_date = date.today() + timedelta(days=7)
        else:
            expiry_date = date.today() + timedelta(days=7)

        T = calculate_time_to_expiry(expiry_date)

        options = []
        for record in records:
            strike = record.get('strikePrice', 0)

            # Process CE
            if 'CE' in record:
                ce = record['CE']
                ltp = ce.get('lastPrice', 0)
                iv = ce.get('impliedVolatility', 30) / 100

                # Calculate Greeks
                greeks = bs.all_greeks(spot_price, strike, T, iv, 'CE') if spot_price > 0 and T > 0 else {}

                options.append({
                    'strike': strike,
                    'expiry_date': expiry_date.isoformat(),
                    'option_type': 'CE',
                    'ltp': ltp,
                    'bid': ce.get('bidprice', 0),
                    'ask': ce.get('askPrice', 0),
                    'volume': ce.get('totalTradedVolume', 0),
                    'oi': ce.get('openInterest', 0),
                    'oi_change': ce.get('changeinOpenInterest', 0),
                    'iv': round(iv * 100, 2),
                    **greeks
                })

            # Process PE
            if 'PE' in record:
                pe = record['PE']
                ltp = pe.get('lastPrice', 0)
                iv = pe.get('impliedVolatility', 30) / 100

                # Calculate Greeks
                greeks = bs.all_greeks(spot_price, strike, T, iv, 'PE') if spot_price > 0 and T > 0 else {}

                options.append({
                    'strike': strike,
                    'expiry_date': expiry_date.isoformat(),
                    'option_type': 'PE',
                    'ltp': ltp,
                    'bid': pe.get('bidprice', 0),
                    'ask': pe.get('askPrice', 0),
                    'volume': pe.get('totalTradedVolume', 0),
                    'oi': pe.get('openInterest', 0),
                    'oi_change': pe.get('changeinOpenInterest', 0),
                    'iv': round(iv * 100, 2),
                    **greeks
                })

        return {
            'symbol': symbol,
            'spot_price': spot_price,
            'expiry_date': expiry_date.isoformat(),
            'expiry_dates': expiry_dates,
            'lot_size': LOT_SIZES.get(symbol.upper(), 1),
            'options': sorted(options, key=lambda x: (x['strike'], x['option_type'])),
            'total_ce_oi': filtered.get('CE', {}).get('totOI', 0),
            'total_pe_oi': filtered.get('PE', {}).get('totOI', 0),
            'timestamp': datetime.now().isoformat(),
        }

    def _standardize_yahoo_data(self, data: Dict, symbol: str) -> Dict:
        """Standardize Yahoo Finance option chain data."""
        records = data.get('records', {}).get('data', [])
        spot_price = data.get('underlyingValue', 0)
        expiry_dates = data.get('expiryDates', [])

        # Parse expiry date
        if expiry_dates:
            try:
                expiry_date = datetime.strptime(expiry_dates[0], '%Y-%m-%d').date()
            except:
                expiry_date = date.today() + timedelta(days=7)
        else:
            expiry_date = date.today() + timedelta(days=7)

        T = calculate_time_to_expiry(expiry_date)

        options = []
        for record in records:
            strike = record.get('strikePrice', 0)

            # Process CE
            if 'CE' in record:
                ce = record['CE']
                ltp = ce.get('lastPrice', 0)
                iv = ce.get('impliedVolatility', 30) / 100

                greeks = bs.all_greeks(spot_price, strike, T, iv, 'CE') if spot_price > 0 and T > 0 else {}

                options.append({
                    'strike': strike,
                    'expiry_date': expiry_date.isoformat(),
                    'option_type': 'CE',
                    'ltp': ltp,
                    'bid': ce.get('bid', 0),
                    'ask': ce.get('ask', 0),
                    'volume': ce.get('totalTradedVolume', 0),
                    'oi': ce.get('openInterest', 0),
                    'oi_change': ce.get('changeinOpenInterest', 0),
                    'iv': round(iv * 100, 2) if iv else 30,
                    **greeks
                })

            # Process PE
            if 'PE' in record:
                pe = record['PE']
                ltp = pe.get('lastPrice', 0)
                iv = pe.get('impliedVolatility', 30) / 100

                greeks = bs.all_greeks(spot_price, strike, T, iv, 'PE') if spot_price > 0 and T > 0 else {}

                options.append({
                    'strike': strike,
                    'expiry_date': expiry_date.isoformat(),
                    'option_type': 'PE',
                    'ltp': ltp,
                    'bid': pe.get('bid', 0),
                    'ask': pe.get('ask', 0),
                    'volume': pe.get('totalTradedVolume', 0),
                    'oi': pe.get('openInterest', 0),
                    'oi_change': pe.get('changeinOpenInterest', 0),
                    'iv': round(iv * 100, 2) if iv else 30,
                    **greeks
                })

        total_ce_oi = sum(o['oi'] for o in options if o['option_type'] == 'CE')
        total_pe_oi = sum(o['oi'] for o in options if o['option_type'] == 'PE')

        return {
            'symbol': symbol,
            'spot_price': spot_price,
            'expiry_date': expiry_date.isoformat(),
            'expiry_dates': expiry_dates,
            'lot_size': LOT_SIZES.get(symbol.upper(), 1),
            'options': sorted(options, key=lambda x: (x['strike'], x['option_type'])),
            'total_ce_oi': total_ce_oi,
            'total_pe_oi': total_pe_oi,
            'timestamp': datetime.now().isoformat(),
        }

    async def get_expiry_dates(self, symbol: str) -> List[str]:
        """Get available expiry dates for a symbol."""
        data = await self.get_option_chain(symbol)
        if data:
            return data.get('expiry_dates', [])
        return []

    def get_lot_size(self, symbol: str) -> int:
        """Get lot size for a symbol."""
        return LOT_SIZES.get(symbol.upper(), 1)

    def get_fno_symbols(self) -> List[str]:
        """Get list of FNO enabled symbols."""
        return FNO_STOCKS


# Singleton instance
options_fetcher = OptionsFetcher()
