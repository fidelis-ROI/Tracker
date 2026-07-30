-- AlterTable
ALTER TABLE "BoardCard" ADD COLUMN "priority" TEXT;

-- CreateTable
CREATE TABLE "ClientObservation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientObservation_clientId_collaboratorId_key" ON "ClientObservation"("clientId", "collaboratorId");

-- AddForeignKey
ALTER TABLE "ClientObservation" ADD CONSTRAINT "ClientObservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientObservation" ADD CONSTRAINT "ClientObservation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
