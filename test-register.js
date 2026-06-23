const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const agent = await prisma.user.findFirst({ where: { role: 'L1_AGENT' } })
  if (!agent) throw new Error("No agent found")

  const farmer = await prisma.farmer.create({
    data: {
      name: "Test Farmer",
      phone: "1234567890",
      address: "123 Test St",
      town: "Test Town",
      district: "Test District",
      block: "Test Block",
      fatherName: "Test Father",
      farmerCode: "TEST-" + Date.now(),
      village: "Test Village",
      gender: "M",
      pinCode: "123456",
      projectName: "",
      category: "FARMER",
      registeredBy: agent.id,
      registeredByName: agent.name,
      assignedL3Id: "",
      createdByAdmin: false,
    },
  });
  console.log("Success:", farmer)
}

main().catch(console.error).finally(() => prisma.$disconnect())
