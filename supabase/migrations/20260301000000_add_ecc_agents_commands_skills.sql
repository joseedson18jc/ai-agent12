-- ═══════════════════════════════════════════════════════════════
-- Everything Claude Code Integration
-- Adds 14 agents, 34 commands, 57 extra skills, and 5 new categories
-- Source: affaan-m/everything-claude-code (56k+ stars)
-- ═══════════════════════════════════════════════════════════════

-- ─── Agent Categories ───────────────────────────────────────

CREATE TABLE public.agent_categories (
  id TEXT NOT NULL PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent categories"
  ON public.agent_categories
  FOR SELECT
  USING (true);

-- ─── Claude Agents ──────────────────────────────────────────

CREATE TABLE public.claude_agents (
  id INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES public.agent_categories(id),
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.claude_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view claude agents"
  ON public.claude_agents
  FOR SELECT
  USING (true);

CREATE TRIGGER update_claude_agents_updated_at
  BEFORE UPDATE ON public.claude_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Command Categories ─────────────────────────────────────

CREATE TABLE public.command_categories (
  id TEXT NOT NULL PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.command_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view command categories"
  ON public.command_categories
  FOR SELECT
  USING (true);

-- ─── Claude Commands ────────────────────────────────────────

CREATE TABLE public.claude_commands (
  id INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES public.command_categories(id),
  usage TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.claude_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view claude commands"
  ON public.claude_commands
  FOR SELECT
  USING (true);

CREATE TRIGGER update_claude_commands_updated_at
  BEFORE UPDATE ON public.claude_commands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Seed Agent Categories ──────────────────────────────────

INSERT INTO public.agent_categories (id, label, icon, description) VALUES
  ('planning', 'Planning & Architecture', '🏗️', 'Strategic planning, design, and architecture agents'),
  ('review', 'Code Review & Security', '🔍', 'Code quality, security auditing, and review agents'),
  ('testing', 'Testing & QA', '🧪', 'Test-driven development and end-to-end testing agents'),
  ('operations', 'Operations & Maintenance', '🔧', 'Build resolution, refactoring, and documentation agents'),
  ('language', 'Language Specialists', '🌐', 'Language-specific reviewers and build resolvers');

-- ─── Seed Claude Agents ─────────────────────────────────────

INSERT INTO public.claude_agents (id, name, role, description, category, capabilities, source, source_url) VALUES
  (1, 'planner', 'Strategic Planner', 'Creates detailed implementation plans with task breakdowns, dependency graphs, and risk assessments.', 'planning', ARRAY['Implementation planning', 'Task decomposition', 'Dependency analysis', 'Risk assessment', 'Agent delegation'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (2, 'architect', 'System Architect', 'Designs system architecture, evaluates trade-offs between approaches, and ensures scalable patterns.', 'planning', ARRAY['System design', 'Trade-off analysis', 'Scalability patterns', 'Architecture review', 'Design documentation'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (3, 'chief-of-staff', 'Chief of Staff', 'Coordinates across agents, manages priorities, and ensures alignment between planning and execution.', 'planning', ARRAY['Cross-agent coordination', 'Priority management', 'Workflow orchestration', 'Status tracking', 'Escalation handling'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (4, 'code-reviewer', 'Code Reviewer', 'Performs thorough code reviews focusing on correctness, readability, performance, and coding standards.', 'review', ARRAY['Code quality analysis', 'Performance review', 'Best practices enforcement', 'Refactoring suggestions', 'PR review'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (5, 'security-reviewer', 'Security Auditor', 'Adversarial security review using red-team/blue-team methodology with OWASP scanning.', 'review', ARRAY['Vulnerability scanning', 'OWASP compliance', 'Red-team analysis', 'Auth flow review', 'Dependency auditing'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (6, 'database-reviewer', 'Database Reviewer', 'Reviews database schemas, queries, migrations, and access patterns for performance and integrity.', 'review', ARRAY['Schema review', 'Query optimization', 'Migration safety', 'Index analysis', 'Data integrity checks'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (7, 'tdd-guide', 'TDD Guide', 'Drives test-driven development workflows with RED-GREEN-REFACTOR cycle and comprehensive coverage.', 'testing', ARRAY['RED-GREEN-REFACTOR', 'Test coverage analysis', 'Mock strategies', 'Integration testing', 'Test architecture'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (8, 'e2e-runner', 'E2E Test Runner', 'Executes end-to-end test suites with Playwright or Cypress, validates user flows, captures screenshots.', 'testing', ARRAY['Playwright/Cypress execution', 'User flow validation', 'Screenshot capture', 'Failure analysis', 'Flaky test detection'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (9, 'build-error-resolver', 'Build Error Resolver', 'Automatically diagnoses and fixes build failures across TypeScript, Vite, Webpack, and other systems.', 'operations', ARRAY['Build error diagnosis', 'Dependency resolution', 'Config repair', 'Type error fixing', 'Bundle analysis'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (10, 'refactor-cleaner', 'Refactor & Cleanup', 'Identifies code smells, dead code, and duplication. Performs systematic refactoring preserving behavior.', 'operations', ARRAY['Dead code removal', 'Duplication detection', 'Pattern extraction', 'Safe refactoring', 'Code simplification'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (11, 'doc-updater', 'Documentation Updater', 'Keeps documentation in sync with code changes. Updates READMEs, API docs, and changelogs.', 'operations', ARRAY['README updates', 'API doc generation', 'Changelog maintenance', 'Comment updates', 'Doc consistency checks'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (12, 'go-reviewer', 'Go Specialist', 'Go language expert reviewing idiomatic patterns, goroutine safety, error handling, and interface design.', 'language', ARRAY['Go idioms', 'Goroutine safety', 'Error handling patterns', 'Interface design', 'gRPC review'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (13, 'go-build-resolver', 'Go Build Resolver', 'Resolves Go-specific build issues including module conflicts, CGO problems, and cross-compilation.', 'language', ARRAY['Module resolution', 'CGO debugging', 'Cross-compilation', 'Vendor management', 'Build tag analysis'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (14, 'python-reviewer', 'Python Specialist', 'Python expert reviewing type hints, async patterns, Django/FastAPI conventions, and Pythonic idioms.', 'language', ARRAY['Type hint review', 'Async patterns', 'Django/FastAPI review', 'PEP compliance', 'Package management'], 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code');

-- ─── Seed Command Categories ────────────────────────────────

INSERT INTO public.command_categories (id, label, icon, description) VALUES
  ('planning', 'Planning & Execution', '📋', 'Implementation planning and step-by-step execution'),
  ('testing', 'Testing & Coverage', '🧪', 'TDD workflows, E2E tests, and coverage reports'),
  ('review', 'Review & Quality', '🔍', 'Code review, security scanning, and refactoring'),
  ('build', 'Build & Fix', '🔨', 'Build error resolution and verification'),
  ('learning', 'Learning & Memory', '🧠', 'Continuous learning, instincts, and pattern extraction'),
  ('orchestration', 'Multi-Agent Orchestration', '🎭', 'Parallel multi-agent workflows and coordination'),
  ('workflow', 'Workflow & Sessions', '⚡', 'Session management, PM2, and utility operations'),
  ('language', 'Language-Specific', '🌐', 'Language-specific builds, tests, and reviews');

-- ─── Seed Claude Commands ───────────────────────────────────

INSERT INTO public.claude_commands (id, name, description, category, usage, source, source_url) VALUES
  (1, '/plan', 'Creates a detailed implementation plan with task decomposition and risk assessment.', 'planning', '/plan <feature description>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (2, '/checkpoint', 'Saves current progress as a named checkpoint for later restoration.', 'planning', '/checkpoint <name>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (3, '/verify', 'Runs the full verification loop: lint, type-check, test, and build.', 'planning', '/verify', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (4, '/tdd', 'Starts a test-driven development workflow with RED-GREEN-REFACTOR cycle.', 'testing', '/tdd <feature or function>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (5, '/e2e', 'Runs end-to-end tests with Playwright or Cypress with screenshot capture.', 'testing', '/e2e [test-pattern]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (6, '/test-coverage', 'Generates a test coverage report with line, branch, and function metrics.', 'testing', '/test-coverage [threshold]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (7, '/eval', 'Runs evaluation harness with pass@k metrics and grader-based validation.', 'testing', '/eval <test-suite>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (8, '/learn-eval', 'Evaluates learned patterns against test cases for accuracy measurement.', 'testing', '/learn-eval', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (9, '/code-review', 'Performs comprehensive code review checking correctness, performance, and security.', 'review', '/code-review [file-or-branch]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (10, '/security-scan', 'Runs AgentShield auditor with 102 static analysis rules and adversarial pipeline.', 'review', '/security-scan [path]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (11, '/refactor-clean', 'Identifies dead code and simplifies complex logic while preserving behavior.', 'review', '/refactor-clean [path]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (12, '/update-docs', 'Updates documentation to match current code state.', 'review', '/update-docs', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (13, '/update-codemaps', 'Regenerates code maps and dependency graphs for navigation.', 'review', '/update-codemaps', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (14, '/build-fix', 'Diagnoses and automatically fixes build failures and dependency conflicts.', 'build', '/build-fix', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (15, '/claw', 'OpenClaw configuration management for advanced Claude Code behaviors.', 'build', '/claw <config-key> [value]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (16, '/setup-pm', 'Detects and configures the package manager for the current project.', 'build', '/setup-pm', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (17, '/learn', 'Extracts patterns from session and saves as instincts for future use.', 'learning', '/learn [pattern-name]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (18, '/evolve', 'Advanced instinct evolution with confidence scoring and clustering.', 'learning', '/evolve', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (19, '/instinct-export', 'Exports all learned instincts to a portable JSON file.', 'learning', '/instinct-export [filepath]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (20, '/instinct-import', 'Imports instincts from exported JSON with confidence-weighted dedup.', 'learning', '/instinct-import <filepath>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (21, '/instinct-status', 'Displays current state of all learned instincts with confidence scores.', 'learning', '/instinct-status', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (22, '/skill-create', 'Auto-generates a new Claude skill from git history and project analysis.', 'learning', '/skill-create [name]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (23, '/multi-plan', 'Creates a multi-agent execution plan with dependency ordering.', 'orchestration', '/multi-plan <task description>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (24, '/multi-execute', 'Executes a multi-agent plan using git worktrees for isolation.', 'orchestration', '/multi-execute [plan-id]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (25, '/multi-frontend', 'Specialized multi-agent workflow for frontend development.', 'orchestration', '/multi-frontend <feature>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (26, '/multi-backend', 'Specialized multi-agent workflow for backend development.', 'orchestration', '/multi-backend <feature>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (27, '/multi-workflow', 'Custom multi-agent workflow builder with configurable roles.', 'orchestration', '/multi-workflow <config>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (28, '/orchestrate', 'High-level orchestration that auto-selects agents and executes workflows.', 'orchestration', '/orchestrate <goal>', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (29, '/sessions', 'Manages Claude Code sessions with memory persistence.', 'workflow', '/sessions [list|restore|clean]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (30, '/pm2', 'PM2 process manager integration for long-running Claude Code tasks.', 'workflow', '/pm2 [start|stop|restart|status]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (31, '/go-build', 'Go-specific build resolving module issues and cross-compilation errors.', 'language', '/go-build [target]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (32, '/go-test', 'Runs Go tests with coverage, race detection, and benchmarks.', 'language', '/go-test [package] [flags]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (33, '/go-review', 'Go-specific code review for idiomatic patterns and goroutine safety.', 'language', '/go-review [file-or-package]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code'),
  (34, '/python-review', 'Python-specific code review for type hints and framework conventions.', 'language', '/python-review [file-or-module]', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code');

-- ─── Add New Skill Categories ───────────────────────────────

INSERT INTO public.skill_categories (id, label, icon, description) VALUES
  ('language', 'Language Patterns', '🌐', 'TypeScript, Python, Go, Java, C++, Swift language-specific patterns'),
  ('infrastructure', 'Infrastructure & DevOps', '🐳', 'Docker, Kubernetes, deployment, and CI/CD patterns'),
  ('frameworks', 'Framework Patterns', '🏗️', 'Django, Spring Boot, SwiftUI, and framework-specific best practices'),
  ('business', 'Business & Content', '💼', 'Investor materials, market research, content engines, and outreach'),
  ('ai', 'AI & ML Patterns', '🤖', 'LLM pipelines, on-device models, retrieval patterns, and evaluation');

-- ─── Add ECC Skills (52-108) ────────────────────────────────

INSERT INTO public.claude_skills (id, name, description, category, source, source_url, status) VALUES
  -- Language Patterns
  (52, 'typescript-patterns', 'TypeScript best practices: strict typing, generics, discriminated unions, utility types', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (53, 'python-patterns', 'Pythonic idioms, type hints, async/await patterns, virtual environments, PEP compliance', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (54, 'golang-patterns', 'Go idioms, goroutine safety, channel patterns, error handling, interface design', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (55, 'java-coding-standards', 'Java best practices, naming conventions, exception handling, generics, stream API', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (56, 'cpp-coding-standards', 'C++ Core Guidelines, RAII, smart pointers, move semantics, template patterns', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (57, 'cpp-testing', 'C++ testing with GoogleTest/Catch2, mocking frameworks, memory sanitizers', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (58, 'python-testing', 'Python testing with pytest, fixtures, parametrize, mocking, coverage', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (59, 'golang-testing', 'Go testing with table-driven tests, subtests, benchmarks, race detection', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (60, 'swift-concurrency', 'Swift 6.2 async/await patterns, structured concurrency, task groups', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (61, 'swift-actor-persistence', 'Swift actor isolation patterns and state persistence across boundaries', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (62, 'swift-protocol-di-testing', 'Swift protocol-oriented dependency injection for testable architectures', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (63, 'coding-standards', 'Universal coding standards: naming, file structure, error handling, documentation', 'language', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),

  -- Framework Patterns
  (64, 'django-patterns', 'Django best practices: model design, queryset optimization, middleware, signals', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (65, 'django-security', 'Django security hardening: CSRF, XSS, SQL injection, auth backends', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (66, 'django-tdd', 'Django TDD with factory_boy, pytest-django, request factories, API testing', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (67, 'django-verification', 'Django validation: model constraints, form validation, serializer checks', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (68, 'springboot-patterns', 'Spring Boot patterns: dependency injection, AOP, profiles, actuator setup', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (69, 'springboot-security', 'Spring Security: OAuth2, JWT, method-level security, CORS, RBAC', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (70, 'springboot-tdd', 'Spring Boot testing: MockMvc, Testcontainers, slice tests, integration tests', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (71, 'springboot-verification', 'Spring Boot validation: Bean validation, custom validators, health checks', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (72, 'jpa-patterns', 'JPA/Hibernate: entity mapping, lazy loading, N+1 prevention, transactions', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (73, 'swiftui-patterns', 'SwiftUI best practices: view composition, state management, navigation', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (74, 'frontend-patterns', 'Frontend architecture: component design, state management, data fetching', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (75, 'backend-patterns', 'Backend architecture: API design, middleware, caching, service layers', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (76, 'frontend-slides', 'Zero-dependency HTML slide deck generator with PPTX export guidance', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (77, 'liquid-glass-design', 'Modern UI design with glassmorphism, blur effects, layered transparencies', 'frameworks', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community'),

  -- Infrastructure & DevOps
  (78, 'docker-patterns', 'Docker best practices: multi-stage builds, layer caching, compose orchestration', 'infrastructure', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (79, 'deployment-patterns', 'Deployment strategies: blue-green, canary, rolling updates, rollbacks', 'infrastructure', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (80, 'database-migrations', 'Safe database migration patterns: zero-downtime, data backfills, rollbacks', 'infrastructure', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (81, 'postgres-patterns', 'PostgreSQL optimization: query planning, indexing, partitioning, JSONB', 'infrastructure', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (82, 'clickhouse-io', 'ClickHouse columnar storage, materialized views, analytical query optimization', 'infrastructure', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community'),

  -- Testing & Quality (ECC additions)
  (83, 'tdd-workflow', 'Complete TDD workflow automation with test scaffolding and mutation testing', 'testing', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (84, 'e2e-testing', 'E2E testing patterns with Playwright: page objects, fixtures, visual comparison', 'testing', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (85, 'verification-loop', 'Continuous verification: lint, type-check, test, build with fail-fast reporting', 'testing', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (86, 'eval-harness', 'AI evaluation framework: pass@k metrics, grader types, checkpoint strategies', 'testing', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),

  -- Security (ECC additions)
  (87, 'security-scan', 'AgentShield: 102 static analysis rules, red-team/blue-team pipeline, reports', 'security', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (88, 'security-review-ecc', 'Deep security review with OWASP top 10, auth flow auditing, injection scanning', 'security', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),

  -- AI & ML Patterns
  (89, 'cost-aware-llm-pipeline', 'Token-optimized LLM workflows: model routing, prompt compression, caching', 'ai', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (90, 'foundation-models-on-device', 'On-device AI: model quantization, CoreML/ONNX conversion, edge inference', 'ai', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (91, 'iterative-retrieval', 'RAG patterns: multi-hop retrieval, query decomposition, re-ranking', 'ai', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (92, 'continuous-learning', 'Session-to-session pattern extraction with instinct capture and memory', 'ai', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (93, 'continuous-learning-v2', 'Advanced instinct evolution: clustering, confidence calibration, decay', 'ai', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (94, 'regex-vs-llm-structured-text', 'Decision framework: when to use regex vs LLM for text extraction', 'ai', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community'),

  -- Business & Content
  (95, 'article-writing', 'Long-form content creation with SEO optimization and citation patterns', 'business', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (96, 'content-engine', 'Multi-platform content repurposing: blog to social, cross-format distribution', 'business', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (97, 'investor-materials', 'Pitch deck generation, financial models, traction slides, due diligence docs', 'business', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (98, 'investor-outreach', 'Automated investor pipeline: personalized emails, follow-ups, CRM integration', 'business', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (99, 'market-research', 'Competitive analysis, TAM/SAM/SOM modeling, trend synthesis, landscape mapping', 'business', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),

  -- Development (ECC additions)
  (100, 'api-design', 'RESTful API architecture: resource modeling, versioning, pagination, OpenAPI', 'development', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (101, 'content-hash-cache-pattern', 'Content-addressable caching: hash-based invalidation, immutable assets', 'development', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community'),
  (102, 'search-first', 'Research-first development: investigate before implementing to minimize rework', 'development', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (103, 'strategic-compact', 'Context window optimization: strategic compaction, token budgeting, prompt slimming', 'development', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),

  -- Meta (ECC additions)
  (104, 'configure-ecc', 'Everything-Claude-Code setup: plugin installation, rule configuration', 'meta', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (105, 'skill-stocktake', 'Skills inventory audit: catalog installed skills, check versions, suggest additions', 'meta', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'verified'),
  (106, 'project-guidelines-example', 'Sample project guidelines template for consistent code standards', 'meta', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community'),

  -- Document (ECC additions)
  (107, 'nutrient-document-processing', 'Specialized extraction for nutritional and scientific data documents', 'document', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community'),
  (108, 'visa-doc-translate', 'Immigration document translation with legal terminology accuracy', 'document', 'affaan-m/everything-claude-code', 'https://github.com/affaan-m/everything-claude-code', 'community');
