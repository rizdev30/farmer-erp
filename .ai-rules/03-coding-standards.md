# 03 — Coding Standards

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page (unauthenticated)
│   ├── actions/            # Server Actions (data mutations)
│   ├── api/                # API Routes (REST endpoints)
│   └── dashboard/          # Protected dashboard pages
│       ├── farmers/        # Farmer directory
│       ├── procurement/    # New procurement form
│       ├── history/        # Purchase records
│       ├── agents/         # Agent management (L4 only)
│       └── settings/       # User settings
├── components/             # Reusable UI components
├── lib/                    # Utilities (prisma, swr-cache, etc.)
└── types/                  # TypeScript type declarations
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `FarmerCard.tsx` |
| Pages | `page.tsx` | `dashboard/farmers/page.tsx` |
| Server Actions | camelCase functions | `createFarmer()` |
| API Routes | `route.ts` | `api/farmers/route.ts` |
| CSS classes | kebab-case | `glass-card`, `login-input` |
| Variables | camelCase | `farmerName`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_BAGS`, `ROLES` |
| Types/Interfaces | PascalCase | `FarmerProfile`, `ProcurementRecord` |

## File Conventions (Next.js 16)

| File | Purpose |
|------|---------|
| `page.tsx` | Page component |
| `layout.tsx` | Layout wrapper |
| `loading.tsx` | Loading skeleton |
| `error.tsx` | Error boundary |
| `proxy.ts` | Middleware (renamed from middleware.ts in v16) |
| `route.ts` | API route handler |

## Component Rules

```typescript
// ✅ "use client" only when needed (hooks, events, browser APIs)
"use client";
import { useState } from "react";

// ✅ Server Components by default (no directive needed)
// No useState, no useEffect, direct async/await
export default async function FarmersPage() {
  const farmers = await getFarmers(); // direct server call
  return <div>...</div>;
}
```

## Async Params (Next.js 16 — MANDATORY)

```typescript
// ✅ CORRECT — params must be awaited in Next.js 15+/16
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ✅ CORRECT — route handlers
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ❌ WRONG — synchronous params (Next.js 14 style)
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id; // This will FAIL in Next.js 16
}
```

## Import Order

```typescript
// 1. React/Next.js
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 2. Third-party
import { useSession } from "next-auth/react";

// 3. Internal — actions
import { getFarmers } from "@/app/actions/farmers";

// 4. Internal — components
import { Toast } from "@/components/Toast";

// 5. Internal — lib/types
import { useSWRCache } from "@/lib/swr-cache";
import type { FarmerProfile } from "@/types";
```

## CSS / Styling Rules

- Use **Tailwind CSS** utility classes
- For long multi-line classNames → extract to `globals.css` as a named class
- Use `glass`, `glass-dark`, `glass-card` utility classes for cards
- Colors: Forest green = primary, Slate = neutral, Blue = trader category
- Never use inline `style` for layout — use Tailwind

```typescript
// ❌ Wrong — multi-line string in className breaks Turbopack
className="w-full px-4 py-3
  rounded-xl border"

// ✅ Correct — single line or extracted CSS class
className="w-full px-4 py-3 rounded-xl border"
// OR in globals.css:
// .my-input { @apply w-full px-4 py-3 rounded-xl border; }
```

## Prisma Usage

```typescript
// ✅ Always import from the singleton
import prisma from "@/lib/prisma";

// ✅ Always use select to limit data returned
const farmer = await prisma.farmer.findUnique({
  where: { id },
  select: { id: true, name: true, phone: true } // only what you need
});

// ✅ Use transactions for related operations
await prisma.$transaction([
  prisma.procurement.create({ data: procurementData }),
  prisma.farmer.update({ where: { id }, data: { updatedAt: new Date() } }),
]);
```

## Custom Rules (Added by Project Owner)

<!-- ✏️ PASTE YOUR OWN RULES BELOW THIS LINE -->


<!-- ✏️ END OF CUSTOM RULES -->
