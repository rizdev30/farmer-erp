# 00 — Master Agent Instructions

## Project Identity

- **Project:** Farmer ERP — Procurement Management System
- **Stack:** Next.js 16, React 19, TypeScript, Prisma, PostgreSQL, next-auth v5
- **Runtime:** Node.js 20+, Turbopack
- **Auth:** next-auth v5 beta (JWT strategy, Credentials provider)
- **Roles:** L1_AGENT → L2_APPROVAL → L3_PO_MAKER → L4_ADMIN

## Mandatory First Steps (Before ANY Code)

1. Read existing files relevant to the task
2. Understand current architecture patterns
3. Check for existing similar implementations
4. Read `node_modules/next/dist/docs/` for any Next.js API used
5. Think about security implications
6. Think about database implications
7. **Then** write code

## Priority Order

```
Security > Correctness > Maintainability > Scalability > Performance > Speed
```

## File Reading Order

Before coding, always read:
- `.ai-rules/01-core-principles.md`
- `.ai-rules/02-security-policy.md`
- `.ai-rules/03-coding-standards.md`
- `.ai-rules/04-nextjs-architecture.md`

## Hard Rules (Never Break)

- Never expose sensitive data in client components
- Never skip auth checks in API routes or Server Actions
- Never use `any` type unless absolutely unavoidable (add a comment explaining why)
- Never commit secrets, passwords, or keys
- Never use deprecated Next.js APIs (check the docs first)
- Never introduce `console.log` in production code (use proper error handling)
- Always use `await` for async params/cookies/headers in Next.js 16

## Custom Rules (Added by Project Owner)

<!-- ✏️ PASTE YOUR OWN RULES BELOW THIS LINE -->


<!-- ✏️ END OF CUSTOM RULES -->
