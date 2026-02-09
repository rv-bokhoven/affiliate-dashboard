/*
  Warnings:

  - You are about to drop the column `source` on the `ManualLog` table. All the data in the column will be lost.
  - Added the required column `externalCampaign` to the `ManualLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform` to the `ManualLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ManualLog" DROP COLUMN "source",
ADD COLUMN     "externalCampaign" TEXT NOT NULL,
ADD COLUMN     "platform" TEXT NOT NULL;
