import { defineConfig } from '@prisma/config';

export default defineConfig({
  // Explicit schema path (optional; defaults to ./prisma/schema.prisma if present)
  schema: './prisma/schema.prisma',
  migrations: {
    // Command Prisma runs for `prisma db seed` and after `migrate` flows
    seed: 'ts-node prisma/seed.ts',
  },
});

