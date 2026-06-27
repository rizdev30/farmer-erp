import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sampleMandis = [
    { state: 'Madhya Pradesh', district: 'Indore', mandiName: 'Chhawani Anaj Mandi' },
    { state: 'Madhya Pradesh', district: 'Indore', mandiName: 'Laxmibai Nagar Mandi' },
    { state: 'Madhya Pradesh', district: 'Ujjain', mandiName: 'Ujjain Krishi Upaj Mandi' },
    { state: 'Maharashtra', district: 'Pune', mandiName: 'APMC Pune' },
    { state: 'Maharashtra', district: 'Nashik', mandiName: 'Lasalgaon Onion Mandi' },
  ];

  for (const mandi of sampleMandis) {
    await prisma.mandi.upsert({
      where: {
        state_district_mandiName: {
          state: mandi.state,
          district: mandi.district,
          mandiName: mandi.mandiName,
        }
      },
      update: {},
      create: mandi,
    });
  }

  console.log('Seeded sample mandis.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
