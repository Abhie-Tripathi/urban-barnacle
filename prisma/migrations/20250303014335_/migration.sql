/*
  Warnings:

  - You are about to drop the column `eventData` on the `Enquiry` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "unique_saved_location_constraint";

-- DropIndex
DROP INDEX "UserEventInterest_accountId_eventId_interestedUserId_intere_key";

-- AlterTable
ALTER TABLE "Enquiry" DROP COLUMN "eventData";
