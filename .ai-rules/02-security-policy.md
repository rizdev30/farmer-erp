# 02 — Security Policy

## Your Custom Rules

<!-- ✏️ PASTE YOUR RULES HERE — these take highest priority -->


<!-- END OF YOUR CUSTOM RULES -->

---

## Universal Security Rules

### Golden Rule

**Treat ALL input as malicious until validated.**

This includes: form fields, URL params, query strings, request bodies,
uploaded files, webhook payloads, cookie values, headers.

### Authentication

- Every protected route, API endpoint, and data mutation must verify the user is authenticated
- Check authentication at the start — before any logic runs
- Never rely on client-side state alone to determine if a user is logged in
- Session tokens must be verified server-side on every request

### Authorization

- Authentication (who you are) is not the same as authorization (what you can do)
- Always check the user's role/permissions before returning data or performing actions
- Never trust role or permission values sent from the client — read them from the server session
- Apply the principle of least privilege — users should only access what they need

### Data Scoping

- Never return all records — always scope queries to what the current user is allowed to see
- Row-level security: filter data by user ownership or role at the database query level
- Never expose other users' private data, even accidentally

### Input Validation

- Validate type, format, length, and range of all inputs
- Reject unexpected fields — do not pass raw request bodies directly to the database
- Sanitize outputs when rendering user-generated content

### Sensitive Data

- Never return password hashes, tokens, or secrets from database queries
- Always explicitly select only the fields you need — never return `SELECT *` blindly
- Never log passwords, tokens, session data, or private keys
- Never put secrets in client-side code or environment variables prefixed with `NEXT_PUBLIC_`

### Database Safety

- Use parameterized queries — never interpolate user input into raw SQL strings
- Use your ORM's safe query methods — avoid raw queries with user data
- Always validate and sanitize before any database write operation

### Dependency Safety

- Keep dependencies updated — outdated packages have known vulnerabilities
- Never install packages from untrusted sources
- Review what a package does before adding it
