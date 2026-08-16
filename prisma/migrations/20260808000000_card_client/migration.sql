-- Vincula card a um cliente
ALTER TABLE "BoardCard" ADD COLUMN "clientId" TEXT;
CREATE INDEX "BoardCard_clientId_idx" ON "BoardCard"("clientId");
ALTER TABLE "BoardCard" ADD CONSTRAINT "BoardCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cadastra a ROI como cliente (idempotente)
INSERT INTO "Client" (id, name, slug, active, "hasDesigner", brand, "createdAt")
SELECT 'client_roi_internal', 'ROI', 'roi-interno', true, false, 'roi', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Client" WHERE name = 'ROI' OR slug = 'roi-interno');
