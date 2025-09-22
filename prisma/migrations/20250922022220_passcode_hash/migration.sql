-- DropForeignKey
ALTER TABLE "public"."EmployeePayHistory" DROP CONSTRAINT "EmployeePayHistory_employeeId_fkey";

-- DropIndex
DROP INDEX "public"."Employee_propertyId_passcode_key";

-- AlterTable
ALTER TABLE "public"."EmployeePayHistory" ALTER COLUMN "effectiveAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Employee_propertyId_idx" ON "public"."Employee"("propertyId");

-- AddForeignKey
ALTER TABLE "public"."EmployeePayHistory" ADD CONSTRAINT "EmployeePayHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
