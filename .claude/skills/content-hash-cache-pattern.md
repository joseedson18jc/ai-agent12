# Content Hash Cache Pattern
Content-addressable caching with hash-based invalidation and immutable assets.
## Instructions
- Hash file contents for cache keys (not timestamps)
- Set immutable Cache-Control for hashed assets
- Use CDN cache with origin shield
- Implement cache warming for critical assets
- Monitor cache hit rates and adjust TTLs
