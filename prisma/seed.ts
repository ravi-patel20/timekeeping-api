import { PrismaClient } from '@prisma/client';
import { hashPasscode } from '../src/common/passcode.util';

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

  await prisma.employee.deleteMany({ where: { propertyId: property.id } });

  await prisma.employee.createMany({
    data: [
      {
        propertyId: property.id,
        firstName: 'Alice',
        lastName: 'Manager',
        passcodeHash: hashPasscode('1234'),
        isAdmin: true,
        payType: 'hourly',
        status: 'active',
      },
      {
        propertyId: property.id,
        firstName: 'Bob',
        lastName: 'Worker',
        passcodeHash: hashPasscode('5678'),
        isAdmin: false,
        payType: 'hourly',
        status: 'active',
      },
    ],
  });

  console.log('Seeded property and employees successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
