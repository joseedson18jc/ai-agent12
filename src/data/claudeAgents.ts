export interface ClaudeAgent {
  id: number;
  name: string;
  role: string;
  description: string;
  category: AgentCategory;
  capabilities: string[];
  source: string;
  sourceUrl: string;
}

export type AgentCategory = 'planning' | 'review' | 'testing' | 'operations' | 'language';

export interface AgentCategoryInfo {
  id: AgentCategory;
  label: string;
  icon: string;
  description: string;
}

export const agentCategories: AgentCategoryInfo[] = [
  { id: 'planning', label: 'Planning & Architecture', icon: '🏗️', description: 'Strategic planning, design, and architecture agents' },
  { id: 'review', label: 'Code Review & Security', icon: '🔍', description: 'Code quality, security auditing, and review agents' },
  { id: 'testing', label: 'Testing & QA', icon: '🧪', description: 'Test-driven development and end-to-end testing agents' },
  { id: 'operations', label: 'Operations & Maintenance', icon: '🔧', description: 'Build resolution, refactoring, and documentation agents' },
  { id: 'language', label: 'Language Specialists', icon: '🌐', description: 'Language-specific reviewers and build resolvers' },
];

export const claudeAgents: ClaudeAgent[] = [
  // Planning & Architecture
  {
    id: 1,
    name: 'planner',
    role: 'Strategic Planner',
    description: 'Creates detailed implementation plans with task breakdowns, dependency graphs, and risk assessments. Orchestrates multi-step workflows and delegates to specialized agents.',
    category: 'planning',
    capabilities: ['Implementation planning', 'Task decomposition', 'Dependency analysis', 'Risk assessment', 'Agent delegation'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 2,
    name: 'architect',
    role: 'System Architect',
    description: 'Designs system architecture, evaluates trade-offs between approaches, and ensures scalable, maintainable patterns. Reviews architectural decisions and proposes improvements.',
    category: 'planning',
    capabilities: ['System design', 'Trade-off analysis', 'Scalability patterns', 'Architecture review', 'Design documentation'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 3,
    name: 'chief-of-staff',
    role: 'Chief of Staff',
    description: 'Coordinates across agents, manages priorities, and ensures alignment between planning and execution. Acts as the central orchestration point for multi-agent workflows.',
    category: 'planning',
    capabilities: ['Cross-agent coordination', 'Priority management', 'Workflow orchestration', 'Status tracking', 'Escalation handling'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Code Review & Security
  {
    id: 4,
    name: 'code-reviewer',
    role: 'Code Reviewer',
    description: 'Performs thorough code reviews focusing on correctness, readability, performance, and adherence to coding standards. Provides actionable feedback with specific suggestions.',
    category: 'review',
    capabilities: ['Code quality analysis', 'Performance review', 'Best practices enforcement', 'Refactoring suggestions', 'PR review'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 5,
    name: 'security-reviewer',
    role: 'Security Auditor',
    description: 'Adversarial security review using red-team/blue-team methodology. Scans for OWASP vulnerabilities, injection attacks, authentication flaws, and supply chain risks.',
    category: 'review',
    capabilities: ['Vulnerability scanning', 'OWASP compliance', 'Red-team analysis', 'Auth flow review', 'Dependency auditing'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 6,
    name: 'database-reviewer',
    role: 'Database Reviewer',
    description: 'Reviews database schemas, queries, migrations, and access patterns. Optimizes for performance, data integrity, and proper indexing strategies.',
    category: 'review',
    capabilities: ['Schema review', 'Query optimization', 'Migration safety', 'Index analysis', 'Data integrity checks'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Testing & QA
  {
    id: 7,
    name: 'tdd-guide',
    role: 'TDD Guide',
    description: 'Drives test-driven development workflows with RED-GREEN-REFACTOR cycle. Ensures comprehensive test coverage and guides writing testable, modular code.',
    category: 'testing',
    capabilities: ['RED-GREEN-REFACTOR', 'Test coverage analysis', 'Mock strategies', 'Integration testing', 'Test architecture'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 8,
    name: 'e2e-runner',
    role: 'E2E Test Runner',
    description: 'Executes end-to-end test suites using Playwright or Cypress. Validates full user flows, manages test environments, and reports on failures with screenshots.',
    category: 'testing',
    capabilities: ['Playwright/Cypress execution', 'User flow validation', 'Screenshot capture', 'Failure analysis', 'Flaky test detection'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Operations & Maintenance
  {
    id: 9,
    name: 'build-error-resolver',
    role: 'Build Error Resolver',
    description: 'Automatically diagnoses and fixes build failures across TypeScript, Vite, Webpack, and other build systems. Resolves dependency conflicts and configuration issues.',
    category: 'operations',
    capabilities: ['Build error diagnosis', 'Dependency resolution', 'Config repair', 'Type error fixing', 'Bundle analysis'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 10,
    name: 'refactor-cleaner',
    role: 'Refactor & Cleanup',
    description: 'Identifies code smells, dead code, and duplication. Performs systematic refactoring using proven patterns while preserving behavior through tests.',
    category: 'operations',
    capabilities: ['Dead code removal', 'Duplication detection', 'Pattern extraction', 'Safe refactoring', 'Code simplification'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 11,
    name: 'doc-updater',
    role: 'Documentation Updater',
    description: 'Keeps documentation in sync with code changes. Updates READMEs, API docs, inline comments, and changelogs based on recent commits and modifications.',
    category: 'operations',
    capabilities: ['README updates', 'API doc generation', 'Changelog maintenance', 'Comment updates', 'Doc consistency checks'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },

  // Language Specialists
  {
    id: 12,
    name: 'go-reviewer',
    role: 'Go Specialist',
    description: 'Go language expert reviewing idiomatic patterns, goroutine safety, error handling, and interface design. Enforces Go community best practices and effective Go patterns.',
    category: 'language',
    capabilities: ['Go idioms', 'Goroutine safety', 'Error handling patterns', 'Interface design', 'gRPC review'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 13,
    name: 'go-build-resolver',
    role: 'Go Build Resolver',
    description: 'Resolves Go-specific build issues including module conflicts, CGO problems, and cross-compilation errors. Manages go.mod/go.sum and vendoring.',
    category: 'language',
    capabilities: ['Module resolution', 'CGO debugging', 'Cross-compilation', 'Vendor management', 'Build tag analysis'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 14,
    name: 'python-reviewer',
    role: 'Python Specialist',
    description: 'Python expert reviewing type hints, async patterns, Django/FastAPI conventions, and Pythonic idioms. Ensures PEP compliance and proper virtual environment management.',
    category: 'language',
    capabilities: ['Type hint review', 'Async patterns', 'Django/FastAPI review', 'PEP compliance', 'Package management'],
    source: 'affaan-m/everything-claude-code',
    sourceUrl: 'https://github.com/affaan-m/everything-claude-code',
  },
  {
    id: 15,
    name: 'update-scout',
    role: 'Skills Ecosystem Researcher',
    description: 'Discovers, evaluates, and integrates new Claude Code skills, agents, and commands from the open-source community. Runs weekly scans and quality audits.',
    category: 'operations',
    capabilities: ['GitHub repo scanning', 'Skill quality evaluation', 'Duplicate detection', 'Auto-integration', 'Ecosystem health reporting'],
    source: 'ai-agent12',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agent12',
  },
  {
    id: 16,
    name: 'content-pipeline',
    role: 'Multi-Stage Content Producer',
    description: 'Orchestrates a 4-stage content creation pipeline: research, write, edit, and SEO optimize with task queue management.',
    category: 'operations',
    capabilities: ['Topic research', 'Multi-format writing', 'Grammar and tone editing', 'SEO optimization', 'Task queue management'],
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
  {
    id: 17,
    name: 'data-extractor',
    role: 'Structured Data Extraction Specialist',
    description: 'Extracts structured data from unstructured text, HTML, PDFs, and web pages using AI with schema validation.',
    category: 'operations',
    capabilities: ['Text to JSON extraction', 'JSON-LD parsing', 'Schema validation', 'Multi-format input', 'Batch chunking'],
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
  {
    id: 18,
    name: 'github-automator',
    role: 'GitHub Operations Specialist',
    description: 'Automates GitHub workflows: AI-powered PR reviews, issue triage, hybrid standards checking, and PR summaries.',
    category: 'review',
    capabilities: ['AI code review', 'Issue triage', 'Hybrid standards checking', 'PR summary generation', 'GitHub Markdown formatting'],
    source: 'ai-agents-monorepo',
    sourceUrl: 'https://github.com/joseedson18jc/ai-agents-monorepo',
  },
];
