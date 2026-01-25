"""
Base class for alternative data fetchers
"""
import aiohttp
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from dataclasses import dataclass
import re


@dataclass
class MacroIndicator:
    """Represents a single macro indicator data point."""
    indicator_name: str
    indicator_category: str
    value: float
    unit: str
    period: str  # e.g., "2024-01", "Q3-2024"
    period_date: date
    yoy_change: Optional[float] = None
    mom_change: Optional[float] = None
    source: str = ""
    source_url: str = ""
    notes: str = ""


class BaseFetcher(ABC):
    """Base class for all alternative data fetchers."""

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                headers=self.HEADERS,
                timeout=timeout
            )
        return self.session

    async def close(self):
        """Close the session."""
        if self.session and not self.session.closed:
            await self.session.close()

    async def fetch_url(self, url: str) -> Optional[str]:
        """Fetch HTML content from URL."""
        try:
            session = await self._get_session()
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                print(f"HTTP {response.status} for {url}")
                return None
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None

    @abstractmethod
    async def fetch_latest(self) -> List[MacroIndicator]:
        """Fetch the latest data. Must be implemented by subclasses."""
        pass

    @abstractmethod
    async def fetch_historical(self, months: int = 12) -> List[MacroIndicator]:
        """Fetch historical data. Must be implemented by subclasses."""
        pass

    @staticmethod
    def parse_indian_number(text: str) -> Optional[float]:
        """Parse Indian number format (lakhs, crores)."""
        if not text:
            return None

        text = text.strip().replace(',', '').replace(' ', '')

        # Handle lakh/crore suffixes
        multiplier = 1
        text_lower = text.lower()

        if 'lakh' in text_lower or 'lac' in text_lower:
            multiplier = 100000
            text = re.sub(r'[lL]akh?s?|[lL]acs?', '', text)
        elif 'crore' in text_lower or 'cr' in text_lower:
            multiplier = 10000000
            text = re.sub(r'[cC]rores?|[cC]r\.?', '', text)

        try:
            # Extract number
            match = re.search(r'[-+]?\d*\.?\d+', text)
            if match:
                return float(match.group()) * multiplier
        except ValueError:
            pass

        return None

    @staticmethod
    def parse_percentage(text: str) -> Optional[float]:
        """Parse percentage value."""
        if not text:
            return None

        text = text.strip().replace('%', '').replace(' ', '')

        try:
            match = re.search(r'[-+]?\d*\.?\d+', text)
            if match:
                return float(match.group())
        except ValueError:
            pass

        return None

    @staticmethod
    def period_to_date(period: str) -> date:
        """Convert period string to date."""
        period = period.strip()

        # Monthly format: "2024-01", "Jan 2024", "January 2024"
        month_patterns = [
            (r'(\d{4})-(\d{2})', lambda m: date(int(m.group(1)), int(m.group(2)), 1)),
            (r'(\d{2})/(\d{4})', lambda m: date(int(m.group(2)), int(m.group(1)), 1)),
            (r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})',
             lambda m: date(int(m.group(2)), BaseFetcher._month_to_num(m.group(1)), 1)),
        ]

        for pattern, converter in month_patterns:
            match = re.search(pattern, period, re.IGNORECASE)
            if match:
                return converter(match)

        # Quarterly format: "Q1-2024", "Q3 FY24"
        quarter_match = re.search(r'Q(\d)\s*[-\s]?\s*(?:FY)?(\d{2,4})', period, re.IGNORECASE)
        if quarter_match:
            q = int(quarter_match.group(1))
            year = int(quarter_match.group(2))
            if year < 100:
                year += 2000
            month = (q - 1) * 3 + 1
            return date(year, month, 1)

        # FY format: "FY24", "FY2024"
        fy_match = re.search(r'FY\s*(\d{2,4})', period, re.IGNORECASE)
        if fy_match:
            year = int(fy_match.group(1))
            if year < 100:
                year += 2000
            return date(year - 1, 4, 1)  # FY starts in April

        # Default to current date
        return date.today().replace(day=1)

    @staticmethod
    def _month_to_num(month_str: str) -> int:
        """Convert month name to number."""
        months = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        return months.get(month_str.lower()[:3], 1)
