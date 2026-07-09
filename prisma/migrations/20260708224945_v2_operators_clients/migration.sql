-- AlterTable
ALTER TABLE "Client" ADD COLUMN "contractDate" DATETIME;
ALTER TABLE "Client" ADD COLUMN "services" TEXT;
ALTER TABLE "Client" ADD COLUMN "ticket" REAL;

-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN "hireDate" DATETIME;
ALTER TABLE "Collaborator" ADD COLUMN "salary" REAL;
ALTER TABLE "Collaborator" ADD COLUMN "variable" REAL;

-- CreateTable
CREATE TABLE "ClientOperator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientOperator_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientOperator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "collaboratorId" TEXT,
    CONSTRAINT "AdminUser_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdminUser" ("email", "id", "password") SELECT "email", "id", "password" FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX "AdminUser_collaboratorId_key" ON "AdminUser"("collaboratorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClientOperator_clientId_collaboratorId_key" ON "ClientOperator"("clientId", "collaboratorId");
