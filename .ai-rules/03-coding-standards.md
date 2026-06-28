# 03 — Coding Standards

## Your Custom Rules

<!-- ✏️ PASTE YOUR RULES HERE — these take highest priority -->


<!-- END OF YOUR CUSTOM RULES -->

---

## Universal Coding Standards

### Naming Conventions

| Thing | Style | Example |
|-------|-------|---------|
| Components | PascalCase | `UserCard`, `DataTable` |
| Functions | camelCase | `getUser()`, `handleSubmit()` |
| Variables | camelCase | `isLoading`, `userName` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_URL` |
| Types / Interfaces | PascalCase | `UserProfile`, `ApiResponse` |
| Files (components) | PascalCase | `UserCard.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| CSS classes | kebab-case | `glass-card`, `form-input` |

### File & Folder Conventions

- One component per file
- Group related files by feature, not by type
- Keep files small and focused — split when a file grows too large
- Co-locate tests with the code they test

### Import Order

```typescript
// 1. Framework / runtime imports
// 2. Third-party library imports
// 3. Internal — feature modules
// 4. Internal — shared utilities / components
// 5. Types
```

### Component Rules

- Keep components small and focused on one responsibility
- Extract reusable logic into custom hooks or utility functions
- Avoid deeply nested JSX — extract sub-components when nesting gets complex
- Never mix data fetching logic with rendering logic in the same component

### CSS / Styling Rules

- Never use multi-line string literals inside className attributes — it breaks some bundlers
- Extract long or repeated className strings into named CSS classes
- Never use inline `style` for layout — use your CSS utility system

```typescript
// ❌ Can break Turbopack and similar bundlers
className="w-full px-4
  rounded-xl border"

// ✅ Always single line or extract to a CSS class
className="w-full px-4 rounded-xl border"
```

### Comments

- Write comments that explain **why**, not **what** (the code already shows what)
- Remove commented-out dead code before committing
- Add a `// TODO:` comment with your name and date if leaving known incomplete work

### No Debugging Code in Commits

- No `console.log`, `console.debug`, `alert()`, or `debugger` in committed code
- Use proper logging utilities for server-side diagnostic output

### Keep Functions Small

- A function should do one thing
- If a function is longer than ~40 lines, consider breaking it up
- Avoid functions with more than 4–5 parameters — use an options object instead
