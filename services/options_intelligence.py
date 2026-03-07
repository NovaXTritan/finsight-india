"""
Options Flow Intelligence

Combines multiple F&O data points into actionable intelligence:
1. Unusual OI buildup detection
2. PCR shift analysis
3. Max pain divergence from spot
4. IV regime classification
5. Smart money positioning signals

Feeds into the triangulation scoring system as Level 4+ evidence.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class OptionsIntelligence:
    """Analyzes options data for smart money signals."""

    def __init__(self, options_data: Dict):
        """
        Initialize with raw option chain data.
        options_data should have: symbol, spot_price, options[], expiry_date, etc.
        """
        self.data = options_data
        self.spot = options_data.get("spot_price", 0)
        self.options = options_data.get("options", [])
        self.symbol = options_data.get("symbol", "")

    def analyze(self) -> Dict:
        """Run full options intelligence analysis."""
        result = {
            "symbol": self.symbol,
            "spot_price": self.spot,
            "expiry_date": self.data.get("expiry_date"),
            "signals": [],
            "summary": {},
        }

        pcr = self._analyze_pcr()
        if pcr:
            result["pcr"] = pcr
            if pcr.get("signal"):
                result["signals"].append(pcr["signal"])

        max_pain = self._analyze_max_pain()
        if max_pain:
            result["max_pain"] = max_pain
            if max_pain.get("signal"):
                result["signals"].append(max_pain["signal"])

        oi_signals = self._detect_unusual_oi()
        if oi_signals:
            result["unusual_oi"] = oi_signals
            result["signals"].extend(oi_signals)

        iv_analysis = self._analyze_iv()
        if iv_analysis:
            result["iv"] = iv_analysis
            if iv_analysis.get("signal"):
                result["signals"].append(iv_analysis["signal"])

        positioning = self._smart_money_positioning()
        if positioning:
            result["positioning"] = positioning
            if positioning.get("signal"):
                result["signals"].append(positioning["signal"])

        # Overall sentiment
        bullish = sum(1 for s in result["signals"] if s.get("bias") == "bullish")
        bearish = sum(1 for s in result["signals"] if s.get("bias") == "bearish")
        total = len(result["signals"])

        if total > 0:
            if bullish > bearish:
                result["summary"]["bias"] = "BULLISH"
                result["summary"]["strength"] = bullish / total
            elif bearish > bullish:
                result["summary"]["bias"] = "BEARISH"
                result["summary"]["strength"] = bearish / total
            else:
                result["summary"]["bias"] = "NEUTRAL"
                result["summary"]["strength"] = 0.5

        result["summary"]["total_signals"] = total
        result["timestamp"] = datetime.now().isoformat()

        return result

    def _analyze_pcr(self) -> Optional[Dict]:
        """Analyze Put-Call Ratio for sentiment."""
        ce_options = [o for o in self.options if o.get("option_type") == "CE"]
        pe_options = [o for o in self.options if o.get("option_type") == "PE"]

        total_ce_oi = sum(o.get("oi", 0) for o in ce_options)
        total_pe_oi = sum(o.get("oi", 0) for o in pe_options)
        total_ce_vol = sum(o.get("volume", 0) for o in ce_options)
        total_pe_vol = sum(o.get("volume", 0) for o in pe_options)

        if total_ce_oi == 0:
            return None

        pcr_oi = total_pe_oi / total_ce_oi
        pcr_vol = total_pe_vol / max(total_ce_vol, 1)

        result = {
            "pcr_oi": round(pcr_oi, 3),
            "pcr_volume": round(pcr_vol, 3),
            "total_ce_oi": total_ce_oi,
            "total_pe_oi": total_pe_oi,
        }

        # Extreme PCR readings are contrarian signals
        if pcr_oi > 1.5:
            result["signal"] = {
                "type": "pcr_extreme_high",
                "bias": "bullish",
                "description": f"PCR at {pcr_oi:.2f} — extreme put writing suggests bullish undertone (contrarian)",
                "strength": min((pcr_oi - 1.5) / 0.5, 1.0),
            }
        elif pcr_oi < 0.5:
            result["signal"] = {
                "type": "pcr_extreme_low",
                "bias": "bearish",
                "description": f"PCR at {pcr_oi:.2f} — excessive call buying suggests bearish caution (contrarian)",
                "strength": min((0.5 - pcr_oi) / 0.3, 1.0),
            }
        elif pcr_oi > 1.2:
            result["signal"] = {
                "type": "pcr_elevated",
                "bias": "bullish",
                "description": f"PCR at {pcr_oi:.2f} — moderately elevated, leaning bullish",
                "strength": 0.5,
            }

        return result

    def _analyze_max_pain(self) -> Optional[Dict]:
        """Analyze max pain divergence from spot."""
        strikes = sorted(set(o["strike"] for o in self.options if "strike" in o))
        if not strikes:
            return None

        # Calculate pain at each strike
        pain_values = {}
        for test_strike in strikes:
            total_pain = 0
            for opt in self.options:
                oi = opt.get("oi", 0)
                strike = opt.get("strike", 0)
                if opt.get("option_type") == "CE":
                    total_pain += max(0, test_strike - strike) * oi
                else:
                    total_pain += max(0, strike - test_strike) * oi
            pain_values[test_strike] = total_pain

        if not pain_values:
            return None

        max_pain_strike = min(pain_values, key=pain_values.get)
        distance_pct = ((self.spot - max_pain_strike) / max_pain_strike * 100) if max_pain_strike else 0

        result = {
            "max_pain": max_pain_strike,
            "spot": self.spot,
            "distance_pct": round(distance_pct, 2),
        }

        # Significant divergence from max pain
        if abs(distance_pct) > 2:
            if distance_pct > 0:
                result["signal"] = {
                    "type": "max_pain_above",
                    "bias": "bearish",
                    "description": f"Spot is {distance_pct:.1f}% above max pain ({max_pain_strike}). Price may gravitate lower toward expiry.",
                    "strength": min(abs(distance_pct) / 5, 1.0),
                }
            else:
                result["signal"] = {
                    "type": "max_pain_below",
                    "bias": "bullish",
                    "description": f"Spot is {abs(distance_pct):.1f}% below max pain ({max_pain_strike}). Price may drift higher toward expiry.",
                    "strength": min(abs(distance_pct) / 5, 1.0),
                }

        return result

    def _detect_unusual_oi(self) -> List[Dict]:
        """Detect strikes with unusual OI buildup."""
        signals = []

        ce_options = sorted(
            [o for o in self.options if o.get("option_type") == "CE" and o.get("oi", 0) > 0],
            key=lambda x: x.get("oi", 0), reverse=True
        )
        pe_options = sorted(
            [o for o in self.options if o.get("option_type") == "PE" and o.get("oi", 0) > 0],
            key=lambda x: x.get("oi", 0), reverse=True
        )

        if not ce_options or not pe_options:
            return signals

        # Check top CE resistance (highest call OI = resistance)
        top_ce = ce_options[0]
        if top_ce["oi"] > 0:
            signals.append({
                "type": "resistance_wall",
                "bias": "bearish" if top_ce["strike"] < self.spot * 1.02 else "neutral",
                "description": f"Heavy call OI at {top_ce['strike']} ({top_ce['oi']:,} contracts) — strong resistance",
                "strike": top_ce["strike"],
                "oi": top_ce["oi"],
                "strength": 0.6,
            })

        # Check top PE support (highest put OI = support)
        top_pe = pe_options[0]
        if top_pe["oi"] > 0:
            signals.append({
                "type": "support_wall",
                "bias": "bullish" if top_pe["strike"] > self.spot * 0.98 else "neutral",
                "description": f"Heavy put OI at {top_pe['strike']} ({top_pe['oi']:,} contracts) — strong support",
                "strike": top_pe["strike"],
                "oi": top_pe["oi"],
                "strength": 0.6,
            })

        # Detect unusual OI changes
        for opt in self.options:
            oi_change = opt.get("oi_change", 0)
            oi = opt.get("oi", 0)
            if oi > 0 and abs(oi_change) > oi * 0.3:  # >30% OI change
                opt_type = opt.get("option_type", "")
                strike = opt.get("strike", 0)
                if oi_change > 0:
                    bias = "bearish" if opt_type == "CE" else "bullish"
                    action = "writing" if opt_type == "CE" else "writing"
                else:
                    bias = "bullish" if opt_type == "CE" else "bearish"
                    action = "unwinding"

                signals.append({
                    "type": f"unusual_oi_{opt_type.lower()}",
                    "bias": bias,
                    "description": f"Unusual {opt_type} OI {action} at {strike}: {oi_change:+,} ({abs(oi_change)/oi*100:.0f}% change)",
                    "strike": strike,
                    "oi_change": oi_change,
                    "strength": min(abs(oi_change) / oi, 1.0),
                })

        return signals[:6]  # Limit to top 6

    def _analyze_iv(self) -> Optional[Dict]:
        """Analyze IV levels across the chain."""
        ivs = [o.get("iv", 0) for o in self.options if o.get("iv") and o["iv"] > 0]
        if not ivs:
            return None

        # ATM IV
        atm_strike = min(
            set(o["strike"] for o in self.options),
            key=lambda x: abs(x - self.spot),
            default=0
        )
        atm_options = [o for o in self.options if o.get("strike") == atm_strike and o.get("iv", 0) > 0]
        atm_iv = sum(o["iv"] for o in atm_options) / len(atm_options) if atm_options else 0

        import numpy as np
        iv_mean = float(np.mean(ivs))
        iv_std = float(np.std(ivs))

        result = {
            "atm_iv": round(atm_iv, 2),
            "chain_iv_mean": round(iv_mean, 2),
            "chain_iv_std": round(iv_std, 2),
        }

        if atm_iv > 30:
            result["regime"] = "HIGH"
            result["signal"] = {
                "type": "iv_high",
                "bias": "neutral",
                "description": f"ATM IV at {atm_iv:.1f}% — elevated volatility. Option premiums are expensive.",
                "strength": min((atm_iv - 30) / 20, 1.0),
            }
        elif atm_iv < 15:
            result["regime"] = "LOW"
            result["signal"] = {
                "type": "iv_low",
                "bias": "neutral",
                "description": f"ATM IV at {atm_iv:.1f}% — low volatility. Option premiums are cheap.",
                "strength": min((15 - atm_iv) / 10, 1.0),
            }
        else:
            result["regime"] = "NORMAL"

        return result

    def _smart_money_positioning(self) -> Optional[Dict]:
        """
        Infer smart money positioning from OI concentration.
        If put OI is concentrated near spot = strong support = bullish.
        If call OI is concentrated near spot = strong resistance = bearish.
        """
        near_strikes = [
            o for o in self.options
            if abs(o.get("strike", 0) - self.spot) / self.spot < 0.03  # Within 3%
        ]

        if not near_strikes:
            return None

        near_ce_oi = sum(o.get("oi", 0) for o in near_strikes if o.get("option_type") == "CE")
        near_pe_oi = sum(o.get("oi", 0) for o in near_strikes if o.get("option_type") == "PE")
        total_near = near_ce_oi + near_pe_oi

        if total_near == 0:
            return None

        ce_pct = near_ce_oi / total_near * 100
        pe_pct = near_pe_oi / total_near * 100

        result = {
            "near_ce_oi": near_ce_oi,
            "near_pe_oi": near_pe_oi,
            "ce_dominance_pct": round(ce_pct, 1),
            "pe_dominance_pct": round(pe_pct, 1),
        }

        if pe_pct > 65:
            result["signal"] = {
                "type": "smart_money_bullish",
                "bias": "bullish",
                "description": f"Near-ATM OI is {pe_pct:.0f}% puts — strong support being built. Smart money appears bullish.",
                "strength": min((pe_pct - 65) / 20, 1.0),
            }
        elif ce_pct > 65:
            result["signal"] = {
                "type": "smart_money_bearish",
                "bias": "bearish",
                "description": f"Near-ATM OI is {ce_pct:.0f}% calls — resistance ceiling being built. Smart money appears bearish.",
                "strength": min((ce_pct - 65) / 20, 1.0),
            }

        return result
