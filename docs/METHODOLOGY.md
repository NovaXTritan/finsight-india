# Detection Methodology

## Z-Score Anomaly Detection

### Mathematical Basis

For each stock and each detection dimension, we compute:

```
Z = (X_t - μ_t) / σ_t

Where:
  X_t     = observed value at time t
  μ_t     = rolling mean over [t-20, t-1] (20 trading days)
  σ_t     = rolling standard deviation over [t-20, t-1]
```

A Z-score measures how many standard deviations an observation is from the recent mean. Under a normal distribution, |Z| > 2.0 occurs approximately 4.6% of the time, |Z| > 3.0 occurs 0.27% of the time, and |Z| > 4.0 occurs 0.006% of the time.

### Three Detection Dimensions

**1. Volume Spike**
```
Z_volume = (V_today - μ_20d_volume) / σ_20d_volume
```
Detects unusual trading activity that may indicate institutional positioning, block deals, or information-driven trading surges.

**2. Price Momentum**
```
Z_price = (R_today - μ_20d_returns) / σ_20d_returns

Where R_today = (Close_today - Close_yesterday) / Close_yesterday
```
Detects abnormal price movements beyond typical daily fluctuation.

**3. Volatility Surge**
```
Z_volatility = (Range_today - μ_20d_range) / σ_20d_range

Where Range_today = (High_today - Low_today) / Open_today
```
Detects abnormal intraday price ranges that may indicate uncertainty, institutional activity, or information processing by algorithmic participants.

### Severity Classification

| Level | Z-Score Range | Statistical Interpretation |
|-------|--------------|---------------------------|
| LOW | 2.0 – 2.5 | Notable deviation (~2.3% one-tailed probability under normality) |
| MEDIUM | 2.5 – 3.0 | Significant anomaly (~0.6% probability) |
| HIGH | 3.0 – 4.0 | Rare event (~0.13% probability) |
| CRITICAL | > 4.0 | Extreme outlier (~0.003% probability) |

### Why Z-Scores Over Machine Learning

The method choice is motivated by the theoretical framework:

1. **Computational Accessibility:** Z-scores require only basic arithmetic — no GPU, no cloud infrastructure, no model training. This makes the tool accessible to retail traders earning < ₹5L/year.

2. **Interpretability:** A Z-score of 5.44 has an immediately understandable meaning: "this value is 5.44 standard deviations from normal." ML model outputs require explanation layers that add complexity.

3. **Established Precedent:** Z-score-based statistical process control has decades of academic precedent (Montgomery, 2009). It is not a novel or experimental technique.

4. **Auditability:** Every signal can be independently verified by anyone with access to the same market data and a calculator.

5. **Design Philosophy:** If processing asymmetry is caused by computational barriers, the solution must *not* impose new computational barriers. Using deep learning to solve a computational access problem would be self-defeating.

### Known Limitations

**Stationarity Assumption:**
Rolling Z-scores assume local stationarity within the 20-day window — that the mean and variance are approximately stable over this period. Indian F&O markets exhibit regime shifts (pre/post-budget, earnings seasons, macro shocks) where this assumption weakens. Rolling normalization is a heuristic, not a distributional claim.

**Fat Tails:**
Financial returns are known to exhibit fat-tailed distributions (leptokurtosis). Under fat tails, extreme Z-scores are more common than the normal distribution suggests. For anomaly *detection* (not prediction), this means our severity thresholds are conservative — a Z=5.44 is extreme under *any* reasonable distribution, though the exact probability differs from normal distribution tables.

**Window Length:**
The 20-day window is a practical choice (approximately one trading month). Shorter windows increase sensitivity but also noise. Longer windows are more stable but slower to adapt. No optimality proof exists for this choice; it follows common practice in technical analysis.

**No Predictive Claim:**
FinSight detects anomalies — it does not predict direction. A CRITICAL volatility alert means "something unusual is happening," not "the stock will go up/down." The platform is a risk awareness tool, not a trade signal generator.

### Academic References

- Montgomery, D. C. (2009). *Statistical Quality Control: A Modern Introduction* (6th ed.). John Wiley & Sons.
- Zamanzadeh Darban, Z., Webb, G. I., Pan, S., et al. (2024). Deep learning for time series anomaly detection: A survey. *ACM Computing Surveys, 57(1)*, 1–42.
- Carlei, V., Furia, D., Cascioli, P., et al. (2026). AI-driven anomaly detection in stock markets. *Computational Economics.*
- Poutré, C., Diallo, T. M., Malo, S., & Bhatt, V. (2024). Deep unsupervised anomaly detection in HF markets. *Finance Research Letters, 63*, 105387.
