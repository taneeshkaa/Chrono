-- CreateTable
CREATE TABLE "RoadmapCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapCache_userId_key" ON "RoadmapCache"("userId");

-- CreateIndex
CREATE INDEX "RoadmapCache_userId_idx" ON "RoadmapCache"("userId");

-- AddForeignKey
ALTER TABLE "RoadmapCache" ADD CONSTRAINT "RoadmapCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
