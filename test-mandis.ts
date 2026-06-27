import prisma from "./src/lib/prisma";
async function main() {
  const mandis = await prisma.mandi.findMany();
  console.log(`Found ${mandis.length} mandis in DB.`);
  if (mandis.length > 0) {
    console.log("Sample:", mandis.slice(0, 5));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
