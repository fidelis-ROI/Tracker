-- AlterTable
ALTER TABLE "Client" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN "deletedAt" TIMESTAMP(3);
