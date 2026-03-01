# SQL Query Builder
Generate optimized SQL queries with proper indexing strategies.
## Instructions
- Use parameterized queries (never string concatenation)
- Add appropriate indexes for WHERE/JOIN columns
- Use EXPLAIN ANALYZE to verify query plans
- Optimize JOINs and subqueries
- Handle pagination with keyset (not OFFSET)
