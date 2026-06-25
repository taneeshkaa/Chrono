-- AlterTable
ALTER TABLE "Commitment" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "calendarSynced" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT;

-- CreateIndex
CREATE INDEX "Commitment_userId_idx" ON "Commitment"("userId");

-- CreateIndex
CREATE INDEX "Commitment_status_idx" ON "Commitment"("status");

-- CreateIndex
CREATE INDEX "Commitment_deadline_idx" ON "Commitment"("deadline");

-- CreateIndex
CREATE INDEX "Commitment_riskScore_idx" ON "Commitment"("riskScore");
