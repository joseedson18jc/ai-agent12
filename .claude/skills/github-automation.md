# GitHub Automation
AI-powered PR review, issue triage, standards checking, and summary generation.
## Instructions
- Use Octokit or gh CLI for GitHub API interactions
- For PR review: fetch diff, analyze per-file, return structured issues (severity, file, line, suggestion)
- For issue triage: batch classify open issues as bug/feature/question/docs
- For standards checking: combine heuristic checks (PR size, tests, commits) with AI analysis
- For PR summaries: analyze all commits and diffs, generate concise summary with key changes
- Use --post flag to optionally post comments to GitHub (human-in-the-loop)
- Use --apply flag to optionally apply labels (human-in-the-loop)
- Format output as GitHub-compatible Markdown with collapsible sections
- Rate findings by severity: critical, high, medium, low, info
