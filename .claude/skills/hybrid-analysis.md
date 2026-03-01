# Hybrid Heuristic + AI Analysis
Two-phase approach: fast deterministic checks first, then deep AI analysis for complex cases.
## Instructions
- Phase 1 (Heuristic): Run fast regex/threshold checks that catch obvious issues instantly
- Phase 2 (AI): Send remaining ambiguous cases to Claude for deep analysis
- Combine scores from both phases for a unified result (weighted scoring)
- Use heuristics for: size limits, naming conventions, known anti-patterns, threshold violations
- Use AI for: semantic analysis, context-dependent logic, nuanced code review, root cause analysis
- This pattern reduces API costs by 60-80% — AI only runs on items that need it
- Apply to: code review, anomaly detection, security scanning, data validation
