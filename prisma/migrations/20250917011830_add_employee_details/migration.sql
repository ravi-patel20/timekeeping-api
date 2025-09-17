-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "email" TEXT,
ADD COLUMN     "payType" TEXT NOT NULL DEFAULT 'hourly',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
