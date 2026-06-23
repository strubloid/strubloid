-- AlterTable: Add projectId to MemoryEntry for project-scoped brain retrieval
ALTER TABLE "MemoryEntry" ADD COLUMN "projectId" TEXT;

-- CreateIndex for project-scoped queries
CREATE INDEX IF NOT EXISTS "MemoryEntry_projectId_updatedAt_idx" ON "MemoryEntry"("projectId", "updatedAt");
