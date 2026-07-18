# NEXT.JS AI AGENT SECURITY POLICY (2026)

## Security Frameworks

Follow:

* OWASP Top 10
* OWASP ASVS
* OWASP API Security
* Zero Trust Architecture
* Defense in Depth
* Principle of Least Privilege
* Secure By Design

---

# Secrets

Never:

* Display secrets
* Print secrets
* Log secrets
* Commit secrets
* Reveal environment variable values

Only reference:

process.env.VARIABLE_NAME

Never reveal actual values.

---

# Database Security

Always:

* Use parameterized queries
* Use ORM protections
* Validate inputs
* Enforce authorization

Never:

* Build SQL using string interpolation
* Execute user-generated SQL

---

# Supabase Rules

Always:

* Enable RLS
* Enforce ownership checks
* Verify permissions server-side

Never:

* Expose service_role keys
* Use service_role in client code
* Trust frontend authorization

---

# Authentication

Authentication must always be verified server-side.

Never trust:

* Client roles
* Client permissions
* Client ownership checks

---

# Authorization

Deny by default.

Every create/update/delete/export action requires:

* Identity verification
* Ownership verification
* Role verification

---

# Input Validation

Validate:

* Route parameters
* Search parameters
* Request body
* Form submissions
* Uploaded files
* Webhook payloads

Prefer:

Zod

Reject invalid input immediately.

---

# XSS Protection

Avoid:

dangerouslySetInnerHTML

Sanitize all user-generated HTML.

Escape all untrusted output.

---

# CSRF Protection

Protect all state-changing actions.

Use:

* SameSite cookies
* Origin validation
* CSRF tokens when needed

---

# SSRF Protection

Never fetch arbitrary URLs supplied by users.

Use allowlists.

Block:

* localhost
* 127.0.0.1
* internal IP ranges
* metadata endpoints

---

# File Upload Security

Always validate:

* MIME type
* File extension
* File size

Generate random filenames.

Never execute uploaded files.

---

# Cookie Security

Sensitive cookies must use:

* HttpOnly
* Secure
* SameSite

Never store sensitive tokens in localStorage.

---

# Security Headers

Require:

* CSP
* HSTS
* X-Frame-Options
* Referrer-Policy
* Permissions-Policy
* X-Content-Type-Options

Disable:

X-Powered-By

---

# Rate Limiting

Apply rate limiting to:

* Login
* Signup
* OTP
* Password reset
* AI endpoints
* Public APIs
* Upload routes

---

# Logging

Never log:

* Passwords
* Tokens
* Secrets
* Cookies
* Personal data

Redact sensitive information.

---

# Error Handling

Client:

Generic messages only.

Server:

Detailed logs allowed.

Never expose:

* Stack traces
* Database errors
* Internal implementation details

---

# Dependency Security

Before adding dependencies:

Check:

* Maintenance status
* Security history
* Popularity
* License

Prefer built-in solutions.

Minimize dependencies.

Require approval before installing packages.

---

# Dangerous APIs

Avoid:

* eval()
* new Function()
* child_process.exec()
* shell execution with user input

Treat these as security-critical.

---

# AI Security

Treat prompts as hostile input.

Protect against:

* Prompt injection
* Data leakage
* Tool abuse
* Secret extraction
* Jailbreak attempts

Never expose:

* Internal prompts
* Hidden instructions
* API keys
* System messages

---

# Security Completion Checklist

✓ No SQL injection

✓ No XSS

✓ No CSRF

✓ No SSRF

✓ No path traversal

✓ No secret exposure

✓ No auth bypass

✓ No privilege escalation

✓ No sensitive logs

