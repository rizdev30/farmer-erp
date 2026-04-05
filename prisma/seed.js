/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@farmererp.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@farmererp.com",
      password: hashedPassword,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create a sample agent
  const agentPassword = await bcrypt.hash("agent123", 12);
  const agent = await prisma.user.upsert({
    where: { email: "agent@farmererp.com" },
    update: {},
    create: {
      name: "Field Agent 1",
      email: "agent@farmererp.com",
      password: agentPassword,
      role: "AGENT",
      active: true,
    },
  });

  console.log("✅ Agent user created:", agent.email);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
