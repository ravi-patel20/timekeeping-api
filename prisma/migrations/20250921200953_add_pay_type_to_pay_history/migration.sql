-- DropForeignKey
ALTER TABLE "public"."EmployeePayHistory" DROP CONSTRAINT "EmployeePayHistory_employeeId_fkey";

-- AlterTable
ALTER TABLE "public"."EmployeePayHistory" ADD COLUMN "payType" TEXT;

-- Backfill existing pay history with the employee's current pay type
UPDATE "public"."EmployeePayHistory" eph
SET "payType" = e."payType"
FROM "public"."Employee" e
WHERE eph."employeeId" = e."id" AND eph."payType" IS NULL;

-- AddForeignKey (restore original cascading behavior)
ALTER TABLE "public"."EmployeePayHistory"
  ADD CONSTRAINT "EmployeePayHistory_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
