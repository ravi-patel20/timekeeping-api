import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const property = await prisma.property.upsert({
    where: { code: 'ABC123' },
    update: {},
    create: {
      code: 'ABC123',
      email: 'property@example.com',
      name: 'Sample Property',
    },
  });

  await prisma.employee.upsert({
    where: { propertyId_passcode: { propertyId: property.id, passcode: '1234' } },
    update: { name: 'John Doe' },
    create: {
      name: 'John Doe',
      passcode: '1234',
      propertyId: property.id,
    },
  });

  await prisma.employee.upsert({
    where: { propertyId_passcode: { propertyId: property.id, passcode: '5678' } },
    update: { name: 'Jane Smith' },
    create: {
      name: 'Jane Smith',
      passcode: '5678',
      propertyId: property.id,
    },
  });

  console.log('Seeded property and employees successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
