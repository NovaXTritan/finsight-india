"""
Alternative Data Fetchers for Macro Economic Indicators

Sources:
- GST Collections (PIB Press Releases)
- Vehicle Sales (SIAM)
- Manufacturing/Services PMI
- Cement Production
- Power Generation (CEA)
"""

from .base_fetcher import BaseFetcher, MacroIndicator
from .gst_fetcher import GSTFetcher, gst_fetcher
from .auto_sales_fetcher import AutoSalesFetcher, auto_sales_fetcher
from .pmi_fetcher import PMIFetcher, pmi_fetcher
from .cement_fetcher import CementFetcher, cement_fetcher
from .power_fetcher import PowerFetcher, power_fetcher

__all__ = [
    'BaseFetcher',
    'MacroIndicator',
    'GSTFetcher',
    'gst_fetcher',
    'AutoSalesFetcher',
    'auto_sales_fetcher',
    'PMIFetcher',
    'pmi_fetcher',
    'CementFetcher',
    'cement_fetcher',
    'PowerFetcher',
    'power_fetcher',
]
