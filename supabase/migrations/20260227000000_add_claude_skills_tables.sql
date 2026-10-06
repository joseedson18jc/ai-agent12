-- Create skill_categories table for Claude Skills catalog
CREATE TABLE public.skill_categories (
  id TEXT NOT NULL PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claude_skills table
CREATE TABLE public.claude_skills (
  id INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES public.skill_categories(id),
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'community', 'needed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_skills ENABLE ROW LEVEL SECURITY;

-- RLS policies - skills are public reference data (read-only from client)
CREATE POLICY "Anyone can view skill categories"
  ON public.skill_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view claude skills"
  ON public.claude_skills
  FOR SELECT
  USING (true);

-- Create trigger for automatic timestamp updates on claude_skills
CREATE TRIGGER update_claude_skills_updated_at
  BEFORE UPDATE ON public.claude_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 11 skill categories
INSERT INTO public.skill_categories (id, label, icon, description) VALUES
  ('document', 'Document & File Processing', '📄', 'PDF, DOCX, XLSX, PPTX manipulation and extraction'),
  ('testing', 'Testing & Quality', '🧪', 'TDD, webapp testing, anti-patterns, and quality assurance'),
  ('debugging', 'Debugging & Troubleshooting', '🐛', 'Systematic debugging, root cause analysis, and verification'),
  ('collaboration', 'Collaboration & Workflow', '🤝', 'Code review, git workflows, brainstorming, and planning'),
  ('development', 'Development & Architecture', '⚙️', 'MCP building, artifacts, API development, and architecture'),
  ('security', 'Security & Performance', '🔒', 'Defense patterns, profiling, audits, and optimization'),
  ('documentation', 'Documentation & Automation', '📚', 'Technical writing, changelogs, and CI/CD integration'),
  ('media', 'Media & Content Creation', '🎬', 'Video, image, design, and content generation'),
  ('data', 'Data & Analysis', '📊', 'Data visualization, SQL, and CSV processing'),
  ('writing', 'Writing & Research', '✍️', 'Brand guidelines, communications, and research'),
  ('meta', 'Meta Skills', '🔧', 'Skill creation, templates, and multi-agent workflows');

-- Seed all 51 Claude skills from awesome-claude-skills
INSERT INTO public.claude_skills (id, name, description, category, source, source_url, status) VALUES
  -- Document & File Processing
  (1, 'pdf', 'Extract text, tables, metadata from PDFs with merge and annotation support', 'document', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (2, 'docx', 'Create, edit, and analyze Word documents with tracked changes', 'document', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (3, 'xlsx', 'Excel spreadsheet operations including formulas, charts, and pivot tables', 'document', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (4, 'pptx', 'PowerPoint presentation creation with templates, charts, and multimedia', 'document', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),

  -- Testing & Quality
  (5, 'test-driven-development', 'RED-GREEN-REFACTOR cycle: write failing tests, implement code, refactor', 'testing', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (6, 'webapp-testing', 'Playwright-based web app testing for UI verification', 'testing', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (7, 'condition-based-waiting', 'Async testing patterns with proper wait conditions instead of arbitrary delays', 'testing', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (8, 'testing-anti-patterns', 'Identifies common testing mistakes and poor isolation patterns to avoid', 'testing', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (9, 'e2e-testing-skill', 'End-to-end test automation across services and integration layers', 'testing', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (10, 'snapshot-testing', 'Visual regression testing with component snapshots for UI consistency', 'testing', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Debugging & Troubleshooting
  (11, 'systematic-debugging', 'Four-phase root cause process: reproduce, isolate, identify, verify fix', 'debugging', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (12, 'root-cause-tracing', 'Deep problem investigation with dependency chain analysis and tracing', 'debugging', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (13, 'verification-before-completion', 'Ensures fixes are validated before marking work as complete', 'debugging', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (14, 'defense-in-depth', 'Multiple validation layers for comprehensive error handling and resilience', 'debugging', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (15, 'performance-profiling', 'Identify bottlenecks, memory leaks, and CPU-intensive operations', 'debugging', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Collaboration & Workflow
  (16, 'requesting-code-review', 'Pre-review preparation with formatted diffs and context summaries', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (17, 'receiving-code-review', 'Constructive feedback integration and iterative improvement workflow', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (18, 'using-git-worktrees', 'Parallel development branches for efficient context switching', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (19, 'finishing-a-development-branch', 'Guides merge decisions and git history cleanup for clean merges', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (20, 'brainstorming', 'Socratic design refinement and feature exploration for ideation', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (21, 'writing-plans', 'Creates detailed implementation strategies and architecture documentation', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (22, 'executing-plans', 'Batch execution with checkpoints for progress tracking and verification', 'collaboration', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),

  -- Development & Architecture
  (23, 'mcp-builder', 'Create high-quality Model Context Protocol servers with best practices', 'development', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (24, 'artifacts-builder', 'Build complex React artifacts with Tailwind CSS and shadcn/ui', 'development', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (25, 'api-development', 'RESTful API design patterns with OpenAPI/Swagger documentation', 'development', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (26, 'database-migration', 'Schema version management and safe migration patterns for databases', 'development', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (27, 'refactoring-patterns', 'Code smell detection and systematic refactoring using proven patterns', 'development', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Security & Performance
  (28, 'security-review', 'Automated vulnerability scanning and OWASP compliance checking', 'security', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (29, 'dependency-audit', 'Supply chain security analysis with CVE detection and reporting', 'security', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (30, 'performance-optimization', 'Algorithmic improvements and resource optimization techniques', 'security', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (31, 'load-testing', 'Stress testing patterns and performance benchmarking frameworks', 'security', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Documentation & Automation
  (32, 'documentation-generator', 'Auto-generate API documentation from code and comments', 'documentation', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (33, 'changelog-automation', 'Conventional commits with automated release notes generation', 'documentation', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (34, 'ci-cd-integration', 'GitHub Actions workflow creation and deployment pipeline setup', 'documentation', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Media & Content Creation
  (35, 'canvas-design', 'Create visual designs using Claude canvas capabilities', 'media', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'community'),
  (36, 'slack-gif-creator', 'Generate custom GIFs for Slack communication and reactions', 'media', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'community'),
  (37, 'algorithmic-art', 'Generate procedural art and creative visualizations with code', 'media', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'community'),
  (38, 'video-editing-helper', 'Assist with video editing workflows and ffmpeg commands', 'media', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Data & Analysis
  (39, 'data-visualization', 'Create charts, graphs, and interactive data visualizations', 'data', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (40, 'sql-query-builder', 'Generate optimized SQL queries with proper indexing strategies', 'data', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (41, 'csv-processing', 'Parse, transform, and analyze CSV files with validation', 'data', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Writing & Research
  (42, 'brand-guidelines', 'Maintain brand voice, style, and messaging consistency across content', 'writing', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'community'),
  (43, 'internal-comms', 'Draft internal communications, announcements, and team updates', 'writing', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'community'),
  (44, 'research-assistant', 'Gather, synthesize, and cite sources for research projects', 'writing', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),
  (45, 'technical-writing', 'Create clear technical documentation and user guides', 'writing', 'Community', 'https://github.com/karanb192/awesome-claude-skills', 'needed'),

  -- Meta Skills
  (46, 'skill-creator', 'Teaching methods for developing effective Claude skills', 'meta', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (47, 'template-skill', 'Minimal skeleton for bootstrapping new skill projects quickly', 'meta', 'anthropics/skills', 'https://github.com/anthropics/skills', 'verified'),
  (48, 'writing-skills', 'Creating skills following best practices and conventions', 'meta', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (49, 'sharing-skills', 'Contributing skills via branches and pull requests to the community', 'meta', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (50, 'testing-skills-with-subagents', 'Validating skill quality using subagent testing and feedback loops', 'meta', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified'),
  (51, 'subagent-driven-development', 'Quality-gated iteration with multi-agent workflows for complex tasks', 'meta', 'obra/superpowers', 'https://github.com/obra/superpowers', 'verified');
