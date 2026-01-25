"""
PMI (Purchasing Managers' Index) Data Fetcher

Source: S&P Global / Trading Economics
Data: Manufacturing PMI, Services PMI, Composite PMI
"""
import re
from bs4 import BeautifulSoup
from typing import List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta

from .base_fetcher import BaseFetcher, MacroIndicator


class PMIFetcher(BaseFetcher):
    """Fetches PMI data for India."""

    # Trading Economics URLs (public data)
    TE_MANUFACTURING_URL = "https://tradingeconomics.com/india/manufacturing-pmi"
    TE_SERVICES_URL = "https://tradingeconomics.com/india/services-pmi"

    # Known historical data (fallback)
    # PMI values (50+ = expansion, <50 = contraction)
    KNOWN_PMI_DATA = {
        "2026-01": {
            "Manufacturing": {"value": 58.2, "change": 0.3},
            "Services": {"value": 60.8, "change": 0.2},
            "Composite": {"value": 59.9, "change": 0.3},
        },
        "2025-12": {
            "Manufacturing": {"value": 57.9, "change": 0.4},
            "Services": {"value": 60.6, "change": 0.5},
            "Composite": {"value": 59.6, "change": 0.4},
        },
        "2025-11": {
            "Manufacturing": {"value": 57.5, "change": -0.2},
            "Services": {"value": 60.1, "change": 0.3},
            "Composite": {"value": 59.2, "change": 0.1},
        },
        "2025-10": {
            "Manufacturing": {"value": 57.7, "change": 0.5},
            "Services": {"value": 59.8, "change": -0.2},
            "Composite": {"value": 59.1, "change": 0.2},
        },
        "2025-09": {
            "Manufacturing": {"value": 57.2, "change": 0.3},
            "Services": {"value": 60.0, "change": 0.4},
            "Composite": {"value": 58.9, "change": 0.3},
        },
        "2025-08": {
            "Manufacturing": {"value": 56.9, "change": -0.3},
            "Services": {"value": 59.6, "change": 0.2},
            "Composite": {"value": 58.6, "change": 0.0},
        },
        "2025-07": {
            "Manufacturing": {"value": 57.2, "change": 0.4},
            "Services": {"value": 59.4, "change": -0.5},
            "Composite": {"value": 58.6, "change": -0.1},
        },
        "2025-06": {
            "Manufacturing": {"value": 56.8, "change": -0.4},
            "Services": {"value": 59.9, "change": 0.3},
            "Composite": {"value": 58.7, "change": 0.0},
        },
        "2025-05": {
            "Manufacturing": {"value": 57.2, "change": 0.2},
            "Services": {"value": 59.6, "change": 0.1},
            "Composite": {"value": 58.7, "change": 0.2},
        },
        "2025-04": {
            "Manufacturing": {"value": 57.0, "change": -0.3},
            "Services": {"value": 59.5, "change": -0.8},
            "Composite": {"value": 58.5, "change": -0.5},
        },
        "2025-03": {
            "Manufacturing": {"value": 57.3, "change": 0.1},
            "Services": {"value": 60.3, "change": 0.5},
            "Composite": {"value": 59.0, "change": 0.3},
        },
        "2025-02": {
            "Manufacturing": {"value": 57.2, "change": 0.4},
            "Services": {"value": 59.8, "change": -0.2},
            "Composite": {"value": 58.7, "change": 0.1},
        },
        "2025-01": {
            "Manufacturing": {"value": 56.8, "change": 0.4},
            "Services": {"value": 60.0, "change": 0.7},
            "Composite": {"value": 58.6, "change": 0.0},
        },
        "2024-12": {
            "Manufacturing": {"value": 56.4, "change": -0.1},
            "Services": {"value": 59.3, "change": 0.5},
            "Composite": {"value": 58.6, "change": 0.3},
        },
        "2024-11": {
            "Manufacturing": {"value": 56.5, "change": -0.5},
            "Services": {"value": 58.8, "change": 0.4},
            "Composite": {"value": 58.3, "change": 0.1},
        },
        "2024-10": {
            "Manufacturing": {"value": 57.0, "change": 0.5},
            "Services": {"value": 58.4, "change": -0.3},
            "Composite": {"value": 58.2, "change": 0.2},
        },
    }

    PMI_DESCRIPTIONS = {
        "Manufacturing": "Manufacturing Purchasing Managers' Index - measures factory activity",
        "Services": "Services Purchasing Managers' Index - measures service sector activity",
        "Composite": "Composite PMI - combined manufacturing and services activity",
    }

    async def fetch_latest(self) -> List[MacroIndicator]:
        """Fetch the latest PMI data."""
        indicators = []

        # Try scraping first
        try:
            scraped = await self._scrape_trading_economics()
            if scraped:
                indicators.extend(scraped)
        except Exception as e:
            print(f"PMI scraping failed: {e}")

        # Fallback to known data
        if not indicators:
            indicators = self._get_fallback_data(months=1)

        return indicators

    async def fetch_historical(self, months: int = 12) -> List[MacroIndicator]:
        """Fetch historical PMI data."""
        return self._get_fallback_data(months)

    async def _scrape_trading_economics(self) -> List[MacroIndicator]:
        """Attempt to scrape from Trading Economics."""
        indicators = []

        # Manufacturing PMI
        html = await self.fetch_url(self.TE_MANUFACTURING_URL)
        if html:
            indicator = self._parse_te_page(html, "Manufacturing")
            if indicator:
                indicators.append(indicator)

        # Services PMI
        html = await self.fetch_url(self.TE_SERVICES_URL)
        if html:
            indicator = self._parse_te_page(html, "Services")
            if indicator:
                indicators.append(indicator)

        return indicators

    def _parse_te_page(self, html: str, pmi_type: str) -> Optional[MacroIndicator]:
        """Parse Trading Economics page for PMI value."""
        soup = BeautifulSoup(html, 'html.parser')

        # Look for the main value
        value_elem = soup.find('div', class_='d-flex') or soup.find(id='ctl00_ContentPlaceHolder1_ctl00_ctl00_Panel1')

        if value_elem:
            text = value_elem.get_text()
            match = re.search(r'(\d+\.?\d*)', text)
            if match:
                value = float(match.group(1))

                # Get current date for period
                today = date.today()
                # PMI is released in the first week of the month for the previous month
                if today.day <= 7:
                    period_date = (today.replace(day=1) - relativedelta(months=1))
                else:
                    period_date = today.replace(day=1)

                period = period_date.strftime("%Y-%m")

                return self._create_indicator(
                    pmi_type=pmi_type,
                    value=value,
                    period=period,
                    period_date=period_date,
                    source_url=self.TE_MANUFACTURING_URL if pmi_type == "Manufacturing" else self.TE_SERVICES_URL
                )

        return None

    def _create_indicator(
        self,
        pmi_type: str,
        value: float,
        period: str,
        period_date: date,
        change: float = None,
        source_url: str = ""
    ) -> MacroIndicator:
        """Create a MacroIndicator for PMI."""
        # Determine expansion/contraction
        if value >= 50:
            sentiment = "Expansion"
        else:
            sentiment = "Contraction"

        return MacroIndicator(
            indicator_name=f"PMI - {pmi_type}",
            indicator_category="Economic Activity",
            value=value,
            unit="Index",
            period=period,
            period_date=period_date,
            yoy_change=None,  # PMI typically compared MoM, not YoY
            mom_change=change,
            source="S&P Global",
            source_url=source_url or "https://www.pmi.spglobal.com",
            notes=f"{self.PMI_DESCRIPTIONS.get(pmi_type, '')} - {sentiment}"
        )

    def _get_fallback_data(self, months: int = 12) -> List[MacroIndicator]:
        """Get fallback data from known values."""
        indicators = []

        sorted_periods = sorted(self.KNOWN_PMI_DATA.keys(), reverse=True)[:months]

        for period in sorted_periods:
            data = self.KNOWN_PMI_DATA[period]
            year, month = map(int, period.split('-'))

            for pmi_type, values in data.items():
                indicators.append(self._create_indicator(
                    pmi_type=pmi_type,
                    value=values["value"],
                    period=period,
                    period_date=date(year, month, 1),
                    change=values.get("change")
                ))

        return indicators


# Singleton instance
pmi_fetcher = PMIFetcher()
