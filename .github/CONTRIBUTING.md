# Contributing to FinSight India

Thank you for your interest in contributing to FinSight India.

## Research Context

This project is an academic research artifact developed for IMSICON 2026. Contributions should align with the project's academic goals and maintain the integrity of the research methodology.

## How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or suggest improvements
- Include steps to reproduce any bugs
- Note which component is affected (backend, frontend, detection engine)

### Code Contributions
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Follow existing code style and add docstrings
4. Ensure no API keys or secrets are committed
5. Test your changes locally
6. Submit a pull request with a clear description

### Areas Where Help Is Needed

| Area | Priority | Description |
|------|----------|-------------|
| Automated Scheduling | High | Implement cron-based detection pipeline execution |
| Cloud LLM Integration | High | Replace LM Studio dependency with API-based LLM |
| Backtesting Engine | Medium | Systematic validation of detection signals across historical data |
| False Positive Analysis | Medium | Compute false positive rates for Z-score thresholds |
| Deployment | Medium | Docker configuration for one-click deployment |
| Telegram Bot | Low | Alert delivery via Telegram |

## Code Standards

- Python: Follow PEP 8. Use type hints. Include docstrings.
- TypeScript: Follow existing Next.js conventions. Use TypeScript strict mode.
- All detection logic changes must preserve the Z-score methodology — do not replace with ML without discussion.
- Every new data source integration must include error handling and rate limiting.

## Academic Attribution

If you make significant contributions to the codebase, you may be acknowledged in future publications. Please indicate in your PR if you would like to be acknowledged and how you'd like to be credited.
