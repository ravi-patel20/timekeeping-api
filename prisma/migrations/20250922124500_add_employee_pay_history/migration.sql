-- This migration was previously generated and applied.
-- Reinstated to keep Prisma migration history in sync.

-- AlterTable
ALTER TABLE "public"."Employee"
    ADD COLUMN     "payAmountCents" INTEGER;

-- CreateTable
CREATE TABLE "public"."EmployeePayHistory" (
    "id"           TEXT        NOT NULL,
    "employeeId"   TEXT        NOT NULL,
    "amountCents"  INTEGER,
    "effectiveAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "EmployeePayHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."EmployeePayHistory"
    ADD CONSTRAINT "EmployeePayHistory_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "EmployeePayHistory_employeeId_effectiveAt_idx"
    ON "public"."EmployeePayHistory" ("employeeId", "effectiveAt");
