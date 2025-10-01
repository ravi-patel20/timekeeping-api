import { PrismaClient } from '@prisma/client';
import { hashPasscode } from '../src/common/passcode.util';

const prisma = new PrismaClient();

async function main() {
  const property = await prisma.property.upsert({
    where: { code: 'ABC123' },
    update: {
      email: 'property@example.com',
      billingEmail: 'billing@property.example.com',
      phone: '+1-415-555-0100',
      name: 'Sample Hotel',
      addressLine1: '123 Market Street',
      addressLine2: 'Suite 400',
      city: 'San Francisco',
      stateProvince: 'CA',
      postalCode: '94105',
      country: 'USA',
      timezone: 'America/Los_Angeles',
      propertyType: 'HOTEL',
      logoUrl: 'https://example.com/assets/sample-hotel-logo.png',
      notes: 'Front desk is on the second floor. Call ahead for after-hours access.',
      isActive: true,
      primaryContactEmployeeId: null,
    },
    create: {
      code: 'ABC123',
      email: 'property@example.com',
      billingEmail: 'billing@property.example.com',
      phone: '+1-415-555-0100',
      name: 'Sample Hotel',
      addressLine1: '123 Market Street',
      addressLine2: 'Suite 400',
      city: 'San Francisco',
      stateProvince: 'CA',
      postalCode: '94105',
      country: 'USA',
      timezone: 'America/Los_Angeles',
      propertyType: 'HOTEL',
      logoUrl: 'https://example.com/assets/sample-hotel-logo.png',
      notes: 'Front desk is on the second floor. Call ahead for after-hours access.',
      isActive: true,
    },
  });

  await prisma.employee.deleteMany({ where: { propertyId: property.id } });

  const alice = await prisma.employee.create({
    data: {
      propertyId: property.id,
      firstName: 'Alice',
      lastName: 'Manager',
      passcodeHash: hashPasscode('1234'),
      isAdmin: true,
      payType: 'hourly',
      status: 'active',
      email: 'alice.manager@property.example.com',
      phone: '+1-415-555-0110',
    },
  });

  await prisma.employee.create({
    data: {
      propertyId: property.id,
      firstName: 'Bob',
      lastName: 'Worker',
      passcodeHash: hashPasscode('5678'),
      isAdmin: false,
      payType: 'hourly',
      status: 'active',
      email: 'bob.worker@property.example.com',
      phone: '+1-415-555-0120',
    },
  });

  await prisma.property.update({
    where: { id: property.id },
    data: { primaryContactEmployeeId: alice.id },
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
