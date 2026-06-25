-- AlterTable
ALTER TABLE "Project" ADD COLUMN "aiPatterns" TEXT;
ALTER TABLE "Project" ADD COLUMN "localPath" TEXT;
ALTER TABLE "Project" ADD COLUMN "skills" TEXT;

-- CreateTable
CREATE TABLE "AiModel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/v1/chat/completions',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "modelSource" TEXT NOT NULL DEFAULT 'zen',
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "inputPrice" REAL,
    "outputPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "projectId" TEXT,
    "isRandom" BOOLEAN NOT NULL DEFAULT false,
    "useAiBrain" BOOLEAN NOT NULL DEFAULT false,
    "useRandomChats" BOOLEAN NOT NULL DEFAULT false,
    "brainProjectId" TEXT,
    "selectedModelId" TEXT DEFAULT 'big-pickle',
    "compactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Chat_selectedModelId_fkey" FOREIGN KEY ("selectedModelId") REFERENCES "AiModel" ("modelId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Chat" ("brainProjectId", "compactedAt", "createdAt", "id", "isRandom", "projectId", "title", "updatedAt", "useAiBrain") SELECT "brainProjectId", "compactedAt", "createdAt", "id", "isRandom", "projectId", "title", "updatedAt", "useAiBrain" FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE INDEX "Chat_projectId_idx" ON "Chat"("projectId");
CREATE INDEX "Chat_isRandom_createdAt_idx" ON "Chat"("isRandom", "createdAt");
CREATE INDEX "Chat_compactedAt_idx" ON "Chat"("compactedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_modelId_key" ON "AiModel"("modelId");

-- CreateIndex
CREATE INDEX "AiModel_isEnabled_idx" ON "AiModel"("isEnabled");

-- CreateIndex
CREATE INDEX "AiModel_modelId_idx" ON "AiModel"("modelId");

-- CreateIndex
CREATE INDEX "AiModel_modelSource_idx" ON "AiModel"("modelSource");

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- CreateIndex
CREATE INDEX "Config_key_idx" ON "Config"("key");
