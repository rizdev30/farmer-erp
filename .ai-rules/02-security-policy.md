# 02 — Security Policy

## Golden Rule

**Assume ALL input is malicious until validated.**

This includes:
- Form fields
- URL params (`searchParams`, `params`)
- API request bodies
- Query strings
- Uploaded files
- Webhook payloads
- Cookie values

## Authentication (next-auth v5)

Every Server Action and API Route MUST check auth:

```typescript
// ✅ Required in every Server Action
import { auth } from "@/auth";

export async function myAction(data: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  // proceed...
}

// ✅ Required in every API Route
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // proceed...
}
```

## Authorization — RBAC Roles

The 4-level hierarchy:

| Role | Level | Can Do |
|------|-------|--------|
| `L1_AGENT` | Field Agent | Register farmers, create procurement |
| `L2_APPROVAL` | Approver | Approve/reject procurement (set rate & deduction) |
| `L3_PO_MAKER` | PO Maker | Final approval, generate official receipts |
| `L4_ADMIN` | Admin | Everything + manage agents |

Always enforce role checks:

```typescript
const role = (session.user as { role?: string })?.role;

// Check role
if (role !== "L4_ADMIN") {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// Check minimum level
const allowedRoles = ["L2_APPROVAL", "L3_PO_MAKER", "L4_ADMIN"];
if (!allowedRoles.includes(role)) {
  throw new Error("Forbidden");
}
```

## Data Scoping

Each role must ONLY see their own data:
- `L1_AGENT`: Only their own procurement records
- `L2_APPROVAL`: Records pending L2 approval
- `L3_PO_MAKER`: Records pending L3 approval
- `L4_ADMIN`: All records

Always scope Prisma queries:

```typescript
// ✅ Correct - scoped query
const records = await prisma.procurement.findMany({
  where: {
    agentId: session.user.id, // L1 can only see their own
  },
});
```

## Input Validation

Validate ALL inputs before database operations:

```typescript
// ✅ Use type checks and sanitize
if (!data.farmerName || typeof data.farmerName !== "string") {
  throw new Error("Invalid farmer name");
}
if (data.phone && !/^\d{10}$/.test(data.phone)) {
  throw new Error("Invalid phone number");
}
```

## Sensitive Data Rules

- Never return `password` from Prisma queries — always use `select` to exclude it
- Never log passwords, tokens, or session data
- Never expose internal IDs in URLs when not necessary
- Never put secrets in client components or `"use client"` files

```typescript
// ✅ Correct - exclude password
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, name: true, email: true, role: true, active: true }
  // password NOT included
});
```

## SQL Injection

Prisma parameterizes queries automatically — never use raw SQL with user input.

```typescript
// ✅ Safe - Prisma parameterized
await prisma.farmer.findMany({ where: { name: userInput } });

// ❌ Dangerous - never do this
await prisma.$queryRaw`SELECT * FROM farmers WHERE name = '${userInput}'`;

// ✅ If raw SQL needed, use Prisma.sql
await prisma.$queryRaw(Prisma.sql`SELECT * FROM farmers WHERE name = ${userInput}`);
```

## Custom Rules (Added by Project Owner)

<!-- ✏️ PASTE YOUR OWN RULES BELOW THIS LINE -->


<!-- ✏️ END OF CUSTOM RULES -->
