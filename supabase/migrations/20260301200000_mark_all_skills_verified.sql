-- Mark all 108 skills as verified (production-ready with .claude/ configs)
UPDATE public.claude_skills SET status = 'verified' WHERE status != 'verified';
