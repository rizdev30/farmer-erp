# 01 — Core Principles

## Your Custom Rules

<!-- ✏️ PASTE YOUR RULES HERE — these take highest priority -->


<!-- END OF YOUR CUSTOM RULES -->

---

## Universal Core Principles

### Think Before Coding

Do not immediately generate code. Ask first:
- Does a similar pattern already exist in this codebase?
- What is the simplest correct solution?
- What could go wrong?
- Does this introduce technical debt?

### DRY — Don't Repeat Yourself

- Reuse existing utilities, helpers, and components before creating new ones
- If you copy code more than once — extract it into a shared function
- Shared logic belongs in a dedicated utility file, not scattered across files

### No Hacks

- No `// @ts-ignore` without a written explanation of why
- No `// eslint-disable` without a written explanation of why
- No magic numbers — use named constants
- No hardcoded values that should come from config or environment
- No workarounds that hide real bugs instead of fixing them

### Error Handling

- Always handle errors explicitly — never let promises reject silently
- Return meaningful error messages — not raw stack traces to the user
- Log errors server-side with enough context to debug
- Show user-friendly messages on the client

### Type Safety

- Define TypeScript types/interfaces for all data shapes
- Use generated types from your ORM or schema where available
- Never use `as any` to silence TypeScript — fix the root cause instead
- Prefer `unknown` over `any` when the type is genuinely unknown

### Completeness

Every feature must have:
- ✅ Authentication check
- ✅ Authorization check
- ✅ Input validation
- ✅ Error handling
- ✅ Loading state (UI)
- ✅ Empty state (UI)
- ✅ Edge case handling
