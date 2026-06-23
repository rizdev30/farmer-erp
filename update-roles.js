const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const adminUpdate = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { role: 'L4_ADMIN' }
  })
  console.log(`Updated ${adminUpdate.count} ADMIN users to L4_ADMIN`)

  const agentUpdate = await prisma.user.updateMany({
    where: { role: 'AGENT' },
    data: { role: 'L1_AGENT' }
  })
  console.log(`Updated ${agentUpdate.count} AGENT users to L1_AGENT`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
