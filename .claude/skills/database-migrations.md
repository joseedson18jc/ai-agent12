# Database Migrations (ECC)
Zero-downtime changes, data backfills, rollback strategies.
## Instructions
- Add columns as nullable first, backfill, then add constraint
- Never rename columns in one migration (add new, migrate, drop old)
- Test rollback for every migration
- Use batched updates for large data backfills
- Monitor lock duration during migrations
