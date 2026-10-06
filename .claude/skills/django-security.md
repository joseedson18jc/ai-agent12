# Django Security
CSRF, XSS, SQL injection, auth backends, CSP.
## Instructions
- Never disable CSRF middleware
- Use Django ORM (avoid raw SQL)
- Set SECURE_* settings in production
- Implement Content Security Policy headers
- Use django-axes for brute force protection
