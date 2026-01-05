"""
FinSight Dashboard - Streamlit visualization.
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import asyncio
import sys
sys.path.insert(0, "..")

import config
from database.db import Database

st.set_page_config(
    page_title="FinSight Dashboard",
    page_icon="📊",
    layout="wide"
)

@st.cache_resource
def get_db():
    db = Database()
    asyncio.get_event_loop().run_until_complete(db.connect())
    return db

def main():
    st.title("📊 FinSight Dashboard")
    st.markdown("AI Agent Performance & Signal Quality")
    
    # Sidebar
    st.sidebar.header("Settings")
    user_id = st.sidebar.text_input("User ID", config.USER_ID)
    days = st.sidebar.slider("Days to show", 7, 90, 30)
    
    db = get_db()
    
    # Metrics row
    col1, col2, col3, col4 = st.columns(4)
    
    # Get stats
    outcomes = asyncio.get_event_loop().run_until_complete(
        db.get_recent_outcomes(user_id, days)
    )
    
    if outcomes:
        df = pd.DataFrame(outcomes)
        
        col1.metric("Total Anomalies", len(df))
        col2.metric("Agent Accuracy", f"{df['agent_correct'].mean()*100:.1f}%")
        col3.metric("Profitable Signals", f"{df['was_profitable'].mean()*100:.1f}%")
        col4.metric("Avg Return", f"{df['return_1d'].mean()*100:.2f}%")
        
        # Charts
        st.subheader("Agent Decision Distribution")
        decision_counts = df["agent_decision"].value_counts()
        fig1 = px.pie(
            values=decision_counts.values,
            names=decision_counts.index,
            color_discrete_sequence=["#2ecc71", "#f1c40f", "#e74c3c"]
        )
        st.plotly_chart(fig1, use_container_width=True)
        
        st.subheader("Returns Over Time")
        df["date"] = pd.to_datetime(df["created_at"]).dt.date
        daily_returns = df.groupby("date")["return_1d"].mean().reset_index()
        fig2 = px.line(daily_returns, x="date", y="return_1d")
        st.plotly_chart(fig2, use_container_width=True)
        
        st.subheader("Recent Outcomes")
        st.dataframe(
            df[["anomaly_id", "agent_decision", "user_action", 
                "return_1d", "was_profitable", "agent_correct"]].head(20),
            use_container_width=True
        )
    else:
        st.info("No outcome data yet. Run the detector and validate some anomalies!")
    
    # Pattern quality
    st.subheader("Pattern Quality Scores")
    patterns = asyncio.get_event_loop().run_until_complete(
        db.pool.fetch("""
            SELECT * FROM pattern_quality WHERE user_id = $1
        """, user_id)
    )
    
    if patterns:
        df_patterns = pd.DataFrame(patterns)
        st.dataframe(df_patterns, use_container_width=True)
    else:
        st.info("No pattern quality data yet.")

if __name__ == "__main__":
    main()
