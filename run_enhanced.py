#!/usr/bin/env python3
"""
FinSight AI Agent - Enhanced Version

Key Upgrades:
1. Causal Learning (regime + horizon + timing)
2. Agent Decision Authority (IGNORE/MONITOR/REVIEW/EXECUTE)
3. Composite Confidence Scoring
4. Backtesting & Attribution
5. Failure Metrics

Usage:
    python run_enhanced.py              # Run once
    python run_enhanced.py --continuous # Run continuously
    python run_enhanced.py --test       # Test connections
    python run_enhanced.py --report     # Generate performance report
"""
import asyncio
import argparse
import logging
from datetime import datetime
import sys
import json

import config
from database.db import Database
from data.fetcher import SmartDataFetcher
from detection.detector import AnomalyDetector

# Indian market components
if config.MARKET == "INDIA":
    from data.india_fetcher import IndiaDataFetcher, fetch_india_market_summary
    from data.india_news import IndiaNewsAggregator, fetch_latest_news

# Enhanced components
from learning.causal_learner import (
    CausalLearner, RegimeDetector, RegimeContext,
    CausalOutcome, ConfidenceDecay
)
from agents.enhanced_agent import (
    EnhancedAgent, EnhancedDecision, DecisionState,
    CompositeConfidence, get_enhanced_agent
)
from tracking.outcome_tracker import OutcomeTracker
from tracking.backtester import Backtester, FailureMonitor, FailureMetrics

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
    market_name = "INDIA" if config.MARKET == "INDIA" else "US"
    print(f"""
+===================================================================+
|                                                                   |
|   FINSIGHT - AI-Powered Market Anomaly Detection                  |
|                                                                   |
|           ENHANCED AI AGENT - Causal Learning Edition             |
|                       Market: {market_name:^10}                          |
|                                                                   |
|   * Regime-Aware Detection                                        |
|   * Composite Confidence Scoring                                  |
|   * Agent Decision Authority                                      |
|   * Backtesting & Attribution                                     |
|                                                                   |
+===================================================================+
    """)


async def print_india_market_summary():
    """Print Indian market summary before detection run."""
    if config.MARKET != "INDIA":
        return

    print("\n[INDIAN MARKET SUMMARY]")
    print("=" * 60)

    try:
        summary = await fetch_india_market_summary()

        # Market Status
        status = "[OPEN]" if summary.get("market_open") else "[CLOSED]"
        print(f"Market Status: {status}")

        # Indices
        indices = summary.get("indices", {})
        if indices:
            print("\nMajor Indices:")
            for name, data in indices.items():
                if isinstance(data, dict):
                    value = data.get("value", 0)
                    change_pct = data.get("change_pct", 0)
                    arrow = "+" if change_pct >= 0 else "-"
                    color_code = "\033[92m" if change_pct >= 0 else "\033[91m"
                    reset = "\033[0m"
                    print(f"   {name:12} {value:>12,.2f} {color_code}{arrow} {change_pct:+.2f}%{reset}")

        # FII/DII
        fii_dii = summary.get("fii_dii")
        if fii_dii:
            print("\nFII/DII Activity (Cr):")
            fii_net = fii_dii.get("fii_net", 0)
            dii_net = fii_dii.get("dii_net", 0)
            fii_color = "\033[92m" if fii_net >= 0 else "\033[91m"
            dii_color = "\033[92m" if dii_net >= 0 else "\033[91m"
            reset = "\033[0m"
            print(f"   FII Net: {fii_color}{fii_net:+,.0f}{reset}")
            print(f"   DII Net: {dii_color}{dii_net:+,.0f}{reset}")

        # Top Gainers/Losers
        gainers = summary.get("top_gainers", [])
        losers = summary.get("top_losers", [])

        if gainers:
            print("\nTop Gainers:")
            for stock in gainers[:3]:
                if isinstance(stock, dict):
                    print(f"   {stock.get('symbol', 'N/A'):12} {stock.get('change_pct', 0):+.2f}%")

        if losers:
            print("\nTop Losers:")
            for stock in losers[:3]:
                if isinstance(stock, dict):
                    print(f"   {stock.get('symbol', 'N/A'):12} {stock.get('change_pct', 0):+.2f}%")

    except Exception as e:
        print(f"   Warning: Could not fetch market summary: {e}")

    print("=" * 60)


def print_decision(decision: EnhancedDecision, anomaly: dict):
    """Print decision with full context."""
    
    # State color coding (for terminals that support it)
    state_colors = {
        DecisionState.IGNORE: "\033[90m",    # Gray
        DecisionState.MONITOR: "\033[33m",   # Yellow
        DecisionState.REVIEW: "\033[36m",    # Cyan
        DecisionState.EXECUTE: "\033[32m",   # Green
    }
    reset = "\033[0m"
    
    color = state_colors.get(decision.state, "")
    
    print(f"\n{'='*70}")
    print(f">>> {anomaly['symbol']} - {anomaly['type'].upper()}")
    print(f"{'='*70}")
    
    # Decision state
    print(f"\n{color}[DECISION: {decision.state.value}]{reset}")
    
    # Confidence breakdown
    conf = decision.confidence
    print(f"\nCONFIDENCE: {conf.composite:.0%}")
    print(f"   - Statistical:  {conf.statistical:.0%} (signal strength)")
    print(f"   - Behavioral:   {conf.behavioral:.0%} (your history)")
    print(f"   - Regime:       {conf.regime:.0%} (market context)")
    print(f"   - Data Quality: {conf.data_quality:.0%}")
    print(f"   - Uncertainty:  {conf.uncertainty:.0%} (penalty)")

    # Reason
    print(f"\nREASON: {decision.reason}")
    
    # Authority actions
    if decision.rejected:
        print(f"\n[REJECTED]: {decision.rejection_reason.value if decision.rejection_reason else 'unknown'}")
    if decision.escalated:
        print(f"\n[ESCALATED]: {decision.escalation_reason.value if decision.escalation_reason else 'unknown'}")
    if decision.requested_more_data:
        print(f"\n[REQUESTED MORE DATA]")
    
    # Risk assessment
    print(f"\nRISK: {decision.risk_assessment}")
    
    # Invalidation
    print(f"\nINVALID IF: {decision.invalidation}")
    
    # Signal story
    if decision.story:
        print(f"\nSIGNAL STORY:")
        print(f"   Context: {decision.story.get('context', 'N/A')}")
        print(f"   Trigger: {decision.story.get('trigger', 'N/A')}")
    
    print(f"\n{'='*70}\n")


async def test_connections():
    """Test all connections including enhanced components."""
    print("\nTesting connections...\n")
    
    # Database
    print("1. Database...")
    try:
        db = Database()
        await db.connect()
        await db.close()
        print("   [OK] PostgreSQL connected")
    except Exception as e:
        print(f"   [FAIL] Database failed: {e}")
    
    # Enhanced Agent
    print("\n2. Enhanced Agent...")
    causal = CausalLearner()
    agent = get_enhanced_agent(causal_learner=causal)
    if agent.is_available():
        print("   [OK] LM Studio connected")
    else:
        print("   [WARN] LM Studio not running (will use rule-based decisions)")
    
    # Regime Detector
    print("\n3. Regime Detector...")
    detector = RegimeDetector()
    print("   [OK] Regime detector initialized")
    
    # Data Fetcher
    print("\n4. Data sources...")
    fetcher = SmartDataFetcher()
    df = fetcher.fetch("AAPL", period="5d", interval="5m")
    if df is not None and not df.empty:
        print(f"   [OK] Market data OK ({len(df)} rows)")
        
        # Test regime detection
        regime = detector.detect(df)
        print(f"   [OK] Current regime: {regime.regime.value}")
        print(f"   [OK] Volatility: {regime.volatility_percentile:.0f}th percentile")
        print(f"   [OK] Volume: {regime.volume_regime}")
    else:
        print("   [WARN] Market data unavailable")
    
    # Backtester
    print("\n5. Backtester...")
    backtester = Backtester()
    print("   [OK] Backtester initialized")
    
    print("\n[OK] Enhanced connection test complete!\n")


async def generate_report(db: Database, backtester: Backtester):
    """Generate comprehensive performance report."""
    print("\n[GENERATING PERFORMANCE REPORT...]")
    print("=" * 70)
    
    # Backtesting report
    report = backtester.generate_report()
    
    print("\nSUMMARY")
    print("-" * 40)
    for key, value in report["summary"].items():
        print(f"   {key.replace('_', ' ').title()}: {value}")

    print("\nAGENT ATTRIBUTION")
    print("-" * 40)
    for key, value in report["agent_attribution"].items():
        print(f"   {key.replace('_', ' ').title()}: {value}")

    print("\nPERFORMANCE BY PATTERN")
    print("-" * 40)
    for pattern_key, metrics in report["performance_by_pattern"].items():
        print(f"\n   {pattern_key}:")
        for key, value in metrics.items():
            if key not in ["pattern_type", "symbol"]:
                print(f"      {key.replace('_', ' ').title()}: {value}")
    
    # Failure metrics
    monitor = FailureMonitor(backtester)
    monitor.update()
    passing, status = monitor.check()
    
    print(f"\n{'='*70}")
    print(status)
    print(f"{'='*70}")
    
    return report


async def run_once():
    """Run detection cycle once with enhanced components."""
    print_banner()
    print(f"Started: {datetime.now()}")
    print(f"Market: {config.MARKET}")
    print(f"Tracking: {len(config.SYMBOLS)} symbols")
    print(f"User: {config.USER_ID}\n")

    # Print Indian market summary if in India mode
    if config.MARKET == "INDIA":
        await print_india_market_summary()
    
    # Initialize components
    db = Database()
    await db.connect()

    # Use appropriate fetcher based on market
    if config.MARKET == "INDIA":
        fetcher = IndiaDataFetcher()
    else:
        fetcher = SmartDataFetcher()

    detector = AnomalyDetector()
    regime_detector = RegimeDetector()
    
    # Enhanced components
    causal_learner = CausalLearner()
    agent = get_enhanced_agent(causal_learner=causal_learner)
    tracker = OutcomeTracker(db)
    backtester = Backtester()
    
    try:
        for symbol in config.SYMBOLS:
            # Display cleaner symbol name for Indian stocks
            display_symbol = symbol.replace(".NS", "").replace(".BO", "")
            print(f"\nChecking {display_symbol}...")

            # Fetch data (async to avoid blocking event loop)
            if config.MARKET == "INDIA":
                data = await fetcher.fetch_stock_data_async(symbol, period="5d", interval="5m")
            else:
                data = await fetcher.fetch_async(symbol, period="5d", interval="5m")

            if data is None or data.empty:
                print(f"   [WARN] No data for {display_symbol}")
                continue
            
            # Detect market regime
            regime_context = regime_detector.detect(data)
            print(f"   Regime: {regime_context.regime.value}")
            print(f"   Volatility: {regime_context.volatility_percentile:.0f}th percentile")
            print(f"   Trend: {regime_context.trend_strength:+.2%}")
            
            # Detect anomalies
            anomalies = await detector.detect(symbol, data)
            
            if not anomalies:
                print(f"   [OK] No anomalies")
                continue
            
            for anomaly in anomalies:
                # Get user history
                history = await db.get_pattern_quality(
                    config.USER_ID, anomaly.type, anomaly.symbol
                )
                
                # Enhanced agent decision
                decision = agent.decide(
                    anomaly={
                        "type": anomaly.type,
                        "symbol": anomaly.symbol,
                        "severity": anomaly.severity.value,
                        "z_score": anomaly.z_score,
                        "price": anomaly.price,
                        "volume": anomaly.volume
                    },
                    data={
                        "data_points": len(data),
                        "conflicting_signals": 0  # Could detect this
                    },
                    history=history,
                    context=regime_context
                )
                
                # Print detailed decision
                print_decision(decision, {
                    "symbol": anomaly.symbol,
                    "type": anomaly.type,
                    "z_score": anomaly.z_score
                })
                
                # Save to database
                await db.save_anomaly(
                    anomaly.id, anomaly.symbol, anomaly.type,
                    anomaly.severity.value, anomaly.z_score,
                    anomaly.price, anomaly.volume, anomaly.detected_at,
                    decision.state.value, decision.confidence.composite,
                    decision.reason
                )
                
                # Start outcome tracking for non-ignored anomalies
                if decision.state not in [DecisionState.IGNORE]:
                    await tracker.start_tracking(
                        anomaly.id, config.USER_ID, anomaly.symbol,
                        anomaly.price, decision.state.value,
                        decision.confidence.composite
                    )
        
        # Print agent stats
        agent.print_stats()
        
        # Wait for outcome tracking if any
        if tracker.tracking_tasks:
            print(f"\nTracking {len(tracker.tracking_tasks)} outcomes...")
            # Enable outcome tracking - critical for learning loop
            await asyncio.gather(*tracker.tracking_tasks.values(), return_exceptions=True)
    
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    finally:
        await db.close()
        # Close India fetcher if used
        if config.MARKET == "INDIA" and hasattr(fetcher, 'close'):
            await fetcher.close()

    print(f"\nComplete: {datetime.now()}")


async def run_continuous(interval_minutes: int = 5):
    """Run continuously with learning."""
    print(f"\nRunning continuously (every {interval_minutes} minutes)")
    print("   Learning is active - agent will improve over time")
    print("   Press Ctrl+C to stop\n")
    
    cycle = 0
    
    while True:
        try:
            cycle += 1
            print(f"\n{'='*70}")
            print(f"CYCLE {cycle} - {datetime.now()}")
            print(f"{'='*70}")
            
            await run_once()
            
            print(f"\nSleeping {interval_minutes} minutes...")
            await asyncio.sleep(interval_minutes * 60)
            
        except KeyboardInterrupt:
            print("\n\nStopped by user")
            break


async def show_report():
    """Show performance report."""
    print_banner()
    
    db = Database()
    await db.connect()
    
    backtester = Backtester()
    
    # Load historical trades from database
    outcomes = await db.get_recent_outcomes(config.USER_ID, days=30)
    
    if outcomes:
        print(f"Found {len(outcomes)} outcomes in last 30 days\n")
        
        for outcome in outcomes:
            backtester.record_trade(
                anomaly_id=outcome["anomaly_id"],
                symbol="UNKNOWN",  # Would need to join with anomalies table
                pattern_type="unknown",
                entry_price=100,  # Placeholder
                entry_time=outcome["created_at"],
                exit_price=100 * (1 + (outcome["return_1d"] or 0)),
                exit_time=outcome["created_at"],
                agent_decision=outcome["agent_decision"],
                user_action=outcome["user_action"]
            )
        
        await generate_report(db, backtester)
    else:
        print("No outcome data yet. Run the detector and validate some anomalies first!")
    
    await db.close()


def main():
    parser = argparse.ArgumentParser(
        description="FinSight Enhanced AI Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_enhanced.py              # Run detection once
    python run_enhanced.py --continuous # Run every 5 minutes
    python run_enhanced.py --test       # Test all connections
    python run_enhanced.py --report     # Show performance report
        """
    )
    parser.add_argument("--test", action="store_true", help="Test connections")
    parser.add_argument("--continuous", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=5, help="Minutes between runs")
    parser.add_argument("--report", action="store_true", help="Generate performance report")
    
    args = parser.parse_args()
    
    if args.test:
        asyncio.run(test_connections())
    elif args.report:
        asyncio.run(show_report())
    elif args.continuous:
        asyncio.run(run_continuous(args.interval))
    else:
        asyncio.run(run_once())


if __name__ == "__main__":
    main()
