# 01 — Core Principles

## Think Before Coding

Do NOT immediately generate code.

Ask yourself:
1. Does a similar pattern already exist in this codebase?
2. What is the simplest correct solution?
3. What could go wrong?
4. Does this introduce technical debt?

## DRY (Don't Repeat Yourself)

- Reuse existing Server Actions in `src/app/actions/`
- Reuse existing components in `src/components/`
- Reuse existing lib utilities in `src/lib/`
- If copying code — extract it into a shared utility instead

## SOLID Principles

- **Single Responsibility:** Each file/component does one thing
- **Open/Closed:** Extend behavior without modifying existing code
- **Liskov Substitution:** Subtypes must be substitutable
- **Interface Segregation:** Small focused interfaces
- **Dependency Inversion:** Depend on abstractions

## No Hacks

- No `// @ts-ignore` without explanation
- No `// eslint-disable` without explanation
- No magic numbers — use named constants
- No hardcoded strings that should be config
- No workarounds that hide real bugs

## Error Handling

Always handle errors explicitly:

```typescript
// ✅ Correct
try {
  const data = await prisma.farmer.findMany();
  return { success: true, data };
} catch (error) {
  console.error("[ACTION_NAME]", error);
  return { success: false, error: "Failed to fetch farmers" };
}

// ❌ Wrong
const data = await prisma.farmer.findMany(); // unhandled rejection
```

## Type Safety

- Always define TypeScript interfaces for data shapes
- Use `Prisma` generated types where possible
- Never use `as any` to silence TypeScript errors
- Use `satisfies` operator for config objects

## Completeness Rule

Every feature must have:
- ✅ Authentication check
- ✅ Authorization check (role-based)
- ✅ Input validation
- ✅ Error handling
- ✅ Loading state (UI)
- ✅ Empty state (UI)

## Custom Rules (Added by Project Owner)

<!-- ✏️ PASTE YOUR OWN RULES BELOW THIS LINE -->


<!-- ✏️ END OF CUSTOM RULES -->
