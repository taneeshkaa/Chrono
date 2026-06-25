/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `Connection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Connection_provider_providerAccountId_key" ON "Connection"("provider", "providerAccountId");
