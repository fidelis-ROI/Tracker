-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN "fullName" TEXT;
ALTER TABLE "Collaborator" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "Collaborator" ADD COLUMN "cpf" TEXT;
ALTER TABLE "Collaborator" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "Collaborator" ADD COLUMN "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "ClientLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientLink_clientId_idx" ON "ClientLink"("clientId");

-- AddForeignKey
ALTER TABLE "ClientLink" ADD CONSTRAINT "ClientLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
