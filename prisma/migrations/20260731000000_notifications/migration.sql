CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "cardId" TEXT,
    "boardId" TEXT,
    "cardCode" TEXT,
    "cardTitle" TEXT,
    "context" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BoardCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
