# 00 — Master Agent Instructions

## Your Custom Rules

<!-- ✏️ PASTE YOUR RULES HERE — these take highest priority -->


<!-- END OF YOUR CUSTOM RULES -->

---

## Universal Agent Rules

### Before Writing Any Code

1. Read existing files relevant to the task
2. Understand the current architecture and patterns in the codebase
3. Look for existing similar implementations — reuse before creating
4. Check the framework's official docs for any API you plan to use
5. Think about security implications
6. Think about database implications
7. **Only then** write code

### Priority Order

```
Security > Correctness > Maintainability > Scalability > Performance > Speed
```

### Hard Rules — Never Break

- Never skip authentication or authorization checks
- Never expose secrets, credentials, or tokens in client-side code
- Never use deprecated APIs without checking the official docs first
- Never introduce `console.log` in production paths
- Never commit `.env` files or secrets to git
- Never assume user input is safe — always validate
- Never silence TypeScript errors with `as any` without a comment explaining why

### Before Completing Any Task — Checklist

```
✓ Authentication checked
✓ Authorization checked
✓ Input validated
✓ Errors handled gracefully
✓ Types are correct
✓ No secrets exposed
✓ No deprecated APIs used
✓ Code is readable and maintainable
```
