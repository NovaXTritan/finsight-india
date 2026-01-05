"""
Manual Validator - Log your actions on anomalies.
"""
import asyncio
from datetime import datetime

import config
from database.db import Database

async def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                  MANUAL VALIDATOR                            ║
║                                                              ║
║  Log your actions on detected anomalies.                     ║
║  This creates ground truth data for learning.                ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    db = Database()
    await db.connect()
    
    try:
        # Get pending anomalies
        pending = await db.get_pending_anomalies(config.USER_ID)
        
        if not pending:
            print("No pending anomalies to validate.\n")
            return
        
        print(f"Found {len(pending)} pending anomalies:\n")
        
        for i, anomaly in enumerate(pending, 1):
            print(f"─" * 60)
            print(f"[{i}] {anomaly['symbol']} - {anomaly['pattern_type']}")
            print(f"    Severity: {anomaly['severity']} (z={anomaly['z_score']:.1f})")
            print(f"    Price: ${anomaly['price']:.2f}")
            print(f"    Agent: {anomaly['agent_decision']} ({anomaly['agent_confidence']:.0%})")
            print(f"    Reason: {anomaly['agent_reason']}")
            print(f"    Time: {anomaly['detected_at']}")
            print()
            
            # Get action
            while True:
                action = input("    Your action [i]gnored / [r]eviewed / [t]raded / [s]kip: ").lower()
                if action in ["i", "r", "t", "s"]:
                    break
                print("    Invalid. Enter i, r, t, or s")
            
            if action == "s":
                continue
            
            action_map = {"i": "ignored", "r": "reviewed", "t": "traded"}
            notes = input("    Notes (optional): ").strip() or None
            
            await db.save_user_action(
                anomaly['id'],
                config.USER_ID,
                action_map[action],
                notes
            )
            print(f"    ✓ Logged: {action_map[action]}\n")
        
        print("\n✅ Validation complete!")
        
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(main())
