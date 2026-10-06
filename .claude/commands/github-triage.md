# /github-triage
Usage: /github-triage [--apply]
AI-powered classification of open GitHub issues into bug/feature/question/docs categories.
## Steps
1. Fetch all open issues from the current repository
2. Batch classify issues (15 per batch) using AI analysis
3. Assign categories: bug, feature, question, documentation
4. Suggest appropriate labels for each issue
5. Display results as a table with issue number, title, category, and confidence
6. If --apply flag is set, apply labels after user confirmation
