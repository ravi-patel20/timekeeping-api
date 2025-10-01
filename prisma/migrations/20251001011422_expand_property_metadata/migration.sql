-- CreateEnum
CREATE TYPE "public"."PropertyType" AS ENUM ('HOTEL', 'RESORT', 'RESTAURANT', 'BAR', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "primaryContactEmployeeId" TEXT,
ADD COLUMN     "propertyType" "public"."PropertyType",
ADD COLUMN     "stateProvince" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateIndex
CREATE INDEX "Property_primaryContactEmployeeId_idx" ON "public"."Property"("primaryContactEmployeeId");

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_primaryContactEmployeeId_fkey" FOREIGN KEY ("primaryContactEmployeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
