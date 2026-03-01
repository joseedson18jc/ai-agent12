# JPA Patterns
Entity mapping, lazy loading, N+1 prevention, transaction management.
## Instructions
- Use lazy loading by default
- Prevent N+1 with JOIN FETCH or EntityGraph
- Keep transactions short and focused
- Use DTOs for API responses (not entities)
- Audit entities with @CreatedDate/@LastModifiedDate
