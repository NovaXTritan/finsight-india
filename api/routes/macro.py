"""
Macro Economic Indicators API Routes

Provides access to alternative data sources:
- GST Collections
- Auto Sales (SIAM)
- PMI Data
- Cement Production
- Power Generation
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import asyncio

# Import fetchers
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from data.alternative import (
    gst_fetcher,
    auto_sales_fetcher,
    pmi_fetcher,
    cement_fetcher,
    power_fetcher,
    MacroIndicator
)

router = APIRouter(prefix="/api/macro", tags=["Macro Indicators"])


# Pydantic models for API responses
class MacroIndicatorResponse(BaseModel):
    indicator_name: str
    indicator_category: str
    value: float
    unit: str
    period: str
    period_date: date
    yoy_change: Optional[float] = None
    mom_change: Optional[float] = None
    source: str
    source_url: str
    notes: str

    class Config:
        from_attributes = True


class MacroSummaryResponse(BaseModel):
    gst: List[MacroIndicatorResponse]
    auto_sales: List[MacroIndicatorResponse]
    pmi: List[MacroIndicatorResponse]
    cement: List[MacroIndicatorResponse]
    power: List[MacroIndicatorResponse]


class CategorySummary(BaseModel):
    category: str
    indicators: List[MacroIndicatorResponse]
    latest_period: str
    trend: str  # "improving", "stable", "declining"


def indicator_to_response(indicator: MacroIndicator) -> MacroIndicatorResponse:
    """Convert MacroIndicator dataclass to Pydantic response model."""
    return MacroIndicatorResponse(
        indicator_name=indicator.indicator_name,
        indicator_category=indicator.indicator_category,
        value=indicator.value,
        unit=indicator.unit,
        period=indicator.period,
        period_date=indicator.period_date,
        yoy_change=indicator.yoy_change,
        mom_change=indicator.mom_change,
        source=indicator.source,
        source_url=indicator.source_url,
        notes=indicator.notes
    )


def calculate_trend(indicators: List[MacroIndicatorResponse]) -> str:
    """Calculate trend based on YoY/MoM changes."""
    if not indicators:
        return "stable"

    # Get latest indicator with a change value
    for ind in indicators:
        if ind.yoy_change is not None:
            if ind.yoy_change > 2:
                return "improving"
            elif ind.yoy_change < -2:
                return "declining"
            return "stable"
        elif ind.mom_change is not None:
            if ind.mom_change > 1:
                return "improving"
            elif ind.mom_change < -1:
                return "declining"
            return "stable"

    return "stable"


@router.get("/all", response_model=MacroSummaryResponse)
async def get_all_macro_data(
    months: int = Query(default=3, ge=1, le=24, description="Number of months of data")
):
    """Get all macro indicators - GST, Auto Sales, PMI, Cement, Power."""
    try:
        # Fetch all data concurrently
        results = await asyncio.gather(
            gst_fetcher.fetch_historical(months),
            auto_sales_fetcher.fetch_historical(months),
            pmi_fetcher.fetch_historical(months),
            cement_fetcher.fetch_historical(months),
            power_fetcher.fetch_historical(months),
            return_exceptions=True
        )

        def safe_convert(result):
            if isinstance(result, Exception):
                print(f"Fetcher error: {result}")
                return []
            return [indicator_to_response(ind) for ind in result]

        return MacroSummaryResponse(
            gst=safe_convert(results[0]),
            auto_sales=safe_convert(results[1]),
            pmi=safe_convert(results[2]),
            cement=safe_convert(results[3]),
            power=safe_convert(results[4])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch macro data: {str(e)}")


@router.get("/latest", response_model=MacroSummaryResponse)
async def get_latest_macro_data():
    """Get the latest macro indicators from all sources."""
    try:
        results = await asyncio.gather(
            gst_fetcher.fetch_latest(),
            auto_sales_fetcher.fetch_latest(),
            pmi_fetcher.fetch_latest(),
            cement_fetcher.fetch_latest(),
            power_fetcher.fetch_latest(),
            return_exceptions=True
        )

        def safe_convert(result):
            if isinstance(result, Exception):
                print(f"Fetcher error: {result}")
                return []
            return [indicator_to_response(ind) for ind in result]

        return MacroSummaryResponse(
            gst=safe_convert(results[0]),
            auto_sales=safe_convert(results[1]),
            pmi=safe_convert(results[2]),
            cement=safe_convert(results[3]),
            power=safe_convert(results[4])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch macro data: {str(e)}")


@router.get("/gst", response_model=List[MacroIndicatorResponse])
async def get_gst_data(
    months: int = Query(default=12, ge=1, le=24, description="Number of months")
):
    """Get GST collection data."""
    try:
        indicators = await gst_fetcher.fetch_historical(months)
        return [indicator_to_response(ind) for ind in indicators]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch GST data: {str(e)}")


@router.get("/auto-sales", response_model=List[MacroIndicatorResponse])
async def get_auto_sales_data(
    months: int = Query(default=12, ge=1, le=24, description="Number of months"),
    category: Optional[str] = Query(default=None, description="PV, CV, 2W, or Total")
):
    """Get automobile sales data from SIAM."""
    try:
        indicators = await auto_sales_fetcher.fetch_historical(months)

        if category:
            indicators = [ind for ind in indicators if category.upper() in ind.indicator_name]

        return [indicator_to_response(ind) for ind in indicators]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch auto sales data: {str(e)}")


@router.get("/pmi", response_model=List[MacroIndicatorResponse])
async def get_pmi_data(
    months: int = Query(default=12, ge=1, le=24, description="Number of months"),
    pmi_type: Optional[str] = Query(default=None, description="Manufacturing, Services, or Composite")
):
    """Get PMI (Purchasing Managers' Index) data."""
    try:
        indicators = await pmi_fetcher.fetch_historical(months)

        if pmi_type:
            indicators = [ind for ind in indicators if pmi_type.lower() in ind.indicator_name.lower()]

        return [indicator_to_response(ind) for ind in indicators]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch PMI data: {str(e)}")


@router.get("/cement", response_model=List[MacroIndicatorResponse])
async def get_cement_data(
    months: int = Query(default=12, ge=1, le=24, description="Number of months")
):
    """Get cement production and dispatch data."""
    try:
        indicators = await cement_fetcher.fetch_historical(months)
        return [indicator_to_response(ind) for ind in indicators]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch cement data: {str(e)}")


@router.get("/power", response_model=List[MacroIndicatorResponse])
async def get_power_data(
    months: int = Query(default=12, ge=1, le=24, description="Number of months")
):
    """Get power generation data from CEA."""
    try:
        indicators = await power_fetcher.fetch_historical(months)
        return [indicator_to_response(ind) for ind in indicators]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch power data: {str(e)}")


@router.get("/summary", response_model=List[CategorySummary])
async def get_macro_summary():
    """Get a summary of all macro indicators with trends."""
    try:
        results = await asyncio.gather(
            gst_fetcher.fetch_historical(3),
            auto_sales_fetcher.fetch_historical(3),
            pmi_fetcher.fetch_historical(3),
            cement_fetcher.fetch_historical(3),
            power_fetcher.fetch_historical(3),
            return_exceptions=True
        )

        categories = [
            ("Tax Revenue", results[0]),
            ("Auto Industry", results[1]),
            ("Economic Activity", results[2]),
            ("Infrastructure - Cement", results[3]),
            ("Infrastructure - Power", results[4])
        ]

        summaries = []
        for category_name, result in categories:
            if isinstance(result, Exception):
                continue

            indicators = [indicator_to_response(ind) for ind in result]
            if indicators:
                latest_period = max(ind.period for ind in indicators)
                trend = calculate_trend(indicators)

                summaries.append(CategorySummary(
                    category=category_name,
                    indicators=indicators,
                    latest_period=latest_period,
                    trend=trend
                ))

        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch macro summary: {str(e)}")


@router.get("/indicator/{indicator_name}", response_model=List[MacroIndicatorResponse])
async def get_indicator_history(
    indicator_name: str,
    months: int = Query(default=12, ge=1, le=24, description="Number of months")
):
    """Get historical data for a specific indicator."""
    try:
        # Fetch all and filter by indicator name
        all_data = await asyncio.gather(
            gst_fetcher.fetch_historical(months),
            auto_sales_fetcher.fetch_historical(months),
            pmi_fetcher.fetch_historical(months),
            cement_fetcher.fetch_historical(months),
            power_fetcher.fetch_historical(months),
            return_exceptions=True
        )

        matching_indicators = []
        for result in all_data:
            if isinstance(result, Exception):
                continue
            for ind in result:
                if indicator_name.lower() in ind.indicator_name.lower():
                    matching_indicators.append(indicator_to_response(ind))

        if not matching_indicators:
            raise HTTPException(status_code=404, detail=f"Indicator '{indicator_name}' not found")

        # Sort by period descending
        matching_indicators.sort(key=lambda x: x.period, reverse=True)
        return matching_indicators
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch indicator: {str(e)}")


@router.get("/categories")
async def get_available_categories():
    """Get list of available indicator categories."""
    return {
        "categories": [
            {
                "name": "Tax Revenue",
                "indicators": ["GST Collection"],
                "source": "PIB - Ministry of Finance",
                "frequency": "Monthly"
            },
            {
                "name": "Auto Industry",
                "indicators": ["Passenger Vehicles", "Commercial Vehicles", "Two-Wheelers", "Total Auto Sales"],
                "source": "SIAM",
                "frequency": "Monthly"
            },
            {
                "name": "Economic Activity",
                "indicators": ["Manufacturing PMI", "Services PMI", "Composite PMI"],
                "source": "S&P Global",
                "frequency": "Monthly"
            },
            {
                "name": "Infrastructure - Cement",
                "indicators": ["Cement Production", "Cement Dispatch"],
                "source": "CMA",
                "frequency": "Monthly"
            },
            {
                "name": "Infrastructure - Power",
                "indicators": ["Power Generation", "Thermal PLF", "Peak Demand", "Peak Met"],
                "source": "Central Electricity Authority",
                "frequency": "Monthly"
            }
        ]
    }


# =============================================================================
# ECONOMIC HEALTH SCORECARD
# =============================================================================

class HealthComponent(BaseModel):
    name: str
    score: float
    max_score: float
    indicator: str
    value: float
    interpretation: str
    trend: str


class HealthScorecard(BaseModel):
    overall_score: float
    max_score: float
    rating: str
    components: List[HealthComponent]
    generated_at: str


@router.get("/health-score", response_model=HealthScorecard)
async def get_economic_health_score():
    """
    Calculate an economic health scorecard based on all macro indicators.

    Scoring breakdown:
    - Manufacturing PMI > 55: Strong (2/2), 50-55: Moderate (1.5/2), <50: Weak (0.5/2)
    - GST Growth > 10%: Strong (2/2), 5-10%: Moderate (1.5/2), <5%: Slow (1/2)
    - Auto Sales Growth > 10%: Strong (2/2), 0-10%: Moderate (1.5/2), <0%: Declining (0.5/2)
    - Power Generation Growth > 5%: Strong (2/2), 0-5%: Stable (1.5/2), <0%: Declining (0.5/2)
    - Cement Dispatch Growth > 5%: Strong (2/2), 0-5%: Stable (1.5/2), <0%: Declining (0.5/2)
    """
    from datetime import datetime

    try:
        results = await asyncio.gather(
            pmi_fetcher.fetch_latest(),
            gst_fetcher.fetch_latest(),
            auto_sales_fetcher.fetch_latest(),
            power_fetcher.fetch_latest(),
            cement_fetcher.fetch_latest(),
            return_exceptions=True
        )

        components = []

        # PMI Score
        pmi_data = results[0] if not isinstance(results[0], Exception) else []
        pmi_mfg = next((p for p in pmi_data if 'Manufacturing' in p.indicator_name), None)
        if pmi_mfg:
            pmi_value = pmi_mfg.value
            if pmi_value >= 55:
                pmi_score, interpretation = 2.0, "Strong expansion"
            elif pmi_value >= 50:
                pmi_score, interpretation = 1.5, "Moderate expansion"
            else:
                pmi_score, interpretation = 0.5, "Contraction"

            components.append(HealthComponent(
                name="Manufacturing",
                score=pmi_score,
                max_score=2.0,
                indicator="PMI",
                value=pmi_value,
                interpretation=interpretation,
                trend="improving" if pmi_value >= 55 else "stable" if pmi_value >= 50 else "declining"
            ))

        # GST Score
        gst_data = results[1] if not isinstance(results[1], Exception) else []
        gst = next((g for g in gst_data if 'GST' in g.indicator_name), None)
        if gst and gst.yoy_change is not None:
            gst_growth = gst.yoy_change
            if gst_growth >= 10:
                gst_score, interpretation = 2.0, "Strong tax buoyancy"
            elif gst_growth >= 5:
                gst_score, interpretation = 1.5, "Healthy growth"
            else:
                gst_score, interpretation = 1.0, "Moderate growth"

            components.append(HealthComponent(
                name="Tax Revenue",
                score=gst_score,
                max_score=2.0,
                indicator="GST Collection YoY",
                value=gst_growth,
                interpretation=interpretation,
                trend="improving" if gst_growth >= 10 else "stable" if gst_growth >= 0 else "declining"
            ))

        # Auto Sales Score
        auto_data = results[2] if not isinstance(results[2], Exception) else []
        auto = next((a for a in auto_data if 'Total' in a.indicator_name or 'PV' in a.indicator_name), None)
        if auto and auto.yoy_change is not None:
            auto_growth = auto.yoy_change
            if auto_growth >= 10:
                auto_score, interpretation = 2.0, "Strong consumer demand"
            elif auto_growth >= 0:
                auto_score, interpretation = 1.5, "Stable demand"
            else:
                auto_score, interpretation = 0.5, "Weakening demand"

            components.append(HealthComponent(
                name="Consumption",
                score=auto_score,
                max_score=2.0,
                indicator="Auto Sales YoY",
                value=auto_growth,
                interpretation=interpretation,
                trend="improving" if auto_growth >= 10 else "stable" if auto_growth >= 0 else "declining"
            ))

        # Power Generation Score
        power_data = results[3] if not isinstance(results[3], Exception) else []
        power = next((p for p in power_data if 'Generation' in p.indicator_name), None)
        if power and power.yoy_change is not None:
            power_growth = power.yoy_change
            if power_growth >= 5:
                power_score, interpretation = 2.0, "Strong industrial activity"
            elif power_growth >= 0:
                power_score, interpretation = 1.5, "Stable activity"
            else:
                power_score, interpretation = 0.5, "Slowing activity"

            components.append(HealthComponent(
                name="Industrial Activity",
                score=power_score,
                max_score=2.0,
                indicator="Power Gen YoY",
                value=power_growth,
                interpretation=interpretation,
                trend="improving" if power_growth >= 5 else "stable" if power_growth >= 0 else "declining"
            ))

        # Cement Score
        cement_data = results[4] if not isinstance(results[4], Exception) else []
        cement = next((c for c in cement_data if 'Dispatch' in c.indicator_name or 'Production' in c.indicator_name), None)
        if cement and cement.yoy_change is not None:
            cement_growth = cement.yoy_change
            if cement_growth >= 5:
                cement_score, interpretation = 2.0, "Strong infrastructure activity"
            elif cement_growth >= 0:
                cement_score, interpretation = 1.5, "Stable activity"
            else:
                cement_score, interpretation = 0.5, "Slowing construction"

            components.append(HealthComponent(
                name="Infrastructure",
                score=cement_score,
                max_score=2.0,
                indicator="Cement Dispatch YoY",
                value=cement_growth,
                interpretation=interpretation,
                trend="improving" if cement_growth >= 5 else "stable" if cement_growth >= 0 else "declining"
            ))

        # Calculate overall
        total_score = sum(c.score for c in components)
        max_score = sum(c.max_score for c in components)

        if max_score > 0:
            normalized = (total_score / max_score) * 10
        else:
            normalized = 5.0

        if normalized >= 8:
            rating = "Excellent"
        elif normalized >= 6.5:
            rating = "Good"
        elif normalized >= 5:
            rating = "Moderate"
        else:
            rating = "Weak"

        return HealthScorecard(
            overall_score=round(normalized, 1),
            max_score=10.0,
            rating=rating,
            components=components,
            generated_at=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate health score: {str(e)}")


# =============================================================================
# SECTOR CORRELATIONS & INSIGHTS
# =============================================================================

class SectorImpact(BaseModel):
    sector: str
    impact: str
    stocks: List[str]
    reasoning: str


class MacroInsight(BaseModel):
    indicator: str
    current_value: float
    change: Optional[float]
    signal: str
    sector_impacts: List[SectorImpact]


@router.get("/insights", response_model=List[MacroInsight])
async def get_macro_insights():
    """
    Get actionable insights based on macro indicators.

    Provides sector-wise impact analysis and stock suggestions.
    """
    try:
        results = await asyncio.gather(
            pmi_fetcher.fetch_latest(),
            gst_fetcher.fetch_latest(),
            auto_sales_fetcher.fetch_latest(),
            return_exceptions=True
        )

        insights = []

        # PMI Insights
        pmi_data = results[0] if not isinstance(results[0], Exception) else []
        pmi_mfg = next((p for p in pmi_data if 'Manufacturing' in p.indicator_name), None)
        if pmi_mfg:
            pmi_val = pmi_mfg.value
            if pmi_val >= 57:
                signal = "BULLISH"
                impacts = [
                    SectorImpact(
                        sector="Capital Goods",
                        impact="Strong Positive",
                        stocks=["LT", "SIEMENS", "ABB", "BHEL"],
                        reasoning="High PMI indicates strong order flows and capex cycle"
                    ),
                    SectorImpact(
                        sector="Auto",
                        impact="Positive",
                        stocks=["MARUTI", "M&M", "TATAMOTORS", "BAJAJ-AUTO"],
                        reasoning="Manufacturing expansion benefits auto production"
                    )
                ]
            elif pmi_val >= 50:
                signal = "NEUTRAL"
                impacts = [
                    SectorImpact(
                        sector="Industrials",
                        impact="Stable",
                        stocks=["LT", "SIEMENS"],
                        reasoning="Moderate expansion - selective opportunities"
                    )
                ]
            else:
                signal = "BEARISH"
                impacts = [
                    SectorImpact(
                        sector="Capital Goods",
                        impact="Negative",
                        stocks=["LT", "BHEL"],
                        reasoning="PMI contraction signals slowing industrial activity"
                    )
                ]

            insights.append(MacroInsight(
                indicator="Manufacturing PMI",
                current_value=pmi_val,
                change=pmi_mfg.mom_change,
                signal=signal,
                sector_impacts=impacts
            ))

        # GST Insights
        gst_data = results[1] if not isinstance(results[1], Exception) else []
        gst = next((g for g in gst_data if 'GST' in g.indicator_name), None)
        if gst:
            gst_val = gst.value
            gst_growth = gst.yoy_change or 0

            if gst_growth >= 12:
                signal = "BULLISH"
                impacts = [
                    SectorImpact(
                        sector="FMCG",
                        impact="Strong Positive",
                        stocks=["HINDUNILVR", "ITC", "BRITANNIA", "DABUR"],
                        reasoning="High GST collection indicates robust consumption"
                    ),
                    SectorImpact(
                        sector="Retail",
                        impact="Positive",
                        stocks=["TITAN", "DMART", "TRENT"],
                        reasoning="Consumer spending remains strong"
                    )
                ]
            elif gst_growth >= 5:
                signal = "NEUTRAL"
                impacts = [
                    SectorImpact(
                        sector="Consumer",
                        impact="Stable",
                        stocks=["HINDUNILVR", "ITC"],
                        reasoning="Consumption story intact with moderate growth"
                    )
                ]
            else:
                signal = "CAUTIOUS"
                impacts = [
                    SectorImpact(
                        sector="FMCG",
                        impact="Neutral to Negative",
                        stocks=["HINDUNILVR", "ITC"],
                        reasoning="Slowing GST growth may indicate consumption headwinds"
                    )
                ]

            insights.append(MacroInsight(
                indicator="GST Collection",
                current_value=gst_val,
                change=gst_growth,
                signal=signal,
                sector_impacts=impacts
            ))

        # Auto Sales Insights
        auto_data = results[2] if not isinstance(results[2], Exception) else []
        auto_pv = next((a for a in auto_data if 'PV' in a.indicator_name or 'Passenger' in a.indicator_name), None)
        if auto_pv:
            auto_growth = auto_pv.yoy_change or 0

            if auto_growth >= 15:
                signal = "BULLISH"
                impacts = [
                    SectorImpact(
                        sector="Auto OEMs",
                        impact="Strong Positive",
                        stocks=["MARUTI", "TATAMOTORS", "M&M"],
                        reasoning="Strong volume growth driving earnings"
                    ),
                    SectorImpact(
                        sector="Auto Ancillaries",
                        impact="Positive",
                        stocks=["BHARATFORG", "MOTHERSON", "BOSCHLTD"],
                        reasoning="OEM growth benefits ancillary suppliers"
                    )
                ]
            elif auto_growth >= 0:
                signal = "NEUTRAL"
                impacts = [
                    SectorImpact(
                        sector="Auto",
                        impact="Stable",
                        stocks=["MARUTI", "M&M"],
                        reasoning="Moderate growth - focus on market share gainers"
                    )
                ]
            else:
                signal = "BEARISH"
                impacts = [
                    SectorImpact(
                        sector="Auto",
                        impact="Negative",
                        stocks=["MARUTI", "TATAMOTORS"],
                        reasoning="Volume decline pressuring earnings"
                    )
                ]

            insights.append(MacroInsight(
                indicator="Auto Sales (PV)",
                current_value=auto_pv.value,
                change=auto_growth,
                signal=signal,
                sector_impacts=impacts
            ))

        return insights

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@router.get("/correlations")
async def get_sector_correlations():
    """
    Get historical correlations between macro indicators and sector performance.
    """
    return {
        "correlations": [
            {
                "indicator": "Manufacturing PMI",
                "positive_sectors": ["Capital Goods", "Auto", "Industrials"],
                "negative_sectors": ["Defensive (FMCG, Pharma)"],
                "correlation_strength": "High",
                "lag_months": 1,
                "description": "PMI above 55 historically leads to 5-8% outperformance in capital goods within 2 months"
            },
            {
                "indicator": "GST Collection",
                "positive_sectors": ["FMCG", "Retail", "Consumer Durables"],
                "negative_sectors": [],
                "correlation_strength": "Medium",
                "lag_months": 0,
                "description": "GST growth >12% correlates with strong retail stocks performance"
            },
            {
                "indicator": "Auto Sales",
                "positive_sectors": ["Auto OEMs", "Auto Ancillaries", "NBFCs (Vehicle Finance)"],
                "negative_sectors": [],
                "correlation_strength": "High",
                "lag_months": 0,
                "description": "PV sales growth directly impacts auto sector earnings and stock prices"
            },
            {
                "indicator": "Power Generation",
                "positive_sectors": ["Metals", "Cement", "Industrials"],
                "negative_sectors": [],
                "correlation_strength": "Medium",
                "lag_months": 0,
                "description": "Power demand growth indicates industrial activity levels"
            },
            {
                "indicator": "Cement Dispatch",
                "positive_sectors": ["Cement", "Infrastructure", "Real Estate"],
                "negative_sectors": [],
                "correlation_strength": "High",
                "lag_months": 0,
                "description": "Cement volumes directly correlate with construction activity"
            }
        ],
        "note": "Correlations are based on historical patterns and may not predict future performance"
    }
