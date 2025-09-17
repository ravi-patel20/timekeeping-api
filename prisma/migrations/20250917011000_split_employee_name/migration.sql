-- 2025-09-17 01:10:00 UTC
-- AlterTable
ALTER TABLE "Employee"
  ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';

-- Data migration: derive first/last name from existing "name" column
UPDATE "Employee"
SET "firstName" = CASE
      WHEN "name" IS NULL OR trim("name") = '' THEN 'Employee'
      ELSE split_part(trim("name"), ' ', 1)
    END,
    "lastName" = CASE
      WHEN "name" IS NULL OR trim("name") = '' THEN ''
      ELSE trim(regexp_replace(trim("name"), '^\S+\s*', ''))
    END;

-- Remove temporary defaults now that rows are populated
ALTER TABLE "Employee"
  ALTER COLUMN "firstName" DROP DEFAULT,
  ALTER COLUMN "lastName" DROP DEFAULT;

-- Drop legacy "name" column
ALTER TABLE "Employee" DROP COLUMN "name";
