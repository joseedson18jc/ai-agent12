export interface ClaudeCommand {
  id: number;
  name: string;
  description: string;
  category: CommandCategory;
  usage: string;
  source: string;
  sourceUrl: string;
}

export type CommandCategory = 'planning' | 'testing' | 'review' | 'build' | 'learning' | 'orchestration' | 'workflow' | 'language';

export interface CommandCategoryInfo {
  id: CommandCategory;
  label: string;
  icon: string;
  description: string;
}

export const commandCategories: CommandCategoryInfo[] = [
  { id: 'planning', label: 'Planning & Execution', icon: '📋', description: 'Implementation planning and step-by-step execution' },
  { id: 'testing', label: 'Testing & Coverage', icon: '🧪', description: 'TDD workflows, E2E tests, and coverage reports' },
  { id: 'review', label: 'Review & Quality', icon: '🔍', description: 'Code review, security scanning, and refactoring' },
  { id: 'build', label: 'Build & Fix', icon: '🔨', description: 'Build error resolution and verification' },
  { id: 'learning', label: 'Learning & Memory', icon: '🧠', description: 'Continuous learning, instincts, and pattern extraction' },
  { id: 'orchestration', label: 'Multi-Agent Orchestration', icon: '🎭', description: 'Parallel multi-agent workflows and coordination' },
  { id: 'workflow', label: 'Workflow & Sessions', icon: '⚡', description: 'Session management, PM2, and utility operations' },
  { id: 'language', label: 'Language-Specific', icon: '🌐', description: 'Language-specific builds, tests, and reviews' },
];

export const claudeCommands: ClaudeCommand[] = [
  // Planning & Execution
  {
    id: 1,
    name: '/plan',
    description: 'Creates a detailed implementation plan with task decomposition, dependencies, and risk assessment before writing any code.',
    category: 'planning',
    usage: '/plan <feature description>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 2,
    name: '/checkpoint',
    description: 'Saves current progress as a named checkpoint for later restoration. Useful for experimental branches and safe rollbacks.',
    category: 'planning',
    usage: '/checkpoint <name>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 3,
    name: '/verify',
    description: 'Runs the full verification loop: lint, type-check, test, and build. Ensures all quality gates pass before marking work complete.',
    category: 'planning',
    usage: '/verify',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Testing & Coverage
  {
    id: 4,
    name: '/tdd',
    description: 'Starts a test-driven development workflow. Writes failing tests first, then implements code to pass them, then refactors.',
    category: 'testing',
    usage: '/tdd <feature or function>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 5,
    name: '/e2e',
    description: 'Runs end-to-end tests with Playwright or Cypress. Captures screenshots on failure and generates detailed test reports.',
    category: 'testing',
    usage: '/e2e [test-pattern]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 6,
    name: '/test-coverage',
    description: 'Generates a test coverage report with line, branch, and function metrics. Highlights untested code paths.',
    category: 'testing',
    usage: '/test-coverage [threshold]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 7,
    name: '/eval',
    description: 'Runs evaluation harness against the current implementation. Supports pass@k metrics and grader-based validation.',
    category: 'testing',
    usage: '/eval <test-suite>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 8,
    name: '/learn-eval',
    description: 'Evaluates learned patterns against test cases to measure instinct accuracy and confidence calibration.',
    category: 'testing',
    usage: '/learn-eval',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Review & Quality
  {
    id: 9,
    name: '/code-review',
    description: 'Performs a comprehensive code review on staged changes. Checks for correctness, performance, security, and style issues.',
    category: 'review',
    usage: '/code-review [file-or-branch]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 10,
    name: '/security-scan',
    description: 'Runs AgentShield security auditor with 102 static analysis rules across 5 categories. Uses adversarial red-team/blue-team/auditor pipeline.',
    category: 'review',
    usage: '/security-scan [path]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 11,
    name: '/refactor-clean',
    description: 'Identifies and removes dead code, extracts common patterns, and simplifies complex logic while preserving behavior.',
    category: 'review',
    usage: '/refactor-clean [path]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 12,
    name: '/update-docs',
    description: 'Updates documentation to match current code state. Syncs READMEs, API docs, and inline comments with recent changes.',
    category: 'review',
    usage: '/update-docs',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 13,
    name: '/update-codemaps',
    description: 'Regenerates code maps and dependency graphs for the project. Helps agents navigate large codebases efficiently.',
    category: 'review',
    usage: '/update-codemaps',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Build & Fix
  {
    id: 14,
    name: '/build-fix',
    description: 'Diagnoses and automatically fixes build failures. Resolves TypeScript errors, dependency conflicts, and configuration issues.',
    category: 'build',
    usage: '/build-fix',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 15,
    name: '/claw',
    description: 'OpenClaw configuration management. Sets up and customizes advanced Claude Code behaviors and patterns.',
    category: 'build',
    usage: '/claw <config-key> [value]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 16,
    name: '/setup-pm',
    description: 'Detects and configures the package manager (npm, pnpm, yarn, bun) for the current project automatically.',
    category: 'build',
    usage: '/setup-pm',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Learning & Memory
  {
    id: 17,
    name: '/learn',
    description: 'Extracts patterns from the current session and saves them as learned instincts for future sessions. Continuous learning v1.',
    category: 'learning',
    usage: '/learn [pattern-name]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 18,
    name: '/evolve',
    description: 'Advanced instinct evolution with confidence scoring and clustering. Merges, promotes, or deprecates learned patterns.',
    category: 'learning',
    usage: '/evolve',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 19,
    name: '/instinct-export',
    description: 'Exports all learned instincts to a portable JSON file for sharing or backup across machines and sessions.',
    category: 'learning',
    usage: '/instinct-export [filepath]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 20,
    name: '/instinct-import',
    description: 'Imports instincts from an exported JSON file. Merges with existing patterns using confidence-weighted deduplication.',
    category: 'learning',
    usage: '/instinct-import <filepath>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 21,
    name: '/instinct-status',
    description: 'Displays the current state of all learned instincts with confidence scores, usage counts, and evolution history.',
    category: 'learning',
    usage: '/instinct-status',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 22,
    name: '/skill-create',
    description: 'Auto-generates a new Claude skill from git history and project analysis. Packages patterns into reusable skill modules.',
    category: 'learning',
    usage: '/skill-create [name]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Multi-Agent Orchestration
  {
    id: 23,
    name: '/multi-plan',
    description: 'Creates a multi-agent execution plan. Assigns tasks to specialized agents and defines dependency order for parallel work.',
    category: 'orchestration',
    usage: '/multi-plan <task description>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 24,
    name: '/multi-execute',
    description: 'Executes a multi-agent plan using git worktrees for isolation. Agents work in parallel, results are merged back.',
    category: 'orchestration',
    usage: '/multi-execute [plan-id]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 25,
    name: '/multi-frontend',
    description: 'Specialized multi-agent workflow for frontend development. Coordinates UI, state, styling, and testing agents.',
    category: 'orchestration',
    usage: '/multi-frontend <feature>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 26,
    name: '/multi-backend',
    description: 'Specialized multi-agent workflow for backend development. Coordinates API, database, auth, and testing agents.',
    category: 'orchestration',
    usage: '/multi-backend <feature>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 27,
    name: '/multi-workflow',
    description: 'Custom multi-agent workflow builder. Define agent roles, task graph, and merge strategy for any complex operation.',
    category: 'orchestration',
    usage: '/multi-workflow <config>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 28,
    name: '/orchestrate',
    description: 'High-level orchestration command that automatically selects agents, creates plans, and executes multi-step workflows.',
    category: 'orchestration',
    usage: '/orchestrate <goal>',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Workflow & Sessions
  {
    id: 29,
    name: '/sessions',
    description: 'Manages Claude Code sessions. List, restore, or clean up previous session states with memory persistence.',
    category: 'workflow',
    usage: '/sessions [list|restore|clean]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 30,
    name: '/pm2',
    description: 'PM2 process manager integration for long-running Claude Code tasks. Start, stop, restart, and monitor agent processes.',
    category: 'workflow',
    usage: '/pm2 [start|stop|restart|status]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Language-Specific
  {
    id: 31,
    name: '/go-build',
    description: 'Go-specific build command that resolves module issues, CGO problems, and cross-compilation errors automatically.',
    category: 'language',
    usage: '/go-build [target]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 32,
    name: '/go-test',
    description: 'Runs Go tests with coverage, race detection, and benchmarks. Generates formatted test reports with failure analysis.',
    category: 'language',
    usage: '/go-test [package] [flags]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 33,
    name: '/go-review',
    description: 'Go-specific code review checking for idiomatic patterns, goroutine safety, error handling, and interface design.',
    category: 'language',
    usage: '/go-review [file-or-package]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 34,
    name: '/python-review',
    description: 'Python-specific code review for type hints, async patterns, Django/FastAPI conventions, and PEP compliance.',
    category: 'language',
    usage: '/python-review [file-or-module]',
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Auto-Update & Maintenance
  {
    id: 35,
    name: '/auto-update',
    description: 'Discover, evaluate, and integrate new skills, agents, and commands from the community. Supports --scan-only and --full modes.',
    category: 'workflow',
    usage: '/auto-update [--full | --scan-only | --category <name>]',
    source: 'ai-agent12',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agent12',
  },

  // From ai-agents-monorepo
  {
    id: 36,
    name: '/extract-data',
    description: 'Extract structured data from unstructured text, files, or URLs using AI with schema validation.',
    category: 'workflow',
    usage: '/extract-data <source> [--schema <fields>] [--format json|csv]',
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
  {
    id: 37,
    name: '/content-create',
    description: 'Create content through a multi-stage AI pipeline: research, write, edit, SEO optimize.',
    category: 'workflow',
    usage: '/content-create <topic> [--type article|blog|social|newsletter] [--audience <target>]',
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
  {
    id: 38,
    name: '/github-triage',
    description: 'AI-powered classification of open GitHub issues into bug/feature/question/docs categories.',
    category: 'review',
    usage: '/github-triage [--apply]',
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
  {
    id: 39,
    name: '/health-check',
    description: 'Run system health checks with AI-powered root cause analysis for anomalies.',
    category: 'workflow',
    usage: '/health-check [--remote <host>]',
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
];
