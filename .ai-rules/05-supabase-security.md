# SUPABASE SECURITY STANDARDS (2026)

## Purpose

This file defines mandatory security standards for all Supabase projects.

The AI must treat Supabase as a production database containing sensitive user data.

Security, privacy, data integrity, and tenant isolation are mandatory.

---

# Core Security Principles

Always follow:

* Zero Trust
* Least Privilege
* Defense in Depth
* Secure By Default
* Deny By Default

Assume every request can be malicious.

Never trust client-side logic.

---

# Row Level Security (RLS)

## Mandatory Rule

Every user-facing table must have:

* RLS enabled
* Explicit policies defined

Never leave user-accessible tables without RLS.

Forbidden:

* Public unrestricted access
* Wide-open select policies
* Wide-open insert policies
* Wide-open update policies
* Wide-open delete policies

---

## Ownership Enforcement

Every user-owned record must contain:

```sql
user_id uuid not null
```

or equivalent ownership field.

Policies must verify ownership.

Users may only access their own records unless role-based access explicitly permits otherwise.

---

## Policy Design

Policies must:

* Be explicit
* Be least privilege
* Be easily auditable

Avoid overly complex policy logic.

Prefer clear ownership-based rules.

---

# Service Role Security

## Critical Rule

Never expose:

* service_role key
* database passwords
* admin credentials

to:

* Browsers
* Client Components
* Mobile apps
* Public APIs

Service role keys must remain server-side only.

---

# Supabase Client Usage

## Browser Client

Use browser clients only for:

* Authenticated user actions
* User-owned resources

Never grant elevated permissions.

---

## Server Client

Use server clients for:

* Protected operations
* Administrative actions
* Background jobs
* Scheduled tasks

Authorization checks remain mandatory.

---

# Multi-Tenant Security

If supporting organizations, workspaces, teams, or tenants:

Every protected table must contain:

```sql
tenant_id uuid not null
```

All queries must enforce tenant boundaries.

Users must never access data from another tenant.

---

## Tenant Isolation

Every:

* Query
* RPC
* Policy
* Storage operation

must verify tenant ownership.

Cross-tenant access must be impossible unless explicitly authorized.

---

# Storage Bucket Security

Treat uploaded files as hostile.

---

## Upload Validation

Always validate:

* MIME type
* File extension
* File size

Reject invalid uploads.

---

## File Naming

Never trust user-provided filenames.

Generate unique identifiers.

Example:

```text
user-id/random-uuid.pdf
```

Avoid predictable file paths.

---

## Private Buckets

Sensitive content must use:

Private Buckets

Examples:

* Documents
* Student submissions
* AI uploads
* Personal files
* Internal assets

Public buckets should contain only intentionally public content.

---

## Bucket Policies

Storage policies must enforce:

* Ownership
* Tenant isolation
* Authorization

Users must never access another user's files.

---

# RPC Security

## Function Security

Treat every RPC as an API endpoint.

Validate:

* Authentication
* Authorization
* Ownership

before performing actions.

---

## SECURITY DEFINER

Avoid SECURITY DEFINER unless absolutely necessary.

If used:

* Audit carefully
* Restrict access
* Validate permissions internally

Never bypass authorization unintentionally.

---

## Input Validation

Validate all RPC inputs.

Never trust:

* IDs
* User IDs
* Tenant IDs
* File IDs

coming from clients.

---

# Database Design Standards

---

## Primary Keys

Prefer:

```sql
uuid primary key
```

Avoid sequential IDs for externally visible resources.

---

## Foreign Keys

Use foreign key constraints.

Enforce referential integrity.

Avoid orphaned records.

---

## Cascades

Use cascading deletes carefully.

Avoid accidental mass deletion.

Prefer soft deletes for critical data.

---

# Database Indexing Rules

Every table must be reviewed for indexing.

---

## Required Indexes

Index:

* user_id
* tenant_id
* created_at
* foreign keys

when frequently queried.

---

## Composite Indexes

Create composite indexes for common filters.

Example:

```sql
(user_id, created_at)
(tenant_id, status)
```

Optimize actual query patterns.

---

## Query Performance

Avoid:

* Full table scans
* Unbounded queries
* Large offset pagination

Prefer:

* Cursor pagination
* Indexed filters
* Efficient joins

---

# Audit Logging

Critical actions must be auditable.

Log:

* User ID
* Tenant ID
* Action
* Resource
* Timestamp

Examples:

* Account deletion
* Permission changes
* Admin actions
* Billing actions
* Content moderation

---

## Audit Log Security

Audit logs must:

* Be append-only when possible
* Be protected from tampering
* Exclude secrets

Never log:

* Passwords
* Tokens
* Session data
* API keys

---

# Soft Deletes

For critical resources:

Prefer:

```sql
deleted_at timestamp
```

instead of permanent deletion.

Allow recovery where appropriate.

---

# Backups & Recovery

Design database operations assuming:

* Mistakes happen
* Rollbacks may be needed

Avoid destructive migrations without clear rollback paths.

---

# AI Application Security

If AI features exist:

Never store:

* API keys
* Secrets
* System prompts

inside client-accessible tables.

Protect:

* Conversation history
* Uploaded documents
* Embeddings
* Generated outputs

using RLS.

---

# Webhook Security

All webhooks must:

* Verify signatures
* Validate payloads
* Prevent replay attacks

Never trust webhook data by default.

---

# Migrations

Every migration must:

1. Enable RLS if applicable
2. Create required policies
3. Add required indexes
4. Add foreign keys
5. Include rollback considerations

A table is not complete until security policies exist.

---

# Security Review Checklist

Before any database change verify:

✓ RLS enabled

✓ Policies created

✓ Ownership enforced

✓ Tenant isolation enforced

✓ Service role protected

✓ Storage secured

✓ RPC secured

✓ Input validated

✓ Indexes added

✓ Audit logging considered

✓ Foreign keys defined

✓ No sensitive data exposed

✓ No privilege escalation path

✓ No cross-tenant access

If any item fails, stop and resolve the issue before deployment.
