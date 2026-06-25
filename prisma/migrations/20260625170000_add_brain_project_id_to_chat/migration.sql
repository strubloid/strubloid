-- AlterTable: random chats can optionally query a specific project brain.
ALTER TABLE "Chat" ADD COLUMN "brainProjectId" TEXT;
