import { PrismaClient } from '@prisma/client';
import { ALL_MODULE_KEYS, ensureBaseModules } from '../src/constants/modules';

const prisma = new PrismaClient();

async function backfillPropertyModules(propertyId: string, code: string) {
  const desiredModules = ensureBaseModules(ALL_MODULE_KEYS);
  const existing = await prisma.propertyModule.findMany({
    where: { propertyId },
    select: { moduleKey: true },
  });

  const existingSet = new Set(existing.map((module) => module.moduleKey));
  const missing = desiredModules.filter((module) => !existingSet.has(module));

  if (missing.length > 0) {
    await prisma.propertyModule.createMany({
      data: missing.map((moduleKey) => ({ propertyId, moduleKey })),
      skipDuplicates: true,
    });
  }

  return { missing };
}

async function backfillAdminModules(propertyId: string) {
  const desiredModules = ensureBaseModules(ALL_MODULE_KEYS);

  const admins = await prisma.employee.findMany({
    where: { propertyId, isAdmin: true },
    select: {
      id: true,
      modules: { select: { moduleKey: true } },
    },
  });

  for (const admin of admins) {
    const existingSet = new Set(admin.modules.map((module) => module.moduleKey));
    const missing = desiredModules.filter((module) => !existingSet.has(module));
    if (missing.length === 0) continue;

    await prisma.employeeModule.createMany({
      data: missing.map((moduleKey) => ({
        employeeId: admin.id,
        moduleKey,
      })),
      skipDuplicates: true,
    });
  }

  return { adminCount: admins.length };
}

async function main() {
  const properties = await prisma.property.findMany({
    select: { id: true, code: true },
  });

  console.log(`Found ${properties.length} properties. Backfilling module access...`);

  for (const property of properties) {
    const { missing } = await backfillPropertyModules(property.id, property.code);
    const { adminCount } = await backfillAdminModules(property.id);
    console.log(
      `• Property ${property.code}: ensured ${ALL_MODULE_KEYS.length} modules (added ${missing.length}). Updated ${adminCount} admin accounts.`,
    );
  }

  console.log('Module backfill complete.');
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
