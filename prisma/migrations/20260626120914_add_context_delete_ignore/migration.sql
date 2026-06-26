-- AlterTable
ALTER TABLE "ContextMemory" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ConversationSource" ADD COLUMN     "ignoredContextName" TEXT;

-- CreateIndex
CREATE INDEX "ContextMemory_deleted_idx" ON "ContextMemory"("deleted");

-- CreateIndex
CREATE INDEX "ConversationSource_ignoredContextName_idx" ON "ConversationSource"("ignoredContextName");
