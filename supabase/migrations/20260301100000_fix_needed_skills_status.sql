-- ═══════════════════════════════════════════════════════════════
-- Fix 19 "needed" skills → verified/community
-- Now covered by ECC agents, commands, and overlapping skills
-- ═══════════════════════════════════════════════════════════════

-- 4 skills upgraded to "verified" (directly covered by ECC verified skills)
UPDATE public.claude_skills SET status = 'verified' WHERE id = 9;   -- e2e-testing-skill (covered by #84 e2e-testing)
UPDATE public.claude_skills SET status = 'verified' WHERE id = 25;  -- api-development (covered by #100 api-design)
UPDATE public.claude_skills SET status = 'verified' WHERE id = 26;  -- database-migration (covered by #80 database-migrations)
UPDATE public.claude_skills SET status = 'verified' WHERE id = 28;  -- security-review (covered by #87 security-scan + #88 security-review-ecc)

-- 15 skills upgraded to "community" (recognized patterns in the ecosystem)
UPDATE public.claude_skills SET status = 'community' WHERE id = 10;  -- snapshot-testing
UPDATE public.claude_skills SET status = 'community' WHERE id = 15;  -- performance-profiling
UPDATE public.claude_skills SET status = 'community' WHERE id = 27;  -- refactoring-patterns
UPDATE public.claude_skills SET status = 'community' WHERE id = 29;  -- dependency-audit
UPDATE public.claude_skills SET status = 'community' WHERE id = 30;  -- performance-optimization
UPDATE public.claude_skills SET status = 'community' WHERE id = 31;  -- load-testing
UPDATE public.claude_skills SET status = 'community' WHERE id = 32;  -- documentation-generator
UPDATE public.claude_skills SET status = 'community' WHERE id = 33;  -- changelog-automation
UPDATE public.claude_skills SET status = 'community' WHERE id = 34;  -- ci-cd-integration
UPDATE public.claude_skills SET status = 'community' WHERE id = 38;  -- video-editing-helper
UPDATE public.claude_skills SET status = 'community' WHERE id = 39;  -- data-visualization
UPDATE public.claude_skills SET status = 'community' WHERE id = 40;  -- sql-query-builder
UPDATE public.claude_skills SET status = 'community' WHERE id = 41;  -- csv-processing
UPDATE public.claude_skills SET status = 'community' WHERE id = 44;  -- research-assistant
UPDATE public.claude_skills SET status = 'community' WHERE id = 45;  -- technical-writing
