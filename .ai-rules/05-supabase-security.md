# 05 — Database & Prisma Security

> **Note:** This project currently uses **PostgreSQL via Prisma** (not Supabase directly).
> This file covers Prisma security patterns. If Supabase is added later, update this file.

## Prisma Security Rules

### Always Use the Singleton Client

```typescript
// ✅ Always import from the shared singleton
import prisma from "@/lib/prisma";

// ❌ Never instantiate a new client
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient(); // causes connection pool exhaustion
```

### Always Use `select` to Limit Returned Data

```typescript
// ✅ Only return what is needed
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    active: true,
    // password: false  ← never include this
  }
});

// ❌ Never return everything
const user = await prisma.user.findUnique({ where: { email } }); // includes password!
```

### Data Scoping by Role

Always add `where` clauses based on the user's role:

```typescript
const session = await auth();
const userId = session.user.id;
const role = (session.user as any).role;

// L1_AGENT — only their own records
const records = await prisma.procurement.findMany({
  where: role === "L4_ADMIN" ? {} : { agentId: userId }
});

// L2_APPROVAL — only records pending their review
const pendingL2 = await prisma.procurement.findMany({
  where: { status: "PENDING_L2" }
});
```

### Safe Raw Queries (if ever needed)

```typescript
// ✅ Use Prisma.sql for safe parameterized raw queries
import { Prisma } from "@prisma/client";

const result = await prisma.$queryRaw(
  Prisma.sql`SELECT * FROM farmers WHERE district = ${district}`
);

// ❌ NEVER string interpolate into raw queries
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM farmers WHERE district = '${district}'` // SQL INJECTION!
);
```

### Transactions for Related Operations

```typescript
// ✅ Use transactions when multiple operations must succeed together
const [procurement, _] = await prisma.$transaction([
  prisma.procurement.create({ data: procurementData }),
  prisma.procurementLog.create({ data: { action: "CREATED", userId } }),
]);
```

### Handling Prisma Errors

```typescript
import { Prisma } from "@prisma/client";

try {
  await prisma.user.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      // Unique constraint violation
      return { error: "Email already exists" };
    }
  }
  throw error; // re-throw unknown errors
}
```

## Environment Variables

```
DATABASE_URL        → PostgreSQL connection string (never expose to client)
NEXTAUTH_SECRET     → next-auth JWT signing secret (never expose to client)
NEXTAUTH_URL        → App URL
```

Rules:
- Variables without `NEXT_PUBLIC_` prefix → **server only** ✅
- Variables with `NEXT_PUBLIC_` → **visible to browser** (never put secrets here)
- Never log `process.env.DATABASE_URL` or `process.env.NEXTAUTH_SECRET`

## Prisma Schema Rules

When modifying `prisma/schema.prisma`:
1. Always run `npx prisma generate` after changes
2. Always create a migration: `npx prisma migrate dev --name description`
3. Never edit the database directly — always use migrations
4. Always add appropriate indexes for query performance
5. Use `@db.Text` for long strings, `String` for short ones

## Custom Rules (Added by Project Owner)

<!-- ✏️ PASTE YOUR OWN RULES BELOW THIS LINE -->


<!-- ✏️ END OF CUSTOM RULES -->
