# 04 — Next.js 16 Architecture

## Always Read the Docs First

Before using ANY Next.js API, read:
```
node_modules/next/dist/docs/01-app/
```

Next.js 16 has breaking changes from v14. Do NOT rely on training data.

## App Router Only

This project uses the **App Router exclusively**. Never use:
- `pages/` directory
- `getServerSideProps`
- `getStaticProps`
- `getInitialProps`

## Server vs Client Components

```
Rule: Server Component by default.
Only add "use client" when you need:
  - useState / useReducer
  - useEffect
  - Event handlers (onClick, onChange)
  - Browser APIs (window, document, localStorage)
  - next-auth's useSession
  - next/navigation hooks (useRouter, usePathname)
```

```typescript
// ✅ Server Component — fetches data directly
// No "use client" directive
export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats(session.user.id);
  return <StatsGrid stats={stats} />;
}

// ✅ Client Component — needs interactivity
"use client";
export default function ProcurementForm() {
  const [crop, setCrop] = useState("");
  return <form>...</form>;
}
```

## Server Actions (Mutations)

All data mutations go in `src/app/actions/`:

```typescript
// src/app/actions/farmers.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function createFarmer(data: CreateFarmerInput) {
  // 1. Auth check
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // 2. Role check
  const role = (session.user as any).role;
  if (!["L1_AGENT", "L4_ADMIN"].includes(role)) {
    throw new Error("Forbidden");
  }

  // 3. Validate input
  if (!data.name || !data.phone) throw new Error("Missing required fields");

  // 4. Database operation
  return await prisma.farmer.create({
    data: { ...data, registeredById: session.user.id }
  });
}
```

## API Routes (REST)

Only create API routes when:
- External services need to call your app (webhooks)
- Client-side fetch is required (not Server Actions)
- next-auth handlers (`/api/auth/[...nextauth]`)

```typescript
// src/app/api/agents/route.ts
import { auth } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "L4_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const agents = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  return Response.json(agents);
}
```

## Proxy (Middleware) — Next.js 16

The middleware file is now named `proxy.ts` (not `middleware.ts`):

```typescript
// src/proxy.ts  ← correct filename in Next.js 16
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // route protection logic
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
```

## Caching Strategy

This project uses a custom SWR cache (`src/lib/swr-cache.ts`):

```typescript
// ✅ Use useSWRCache for client-side data fetching with caching
const { data, isLoading, error } = useSWRCache<FarmerProfile>(
  `farmer-${id}`,
  async () => getFarmerById(id),
  { ttl: 60000 } // 1 minute cache
);

// ✅ Invalidate cache after mutations
invalidateCache(`farmer-${id}`);
invalidateCache("dashboard-*");
```

## Routing Patterns

```
/                     → Redirect to /login or /dashboard
/login                → Login page (public)
/dashboard            → Main stats page
/dashboard/farmers    → Farmer directory
/dashboard/farmers/[id] → Farmer profile
/dashboard/procurement → New procurement form
/dashboard/history    → Purchase records list
/dashboard/history/[slipId] → Receipt / approval page
/dashboard/agents     → Agent management (L4_ADMIN only)
/dashboard/settings   → User settings
```

## Performance Rules

- Prefetch critical data using SWR cache
- Use `loading.tsx` for Suspense boundaries
- Keep Server Components as high in the tree as possible
- Lazy load heavy components with `dynamic()` when needed

```typescript
// ✅ Lazy load heavy components
import dynamic from "next/dynamic";
const PurchaseSlip = dynamic(() => import("@/components/PurchaseSlip"), {
  loading: () => <Skeleton />,
});
```

## Custom Rules (Added by Project Owner)

<!-- ✏️ PASTE YOUR OWN RULES BELOW THIS LINE -->


<!-- ✏️ END OF CUSTOM RULES -->
