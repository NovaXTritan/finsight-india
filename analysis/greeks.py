"""
Option Greeks Calculator
Black-Scholes implementation for Delta, Gamma, Theta, Vega
Uses scipy for normal distribution calculations
"""
import math
from typing import Dict, Optional, Tuple
from scipy.stats import norm
from datetime import datetime, date
import numpy as np


class BlackScholes:
    """
    Black-Scholes Option Pricing and Greeks Calculator.

    Implements the Black-Scholes model for European options.
    """

    def __init__(self, risk_free_rate: float = 0.07):
        """
        Initialize with risk-free rate.

        Args:
            risk_free_rate: Annual risk-free interest rate (default 7% for India)
        """
        self.r = risk_free_rate

    def _d1(self, S: float, K: float, T: float, sigma: float) -> float:
        """Calculate d1 parameter."""
        if T <= 0 or sigma <= 0:
            return 0
        return (math.log(S / K) + (self.r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))

    def _d2(self, S: float, K: float, T: float, sigma: float) -> float:
        """Calculate d2 parameter."""
        if T <= 0 or sigma <= 0:
            return 0
        return self._d1(S, K, T, sigma) - sigma * math.sqrt(T)

    def call_price(self, S: float, K: float, T: float, sigma: float) -> float:
        """
        Calculate Call option price.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)

        Returns:
            Call option theoretical price
        """
        if T <= 0:
            return max(0, S - K)

        d1 = self._d1(S, K, T, sigma)
        d2 = self._d2(S, K, T, sigma)

        return S * norm.cdf(d1) - K * math.exp(-self.r * T) * norm.cdf(d2)

    def put_price(self, S: float, K: float, T: float, sigma: float) -> float:
        """
        Calculate Put option price.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)

        Returns:
            Put option theoretical price
        """
        if T <= 0:
            return max(0, K - S)

        d1 = self._d1(S, K, T, sigma)
        d2 = self._d2(S, K, T, sigma)

        return K * math.exp(-self.r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

    def delta(self, S: float, K: float, T: float, sigma: float, option_type: str) -> float:
        """
        Calculate Delta - rate of change of option price with respect to spot price.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)
            option_type: 'CE' for call, 'PE' for put

        Returns:
            Delta value (-1 to 1)
        """
        if T <= 0:
            if option_type.upper() == 'CE':
                return 1.0 if S > K else 0.0
            else:
                return -1.0 if S < K else 0.0

        d1 = self._d1(S, K, T, sigma)

        if option_type.upper() == 'CE':
            return norm.cdf(d1)
        else:
            return norm.cdf(d1) - 1

    def gamma(self, S: float, K: float, T: float, sigma: float) -> float:
        """
        Calculate Gamma - rate of change of delta with respect to spot price.
        Same for both calls and puts.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)

        Returns:
            Gamma value
        """
        if T <= 0 or sigma <= 0:
            return 0

        d1 = self._d1(S, K, T, sigma)
        return norm.pdf(d1) / (S * sigma * math.sqrt(T))

    def theta(self, S: float, K: float, T: float, sigma: float, option_type: str) -> float:
        """
        Calculate Theta - rate of change of option price with respect to time (daily).

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)
            option_type: 'CE' for call, 'PE' for put

        Returns:
            Theta value (per day)
        """
        if T <= 0 or sigma <= 0:
            return 0

        d1 = self._d1(S, K, T, sigma)
        d2 = self._d2(S, K, T, sigma)

        # First term (same for both)
        first_term = -(S * norm.pdf(d1) * sigma) / (2 * math.sqrt(T))

        if option_type.upper() == 'CE':
            theta_annual = first_term - self.r * K * math.exp(-self.r * T) * norm.cdf(d2)
        else:
            theta_annual = first_term + self.r * K * math.exp(-self.r * T) * norm.cdf(-d2)

        # Convert to daily theta
        return theta_annual / 365

    def vega(self, S: float, K: float, T: float, sigma: float) -> float:
        """
        Calculate Vega - rate of change of option price with respect to volatility.
        Same for both calls and puts. Expressed per 1% change in IV.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)

        Returns:
            Vega value (per 1% IV change)
        """
        if T <= 0 or sigma <= 0:
            return 0

        d1 = self._d1(S, K, T, sigma)
        return S * norm.pdf(d1) * math.sqrt(T) / 100

    def rho(self, S: float, K: float, T: float, sigma: float, option_type: str) -> float:
        """
        Calculate Rho - rate of change of option price with respect to interest rate.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)
            option_type: 'CE' for call, 'PE' for put

        Returns:
            Rho value
        """
        if T <= 0:
            return 0

        d2 = self._d2(S, K, T, sigma)

        if option_type.upper() == 'CE':
            return K * T * math.exp(-self.r * T) * norm.cdf(d2) / 100
        else:
            return -K * T * math.exp(-self.r * T) * norm.cdf(-d2) / 100

    def all_greeks(
        self,
        S: float,
        K: float,
        T: float,
        sigma: float,
        option_type: str
    ) -> Dict[str, float]:
        """
        Calculate all Greeks for an option.

        Args:
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            sigma: Volatility (annualized)
            option_type: 'CE' for call, 'PE' for put

        Returns:
            Dictionary with all Greeks
        """
        return {
            'delta': round(self.delta(S, K, T, sigma, option_type), 4),
            'gamma': round(self.gamma(S, K, T, sigma), 6),
            'theta': round(self.theta(S, K, T, sigma, option_type), 4),
            'vega': round(self.vega(S, K, T, sigma), 4),
            'rho': round(self.rho(S, K, T, sigma, option_type), 4),
        }

    def implied_volatility(
        self,
        option_price: float,
        S: float,
        K: float,
        T: float,
        option_type: str,
        max_iterations: int = 100,
        precision: float = 0.0001
    ) -> Optional[float]:
        """
        Calculate Implied Volatility using Newton-Raphson method.

        Args:
            option_price: Market price of the option
            S: Spot price
            K: Strike price
            T: Time to expiry (in years)
            option_type: 'CE' for call, 'PE' for put
            max_iterations: Maximum iterations for convergence
            precision: Desired precision

        Returns:
            Implied volatility (annualized) or None if not converged
        """
        if T <= 0:
            return None

        # Initial guess
        sigma = 0.3  # 30% volatility as starting point

        for _ in range(max_iterations):
            # Calculate theoretical price
            if option_type.upper() == 'CE':
                price = self.call_price(S, K, T, sigma)
            else:
                price = self.put_price(S, K, T, sigma)

            # Calculate vega (sensitivity to volatility)
            vega = self.vega(S, K, T, sigma) * 100  # Convert back from percentage

            if vega < 0.0001:
                break

            # Price difference
            diff = option_price - price

            if abs(diff) < precision:
                return sigma

            # Newton-Raphson update
            sigma = sigma + diff / vega

            # Keep sigma in reasonable bounds
            sigma = max(0.01, min(5.0, sigma))

        return sigma if abs(diff) < 0.01 else None


def calculate_time_to_expiry(expiry_date: date) -> float:
    """
    Calculate time to expiry in years.

    Args:
        expiry_date: Option expiry date

    Returns:
        Time to expiry in years
    """
    today = datetime.now().date()
    days = (expiry_date - today).days
    return max(0, days) / 365


def calculate_max_pain(option_chain: list, spot_price: float) -> Dict:
    """
    Calculate Max Pain - strike price where option writers would lose the least.

    Args:
        option_chain: List of options with strike, oi, option_type
        spot_price: Current spot price

    Returns:
        Dictionary with max pain strike and analysis
    """
    # Group by strike
    strikes = {}
    for opt in option_chain:
        strike = float(opt['strike'])
        if strike not in strikes:
            strikes[strike] = {'call_oi': 0, 'put_oi': 0}

        if opt['option_type'] == 'CE':
            strikes[strike]['call_oi'] = opt.get('oi', 0) or 0
        else:
            strikes[strike]['put_oi'] = opt.get('oi', 0) or 0

    if not strikes:
        return {'max_pain': spot_price, 'pain_values': {}}

    # Calculate pain at each strike
    pain_values = {}
    for test_strike in strikes.keys():
        total_pain = 0

        for strike, data in strikes.items():
            # Call pain: if test_strike > strike, calls are ITM
            if test_strike > strike:
                call_pain = (test_strike - strike) * data['call_oi']
            else:
                call_pain = 0

            # Put pain: if test_strike < strike, puts are ITM
            if test_strike < strike:
                put_pain = (strike - test_strike) * data['put_oi']
            else:
                put_pain = 0

            total_pain += call_pain + put_pain

        pain_values[test_strike] = total_pain

    # Find minimum pain strike
    max_pain_strike = min(pain_values.keys(), key=lambda x: pain_values[x])

    return {
        'max_pain': max_pain_strike,
        'current_price': spot_price,
        'distance_from_spot': round((max_pain_strike - spot_price) / spot_price * 100, 2),
        'pain_values': {k: round(v, 0) for k, v in sorted(pain_values.items())}
    }


def calculate_pcr(option_chain: list) -> Dict:
    """
    Calculate Put-Call Ratio (both volume and OI based).

    Args:
        option_chain: List of options with volume, oi, option_type

    Returns:
        Dictionary with PCR values and interpretation
    """
    call_volume = sum(opt.get('volume', 0) or 0 for opt in option_chain if opt['option_type'] == 'CE')
    put_volume = sum(opt.get('volume', 0) or 0 for opt in option_chain if opt['option_type'] == 'PE')
    call_oi = sum(opt.get('oi', 0) or 0 for opt in option_chain if opt['option_type'] == 'CE')
    put_oi = sum(opt.get('oi', 0) or 0 for opt in option_chain if opt['option_type'] == 'PE')

    pcr_volume = round(put_volume / call_volume, 2) if call_volume > 0 else 0
    pcr_oi = round(put_oi / call_oi, 2) if call_oi > 0 else 0

    # Interpretation
    if pcr_oi > 1.2:
        sentiment = "BULLISH"
        description = "High put writing indicates bullish sentiment"
    elif pcr_oi < 0.8:
        sentiment = "BEARISH"
        description = "High call writing indicates bearish sentiment"
    else:
        sentiment = "NEUTRAL"
        description = "Balanced PCR indicates neutral sentiment"

    return {
        'pcr_volume': pcr_volume,
        'pcr_oi': pcr_oi,
        'call_volume': call_volume,
        'put_volume': put_volume,
        'call_oi': call_oi,
        'put_oi': put_oi,
        'sentiment': sentiment,
        'description': description
    }


def interpret_oi_buildup(
    oi_change: int,
    price_change: float,
    option_type: str
) -> str:
    """
    Interpret OI buildup based on OI and price changes.

    Args:
        oi_change: Change in open interest
        price_change: Change in underlying price
        option_type: 'CE' or 'PE'

    Returns:
        Interpretation string
    """
    if oi_change > 0:
        if price_change > 0:
            return "LONG_BUILDUP" if option_type == "CE" else "SHORT_BUILDUP"
        else:
            return "SHORT_BUILDUP" if option_type == "CE" else "LONG_BUILDUP"
    else:
        if price_change > 0:
            return "SHORT_COVERING" if option_type == "CE" else "LONG_UNWINDING"
        else:
            return "LONG_UNWINDING" if option_type == "CE" else "SHORT_COVERING"


# Singleton instance
bs = BlackScholes()
