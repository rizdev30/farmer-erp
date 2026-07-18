# NEXT.JS ARCHITECTURE STANDARDS (2026)

## Purpose

This file defines the required architecture patterns for all Next.js projects.

The goal is to ensure:

* Security
* Scalability
* Maintainability
* Performance
* Production readiness

---

# Architecture Philosophy

Prefer:

* Simplicity
* Modularity
* Reusability
* Separation of concerns

Avoid:

* Monolithic components
* Business logic inside UI
* Duplicate code
* Tight coupling

---

# Router Standards

When available:

Prefer App Router.

Use:

```text
app/
```

Avoid creating new Pages Router routes unless the project already uses them.

Follow the existing project structure.

---

# Folder Structure

Preferred structure:

```text
app/
components/
features/
lib/
hooks/
types/
actions/
services/
repositories/
middleware/
tests/
```

Keep responsibilities separated.

---

# Server Components First

Prefer:

Server Components

for:

* Database access
* Data fetching
* Auth checks
* Protected content

Use Client Components only when necessary.

Examples:

* Forms
* Browser APIs
* Interactive UI
* State management

---

# Server Actions

Prefer Server Actions for:

* Mutations
* Form submissions
* Secure write operations

Keep secrets and business logic server-side.

---

# Data Fetching

Prefer:

* Server Components
* Route Handlers
* Server Actions

Avoid unnecessary client-side fetching.

Reduce network requests.

---

# Authentication Architecture

Authentication checks must occur server-side.

Never trust:

* Client roles
* Client permissions
* Client ownership claims

Authorization must be enforced on the server.

---

# Database Access

Database access should occur only:

* Server Components
* Server Actions
* Route Handlers
* Backend services

Never expose database credentials.

Never expose service role keys.

---

# Service Layer Pattern

Business logic belongs in:

```text
services/
```

Example:

```text
services/user-service.ts
services/payment-service.ts
services/course-service.ts
```

Avoid placing business logic inside components.

---

# Repository Pattern

Database operations belong in:

```text
repositories/
```

Example:

```text
repositories/user-repository.ts
repositories/course-repository.ts
```

Separate database access from business logic.

---

# Validation Layer

Validate all external input.

Use:

Zod

or project-approved validation library.

Validation must occur before:

* Database writes
* Business logic execution
* API processing

---

# Error Handling

Use centralized error handling.

Never expose:

* SQL errors
* Stack traces
* Internal implementation details

to users.

---

# Caching Strategy

Prefer:

* Next.js caching
* Route caching
* Revalidation

Avoid unnecessary database calls.

Cache expensive operations.

---

# API Design

All APIs must:

* Validate input
* Verify authentication
* Verify authorization
* Return proper status codes
* Handle errors safely

Avoid public write endpoints.

---

# State Management

Prefer:

1. Server state
2. URL state
3. Local component state

Only introduce global state when necessary.

Avoid unnecessary state libraries.

---

# File Upload Architecture

Treat uploads as untrusted.

Validate:

* Type
* Size
* Extension

Store uploads securely.

Never execute uploaded content.

---

# Security Architecture

Apply:

* RLS
* Authorization checks
* Validation
* Rate limiting
* Security headers

to all production systems.

---

# Observability

Implement:

* Error monitoring
* Audit logging
* Performance monitoring

Critical actions should be traceable.

---

# Testing Architecture

Critical features require:

* Unit tests
* Integration tests

Security-sensitive features require testing before deployment.

---

# Scalability Rules

Design assuming:

* More users
* More data
* More traffic

Avoid architecture that only works at small scale.

---

# Definition of Good Architecture

A solution is considered acceptable only if it is:

✓ Secure

✓ Maintainable

✓ Scalable

✓ Testable

✓ Type-safe

✓ Production-ready

✓ Compatible with current Next.js standards
