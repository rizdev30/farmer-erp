# 04 — Next.js Architecture

## Your Custom Rules

<!-- ✏️ PASTE YOUR RULES HERE — these take highest priority -->


<!-- END OF YOUR CUSTOM RULES -->

---

## Universal Next.js Rules

### Always Read the Official Docs First

Before using ANY Next.js API, check:
```
node_modules/next/dist/docs/
```
Next.js has breaking changes between major versions.
Do not rely on memory or training data — verify against the installed version's docs.

### App Router Only

- Never mix App Router (`app/`) with Pages Router (`pages/`)
- Never use `getServerSideProps`, `getStaticProps`, or `getInitialProps`
- Use Server Components and Server Actions for data fetching and mutations

### Server vs Client Components

```
Default: Server Component (no directive)
Add "use client" ONLY when you need:
  - useState, useReducer, useContext
  - useEffect, useLayoutEffect
  - Browser APIs (window, document, localStorage)
  - Event handlers passed as props
  - Third-party client-only libraries
```

- Keep `"use client"` components as small and low in the tree as possible
- Never fetch data or call the database inside a `"use client"` component directly
- Never import Server-only code (database clients, secrets) into client components

### Async Request APIs — Mandatory in Next.js 15+/16

These APIs are **async** and must be awaited:
- `cookies()`
- `headers()`
- `draftMode()`
- `params` in layouts, pages, and route handlers
- `searchParams` in pages

```typescript
// ✅ Correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ❌ Wrong — synchronous access no longer works
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id; // will fail in Next.js 16
}
```

### Middleware / Proxy

- In Next.js 16+, the middleware file is named `proxy.ts` (not `middleware.ts`)
- Do not use the edge runtime in `proxy.ts` — use Node.js runtime
- Keep proxy logic minimal — only routing decisions and auth redirects

### Server Actions

- All data mutations go in dedicated Server Action files marked `"use server"`
- Always check authentication at the top of every Server Action
- Always check authorization (user role/permission) before performing the operation
- Validate all inputs before any database operation
- Return structured responses `{ success, data?, error? }` — never throw raw errors to the client

### API Routes

- Create API routes only when needed (webhooks, third-party callbacks, REST APIs)
- Prefer Server Actions for form submissions and UI-triggered mutations
- Always authenticate and authorize at the top of every route handler

### Performance

- Use Server Components for initial data loading — avoid client-side waterfalls
- Use `loading.tsx` for Suspense boundaries on slow data
- Lazy load heavy client components with `dynamic()`
- Avoid fetching the same data in multiple places — centralize data fetching
