import { PrismaClient, PropertyType } from '@prisma/client';
import { hashPasscode } from '../src/common/passcode.util';
import { ALL_MODULE_KEYS, ensureBaseModules } from '../src/constants/modules';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

type PromptOptions = {
  defaultValue?: string;
  required?: boolean;
  validate?: (value: string) => string | null;
};

const prisma = new PrismaClient();
const rl = createInterface({ input, output });

const propertyTypeOptions = Object.values(PropertyType);

async function prompt(question: string, options: PromptOptions = {}): Promise<string> {
  const { defaultValue, required, validate } = options;
  const promptLabel = defaultValue
    ? `${question} [${defaultValue}]: `
    : `${question}: `;

  while (true) {
    const answer = await rl.question(promptLabel);
    const value = answer.trim() === '' ? (defaultValue ?? '') : answer.trim();

    if (required && value.trim() === '') {
      console.log('  › A value is required. Please try again.');
      continue;
    }

    if (validate) {
      const validationMessage = validate(value);
      if (validationMessage) {
        console.log(`  › ${validationMessage}`);
        continue;
      }
    }

    return value;
  }
}

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

async function main() {
  console.log('🏨 Property onboarding');
  console.log('Provide the requested details to seed the database. Leave optional fields blank if unknown.');
  console.log('');

  const code = await prompt('Property code', {
    required: true,
    validate: (value) =>
      /\s/.test(value)
        ? 'Property code cannot contain whitespace.'
        : null,
  });

  const existing = await prisma.property.findUnique({ where: { code } });
  if (existing) {
    console.log(`A property with code "${code}" already exists (id: ${existing.id}). Aborting.`);
    return;
  }

  const name = await prompt('Property name', { required: true });
  const email = await prompt('Property email', {
    required: true,
    validate: (value) =>
      /.+@.+/.test(value) ? null : 'Enter a valid email address.',
  });
  const billingEmail = await prompt('Billing email (optional)', {
    validate: (value) => (value && !/.+@.+/.test(value) ? 'Enter a valid email address or leave blank.' : null),
  });
  const phone = await prompt('Main phone (optional)');
  const addressLine1 = await prompt('Address line 1', { required: true });
  const addressLine2 = await prompt('Address line 2 (optional)');
  const city = await prompt('City', { required: true });
  const stateProvince = await prompt('State / Province', { required: true });
  const postalCode = await prompt('Postal code', { required: true });
  const country = await prompt('Country', { required: true });
  const timezone = await prompt('Timezone (IANA identifier)', {
    defaultValue: 'UTC',
    required: true,
  });

  const propertyTypeInput = await prompt(
    `Property type (${propertyTypeOptions.join('/')})`,
    {
      defaultValue: 'HOTEL',
      validate: (value) => {
        const upper = value.trim().toUpperCase();
        return upper === '' || propertyTypeOptions.includes(upper as PropertyType)
          ? null
          : `Choose one of: ${propertyTypeOptions.join(', ')}`;
      },
    },
  );
  const propertyType = propertyTypeInput.trim() === ''
    ? null
    : (propertyTypeInput.trim().toUpperCase() as PropertyType);

  console.log('');
  console.log('👤 Admin contact details');

  const adminFirstName = await prompt('Admin first name', { required: true });
  const adminLastName = await prompt('Admin last name', { required: true });
  const adminEmail = await prompt('Admin email', {
    required: true,
    validate: (value) =>
      /.+@.+/.test(value) ? null : 'Enter a valid email address.',
  });
  const adminPhone = await prompt('Admin phone (optional)');
  const passcode = await prompt('Admin kiosk passcode (4 digits recommended)', {
    required: true,
    validate: (value) =>
      value.length < 4 ? 'Passcode should be at least 4 characters.' : null,
  });

  console.log('');
  console.log('📦 Workspace modules');
  console.log('Available modules:');
  ALL_MODULE_KEYS.forEach((moduleKey, index) => {
    console.log(`  ${index + 1}. ${moduleKey}`);
  });

  const moduleSelectionRaw = await prompt(
    'Select modules to enable (comma-separated numbers, blank for all)',
  );

  const selectedModuleKeys = (() => {
    const trimmed = moduleSelectionRaw.trim();
    if (!trimmed) {
      return ensureBaseModules(ALL_MODULE_KEYS);
    }
    const parts = trimmed.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return ensureBaseModules(ALL_MODULE_KEYS);
    }

    const resolved = new Set<string>();
    for (const part of parts) {
      const parsed = Number(part);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > ALL_MODULE_KEYS.length) {
        console.log(`  › "${part}" is not a valid option. Defaulting to all modules.`);
        return ensureBaseModules(ALL_MODULE_KEYS);
      }
      resolved.add(ALL_MODULE_KEYS[parsed - 1]);
    }

    return ensureBaseModules(Array.from(resolved));
  })();

  const property = await prisma.property.create({
    data: {
      code,
      name,
      email,
      billingEmail: toNullable(billingEmail),
      phone: toNullable(phone),
      addressLine1,
      addressLine2: toNullable(addressLine2),
      city,
      stateProvince,
      postalCode,
      country,
      timezone,
      propertyType,
      isActive: true,
      notes: null,
    },
  });

  if (selectedModuleKeys.length > 0) {
    await prisma.propertyModule.createMany({
      data: selectedModuleKeys.map((moduleKey) => ({
        propertyId: property.id,
        moduleKey,
      })),
      skipDuplicates: true,
    });
  }

  const admin = await prisma.employee.create({
    data: {
      propertyId: property.id,
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      phone: toNullable(adminPhone),
      passcodeHash: hashPasscode(passcode),
      isAdmin: true,
      payType: 'hourly',
      status: 'active',
    },
  });

  await prisma.property.update({
    where: { id: property.id },
    data: { primaryContactEmployeeId: admin.id },
  });

  if (selectedModuleKeys.length > 0) {
    await prisma.employeeModule.createMany({
      data: selectedModuleKeys.map((moduleKey) => ({
        employeeId: admin.id,
        moduleKey,
      })),
      skipDuplicates: true,
    });
  }

  console.log('');
  console.log('✅ Onboarding complete.');
  console.log(`   Property: ${property.name} (code ${property.code})`);
  console.log(`   Admin: ${admin.firstName} ${admin.lastName} <${admin.email}>`);
  console.log(`   Modules enabled: ${selectedModuleKeys.join(', ')}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('Onboarding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
