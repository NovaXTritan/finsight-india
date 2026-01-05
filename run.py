#!/usr/bin/env python3
"""
FinSight AI Agent - Main Entry Point

Usage:
    python run.py              # Run once
    python run.py --continuous # Run continuously
    python run.py --test       # Test connections
"""
import asyncio
import argparse
import logging
from datetime import datetime
import sys

import config
from database.db import Database
from data.fetcher import SmartDataFetcher
from detection.detector import AnomalyDetector
from agents.lm_studio_agent import get_agent
from tracking.outcome_tracker import OutcomeTracker

# Setup logging
logging.basicConfig(
    level=config.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███████╗██╗███╗   ██╗███████╗██╗ ██████╗ ██╗  ██╗████████╗  ║
║   ██╔════╝██║████╗  ██║██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝  ║
║   █████╗  ██║██╔██╗ ██║███████╗██║██║  ███╗███████║   ██║     ║
║   ██╔══╝  ██║██║╚██╗██║╚════██║██║██║   ██║██╔══██║   ██║     ║
║   ██║     ██║██║ ╚████║███████║██║╚██████╔╝██║  ██║   ██║     ║
║   ╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝     ║
║                                                               ║
║              AI Agent - Learning What Matters                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    """)

async def test_connections():
    """Test all connections."""
    print("\n🔌 Testing connections...\n")
    
    # Database
    print("1. Database...")
    try:
        db = Database()
        await db.connect()
        await db.close()
        print("   ✓ PostgreSQL connected")
    except Exception as e:
        print(f"   ✗ Database failed: {e}")
    
    # LM Studio
    print("\n2. LM Studio...")
    agent = get_agent()
    if agent.is_available():
        print("   ✓ LM Studio connected")
    else:
        print("   ⚠ LM Studio not running (will use heuristics)")
    
    # Data fetcher
    print("\n3. Data sources...")
    fetcher = SmartDataFetcher()
    df = fetcher.fetch("AAPL", period="1d", interval="5m")
    if df is not None and not df.empty:
        print(f"   ✓ Market data OK ({len(df)} rows)")
    else:
        print("   ⚠ Market data unavailable (market may be closed)")
    
    print("\n✅ Connection test complete!\n")

async def run_once():
    """Run detection cycle once."""
    print_banner()
    print(f"⏰ Started: {datetime.now()}")
    print(f"🎯 Tracking: {', '.join(config.SYMBOLS)}\n")
    
    # Initialize
    db = Database()
    await db.connect()
    
    fetcher = SmartDataFetcher()
    detector = AnomalyDetector()
    agent = get_agent()
    tracker = OutcomeTracker(db)
    
    try:
        for symbol in config.SYMBOLS:
            print(f"\n📈 Checking {symbol}...")
            
            # Fetch data
            data = fetcher.fetch(symbol, period="5d", interval="5m")
            if data is None or data.empty:
                print(f"   ⚠ No data for {symbol}")
                continue
            
            # Detect anomalies
            anomalies = await detector.detect(symbol, data)
            
            if not anomalies:
                print(f"   ✓ No anomalies")
                continue
            
            for anomaly in anomalies:
                print(f"\n{'='*60}")
                print(f"🚨 {anomaly.symbol} - {anomaly.type}")
                print(f"   Severity: {anomaly.severity.value} (z={anomaly.z_score})")
                print(f"   {anomaly.description}")
                
                # Get user history
                history = await db.get_pattern_quality(
                    config.USER_ID, anomaly.type, anomaly.symbol
                )
                
                # Agent decision
                decision = agent.decide(
                    {
                        "type": anomaly.type,
                        "symbol": anomaly.symbol,
                        "severity": anomaly.severity.value,
                        "z_score": anomaly.z_score,
                        "price": anomaly.price,
                        "volume": anomaly.volume
                    },
                    {},
                    history
                )
                
                print(f"\n🤖 Decision: {decision.action.value}")
                print(f"   Confidence: {decision.confidence:.0%}")
                print(f"   Reason: {decision.reason}")
                
                # Save to database
                await db.save_anomaly(
                    anomaly.id, anomaly.symbol, anomaly.type,
                    anomaly.severity.value, anomaly.z_score,
                    anomaly.price, anomaly.volume, anomaly.detected_at,
                    decision.action.value, decision.confidence, decision.reason
                )
                
                # Start outcome tracking for non-ignored anomalies
                if decision.action.value != "IGNORE":
                    await tracker.start_tracking(
                        anomaly.id, config.USER_ID, anomaly.symbol,
                        anomaly.price, decision.action.value, decision.confidence
                    )
        
        # Print agent stats
        agent.print_stats()
        
        # Wait for outcome tracking if any
        if tracker.tracking_tasks:
            print(f"\n📊 Tracking {len(tracker.tracking_tasks)} outcomes in background...")
            await asyncio.gather(*tracker.tracking_tasks.values(), return_exceptions=True)
    
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    finally:
        await db.close()
    
    print(f"\n✅ Complete: {datetime.now()}")

async def run_continuous(interval_minutes: int = 5):
    """Run continuously."""
    print(f"\n🔄 Running continuously (every {interval_minutes} minutes)")
    print("   Press Ctrl+C to stop\n")
    
    while True:
        try:
            await run_once()
            print(f"\n⏳ Sleeping {interval_minutes} minutes...\n")
            await asyncio.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            print("\n\nStopped by user")
            break

def main():
    parser = argparse.ArgumentParser(description="FinSight AI Agent")
    parser.add_argument("--test", action="store_true", help="Test connections")
    parser.add_argument("--continuous", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=5, help="Minutes between runs")
    
    args = parser.parse_args()
    
    if args.test:
        asyncio.run(test_connections())
    elif args.continuous:
        asyncio.run(run_continuous(args.interval))
    else:
        asyncio.run(run_once())

if __name__ == "__main__":
    main()
