-- CreateTable
CREATE TABLE "public"."AdminSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "public"."AdminSession"("token");
