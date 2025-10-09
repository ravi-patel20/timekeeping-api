-- Create table for property-level module availability
CREATE TABLE "PropertyModule" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyModule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PropertyModule_propertyId_fkey" FOREIGN KEY ("propertyId")
        REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PropertyModule_propertyId_moduleKey_key"
    ON "PropertyModule"("propertyId", "moduleKey");

-- Create table for employee-specific module assignments
CREATE TABLE "EmployeeModule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeModule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmployeeModule_employeeId_fkey" FOREIGN KEY ("employeeId")
        REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmployeeModule_employeeId_moduleKey_key"
    ON "EmployeeModule"("employeeId", "moduleKey");
