/*
  Warnings:

  - You are about to drop the column `source` on the `Conversion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversion" DROP COLUMN "source";

-- CreateTable
CREATE TABLE "ManualLog" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "offerName" TEXT,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campaignId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManualLog" ADD CONSTRAINT "ManualLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
