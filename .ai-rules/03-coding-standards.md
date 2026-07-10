# Minimal Code Engineering Rules

## Primary Objective

Write the minimum amount of code required to solve the problem while maintaining readability, correctness, performance, and maintainability.

---

# Reuse Before Building

Always check if the existing codebase already contains a solution.

Priority:

1. Existing project components
2. Existing project hooks
3. Existing utilities
4. Existing services
5. Framework APIs
6. Installed libraries
7. Browser APIs
8. Custom implementation

Never duplicate functionality.

---

# Never Reinvent Existing Libraries

Before writing custom code, check whether the feature already exists in:

- React
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- Prisma
- Zod
- React Hook Form
- TanStack Query
- Browser APIs

Use existing libraries whenever possible.

---

# Write Less Code

Every line of code must have a purpose.

Avoid:

- unnecessary wrappers
- unnecessary helper functions
- unnecessary utility files
- unnecessary abstractions
- duplicated logic
- overengineering

If 15 lines solve the problem, never write 150.

---

# Modify Existing Code

Before creating:

- new file
- new hook
- new utility
- new component

check whether an existing one can be extended.

Prefer editing existing files over creating new ones.

---

# Avoid New Dependencies

Do not install new npm packages unless:

- the problem cannot reasonably be solved using existing dependencies
- the package is actively maintained
- the package significantly reduces complexity

Explain why the dependency is required before recommending installation.

---

# Keep Components Small

Components should have a single responsibility.

Do not split components unless it improves:

- readability
- reuse
- maintainability

---

# Prefer Composition

Reuse:

- components
- hooks
- styles
- utilities
- layouts

Avoid duplicate implementations.

---

# Use Official APIs

Always prefer official APIs over custom implementations.

Examples:

- use fetch()
- use Next.js APIs
- use React hooks
- use browser APIs
- use Prisma APIs

Do not recreate existing functionality.

---

# Remove Before Adding

If existing code can be simplified or deleted,
prefer deleting code over adding more.

Less code is usually better code.

---

# Production Quality

Generated code must be:

- production ready
- readable
- maintainable
- typed
- minimal

Never generate placeholder code.

Never generate unused functions.

Never generate unused variables.

Never generate dead code.

---

# Output Rules

Before responding, verify:

✓ No duplicate code

✓ No unnecessary files

✓ No unnecessary abstractions

✓ No unnecessary dependencies

✓ Existing project code reused

✓ Existing libraries reused

✓ Minimum number of lines written


# Code Efficiency Examples (Mandatory)

The goal is not to write more code.
The goal is to solve the problem with the simplest, cleanest, and most maintainable solution.

Examples:
 
 ✓ If the task can be completed in **10 lines**, do not write **100**.
 ✓ If an existing component solves the problem, reuse it instead of creating a new one.
 ✓ If React already provides the feature, do not write a custom implementation.
 ✓ If Next.js has an official API, use it instead of creating your own.
 ✓ If Tailwind CSS can solve the styling, do not write custom CSS.
 ✓ If shadcn/ui already has the component, never recreate it.
 ✓ If Prisma can perform the query directly, do not write unnecessary processing logic.
 ✓ If one function solves the problem, do not split it into five functions.
 ✓ If one component is sufficient, do not create multiple wrapper components.
 ✓ If editing one existing file solves the problem, do not create five new files.
 ✓ If an existing npm package already solves the problem, use it instead of implementing it from scratch.


If a library already solves the problem, use it.

If existing project code solves the problem, reuse it.

If the problem can be solved by editing one file, never create five files.


# CLEAN CODE & ARCHITECTURE STANDARDS

## Code Quality

Code must be:

* Readable
* Testable
* Maintainable
* Modular
* Predictable

Avoid:

* Spaghetti code
* Massive files
* Deep nesting
* Duplicate logic
* Magic values

---

## TypeScript Rules

Always:

* Enable strict mode
* Use explicit types
* Use interfaces where appropriate

Avoid:

* any
* ts-ignore
* unsafe casting

Prefer:

unknown over any

---

## Component Standards

Keep components focused.

One component = one responsibility.

Extract reusable logic.

Avoid components larger than 300 lines unless justified.

---

## API Standards

Every endpoint must:

* Validate input
* Handle errors
* Return correct status codes
* Verify authorization

Use:

200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
429 Too Many Requests
500 Internal Server Error

appropriately.

---

## Database Standards

Optimize:

* Queries
* Indexes
* Pagination

Avoid:

* N+1 queries
* Full table scans
* Unbounded queries

---

## Performance Standards

Optimize:

* Bundle size
* Database calls
* API response time
* Caching

Measure before optimizing.

---

## Testing Standards

For critical code:

Require:

* Unit tests
* Integration tests

For security-sensitive features:

Require tests before deployment.

---

## CI/CD Requirements

Every pull request must pass:

* Build
* Lint
* Typecheck
* Tests
* Security checks

No deployment if checks fail.

---

## Architecture Standards

Use:

* Server Components when appropriate
* Server-side authorization
* Centralized validation
* Service layer architecture
* Reusable utilities

Keep business logic out of UI components.

---

## Documentation Standards

Document:

* APIs
* Database schema changes
* Security decisions
* Breaking changes

Keep documentation synchronized with code.

---

## Change Control

Require approval before:

* New dependencies
* Auth changes
* Database schema changes
* Environment changes
* Security policy changes
* Major version upgrades

---

## Definition of Done

A task is complete only if:

✓ Feature works

✓ Build passes

✓ Lint passes

✓ Typecheck passes

✓ Security maintained

✓ Tests pass

✓ Documentation updated

✓ No technical debt introduced
