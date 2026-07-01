# 05 — Database & ORM Standards

## Your Custom Rules

<!-- ✏️ PASTE YOUR RULES HERE — these take highest priority -->


<!-- END OF YOUR CUSTOM RULES -->

---

## Universal Database Rules

### Use a Single Shared Client

- Never instantiate a new database client on every request — use a singleton
- Multiple instances cause connection pool exhaustion in production
- Import the shared client from a single dedicated file

### Limit Returned Data

- Never fetch all columns — always specify exactly what fields you need
- Never return sensitive fields (passwords, tokens, internal keys) from queries
- The database should return only what the application actually needs to display

```typescript
// ✅ Select only what you need
const user = await db.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true }
  // password, secretToken — never selected
});

// ❌ Never return everything blindly
const user = await db.user.findUnique({ where: { id } }); // includes sensitive fields
```

### Scope Queries by User / Role

- Never query for all records and filter in JavaScript — filter at the database level
- Always add `where` conditions that restrict data to what the current user can access
- Let the database enforce data boundaries, not the application layer

### Parameterized Queries Only

- Never interpolate user input directly into SQL strings
- Use your ORM's safe query builder methods
- If raw SQL is unavoidable, use the ORM's safe parameterization helper

```typescript
// ✅ Safe — ORM handles parameterization
db.findMany({ where: { name: userInput } });

// ❌ Dangerous — SQL injection risk
db.$queryRawUnsafe(`SELECT * FROM table WHERE name = '${userInput}'`);
```

### Use Transactions for Related Operations

- When multiple database writes must all succeed or all fail — use a transaction
- Never leave the database in a partial state due to an unhandled error mid-operation

### Handle Database Errors Explicitly

- Catch known error codes (duplicate key, not found, constraint violation)
- Return meaningful messages to the user — not raw database error messages
- Log the full error server-side for debugging

### Schema & Migrations

- Never edit the database directly in production — always use migrations
- Every schema change must have a corresponding migration file
- Test migrations on a copy of production data before applying
- Add indexes for columns that are frequently used in `WHERE` or `ORDER BY` clauses

### Environment Variables

- Database connection strings must never appear in client-side code
- Never log connection strings, even partially
- Use separate database users with minimum required permissions per environment (dev, staging, prod)
