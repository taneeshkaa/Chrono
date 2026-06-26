-- CreateEnum
CREATE TYPE "ConversationPlatform" AS ENUM ('CHATGPT', 'CLAUDE', 'GEMINI');

-- CreateEnum
CREATE TYPE "ContextStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ConversationSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ConversationPlatform" NOT NULL,
    "externalConversationId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "rawData" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "ContextStatus" NOT NULL DEFAULT 'ACTIVE',
    "completed" JSONB NOT NULL DEFAULT '[]',
    "lastCheckpoint" TEXT,
    "nextAction" TEXT,
    "estimatedTime" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastWorkedAt" TIMESTAMP(3),
    "summary" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationSource_userId_idx" ON "ConversationSource"("userId");

-- CreateIndex
CREATE INDEX "ConversationSource_source_idx" ON "ConversationSource"("source");

-- CreateIndex
CREATE INDEX "ConversationSource_processed_idx" ON "ConversationSource"("processed");

-- CreateIndex
CREATE INDEX "ContextMemory_userId_idx" ON "ContextMemory"("userId");

-- CreateIndex
CREATE INDEX "ContextMemory_status_idx" ON "ContextMemory"("status");

-- AddForeignKey
ALTER TABLE "ConversationSource" ADD CONSTRAINT "ConversationSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextMemory" ADD CONSTRAINT "ContextMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
