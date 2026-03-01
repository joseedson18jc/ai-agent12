# Project Configuration

## Skills (120 installed)

All skills are in `.claude/skills/` as portable markdown files.
Copy this directory to any Claude Code project to enable all skills.

### Categories
- **Document & File Processing** (7): pdf, docx, xlsx, pptx, nutrient-document-processing, visa-doc-translate, pdf-excel-reports
- **Testing & Quality** (10): test-driven-development, webapp-testing, condition-based-waiting, testing-anti-patterns, e2e-testing-skill, snapshot-testing, tdd-workflow, e2e-testing, verification-loop, eval-harness
- **Debugging & Troubleshooting** (5): systematic-debugging, root-cause-tracing, verification-before-completion, defense-in-depth, performance-profiling
- **Collaboration & Workflow** (8): requesting-code-review, receiving-code-review, using-git-worktrees, finishing-a-development-branch, brainstorming, writing-plans, executing-plans, human-in-the-loop
- **Development & Architecture** (10): mcp-builder, artifacts-builder, api-development, database-migration, refactoring-patterns, api-design, content-hash-cache-pattern, search-first, strategic-compact, github-automation
- **Security & Performance** (6): security-review, dependency-audit, performance-optimization, load-testing, security-scan, security-review-ecc
- **Documentation & Automation** (3): documentation-generator, changelog-automation, ci-cd-integration
- **Media & Content Creation** (4): canvas-design, slack-gif-creator, algorithmic-art, video-editing-helper
- **Data & Analysis** (4): data-visualization, sql-query-builder, csv-processing, structured-data-extraction
- **Writing & Research** (4): brand-guidelines, internal-comms, research-assistant, technical-writing
- **Meta Skills** (10): skill-creator, template-skill, writing-skills, sharing-skills, testing-skills-with-subagents, subagent-driven-development, configure-ecc, skill-stocktake, project-guidelines-example, auto-update-skills
- **Language Patterns** (12): typescript-patterns, python-patterns, golang-patterns, java-coding-standards, cpp-coding-standards, cpp-testing, python-testing, golang-testing, swift-concurrency, swift-actor-persistence, swift-protocol-di-testing, coding-standards
- **Infrastructure & DevOps** (7): docker-patterns, deployment-patterns, database-migrations, postgres-patterns, clickhouse-io, self-healing-systems, graceful-degradation
- **Framework Patterns** (14): django-patterns, django-security, django-tdd, django-verification, springboot-patterns, springboot-security, springboot-tdd, springboot-verification, jpa-patterns, swiftui-patterns, frontend-patterns, backend-patterns, frontend-slides, liquid-glass-design
- **Business & Content** (5): article-writing, content-engine, investor-materials, investor-outreach, market-research
- **AI & ML Patterns** (10): cost-aware-llm-pipeline, foundation-models-on-device, iterative-retrieval, continuous-learning, continuous-learning-v2, regex-vs-llm-structured-text, ai-sdk-patterns, hybrid-analysis, multi-agent-pipeline, nl-to-api

## Agents (18 installed)

All agent configs are in `.claude/agents/`. Each agent has a specialized role.

- **planner** - Strategic planning and task decomposition
- **architect** - System design and trade-off analysis
- **chief-of-staff** - Cross-agent coordination and priority management
- **code-reviewer** - Code quality, correctness, and performance review
- **security-reviewer** - OWASP scanning and red-team/blue-team security audits
- **database-reviewer** - Schema, query, and migration review
- **tdd-guide** - Test-driven development coaching
- **e2e-runner** - End-to-end test execution with Playwright/Cypress
- **build-error-resolver** - Automatic build failure diagnosis and fixing
- **refactor-cleaner** - Dead code removal and systematic refactoring
- **doc-updater** - Documentation synchronization with code changes
- **go-reviewer** - Go language specialist
- **go-build-resolver** - Go build issue resolution
- **python-reviewer** - Python language specialist
- **update-scout** - Skills ecosystem researcher: discovers, evaluates, and integrates new skills weekly
- **content-pipeline** - Multi-stage content producer (research→write→edit→SEO)
- **data-extractor** - Structured data extraction from text, HTML, PDFs with schema validation
- **github-automator** - GitHub PR review, issue triage, standards checking, and PR summaries

## Commands (39 installed)

All command configs are in `.claude/commands/`. Use as slash commands.

### Planning & Execution
- `/plan` - Create implementation plan
- `/checkpoint` - Save progress checkpoint
- `/verify` - Run full verification loop (lint + type-check + test + build)

### Testing & Coverage
- `/tdd` - Start TDD workflow
- `/e2e` - Run E2E tests
- `/test-coverage` - Generate coverage report
- `/eval` - Run evaluation harness
- `/learn-eval` - Evaluate learned patterns

### Review & Quality
- `/code-review` - Comprehensive code review
- `/security-scan` - Security audit (102 rules)
- `/refactor-clean` - Dead code removal and cleanup
- `/update-docs` - Sync documentation with code
- `/update-codemaps` - Regenerate dependency graphs

### Build & Fix
- `/build-fix` - Auto-fix build failures
- `/claw` - Configuration management
- `/setup-pm` - Detect and configure package manager

### Learning & Memory
- `/learn` - Extract and save session patterns
- `/evolve` - Evolve instincts with confidence scoring
- `/instinct-export` - Export instincts to JSON
- `/instinct-import` - Import instincts from JSON
- `/instinct-status` - Show instinct dashboard
- `/skill-create` - Generate skill from git history

### Multi-Agent Orchestration
- `/multi-plan` - Create multi-agent execution plan
- `/multi-execute` - Execute with git worktree isolation
- `/multi-frontend` - Frontend multi-agent workflow
- `/multi-backend` - Backend multi-agent workflow
- `/multi-workflow` - Custom workflow builder
- `/orchestrate` - Auto-select agents and execute

### Workflow & Sessions
- `/sessions` - Manage session states
- `/pm2` - Process manager integration
- `/auto-update` - Discover and integrate new skills from the community
- `/extract-data` - AI-powered structured data extraction from text/files/URLs
- `/content-create` - Multi-stage content pipeline (research→write→edit→SEO)
- `/github-triage` - AI classification of GitHub issues (bug/feature/question/docs)
- `/health-check` - System health monitoring with AI root cause analysis

### Language-Specific
- `/go-build` - Go build with module resolution
- `/go-test` - Go tests with race detection
- `/go-review` - Go idiomatic review
- `/python-review` - Python type hint and convention review

## Project Rules

### Code Style
- TypeScript with strict mode
- React with functional components and hooks
- Tailwind CSS for styling
- shadcn/ui component library

### Quality Gates
- All code must pass `tsc --noEmit` (zero type errors)
- All code must pass `vite build` (production build)
- Prefer editing existing files over creating new ones
- Keep changes minimal and focused

### Git Workflow
- Commit messages: imperative mood, explain WHY not WHAT
- One concern per commit
- Always verify build before pushing
