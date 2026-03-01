# Database Migration
Schema version management and safe migration patterns.
## Instructions
- Always create reversible migrations (up/down)
- Test migrations against production-like data
- Never modify released migrations
- Use zero-downtime patterns for large tables
- Back up before applying to production
