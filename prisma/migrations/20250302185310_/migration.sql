/*
  Warnings:

  - The values [SEND_OTP] on the enum `JobSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `membership` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `pendingPocUnlockRequests` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `pendingRequests` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `UnlockedTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `unlockByUserId` on the `UnlockedTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `unlockType` on the `UnlockedTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[accountId,eventId,interestedUserId,interest,sourceModule,sourceId]` on the table `UserEventInterest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currentSubscriptionId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Made the column `accountId` on table `Comment` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `sourceId` to the `RequestedJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceId` to the `UnlockedTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target` to the `UnlockedTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UnlockedTransaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `source` on the `UnlockedTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserSource" AS ENUM ('SELF', 'PROMOTE_EVENT', 'PROMOTE_EVENT_INVITE', 'ACCESS_INVITE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'ESSENTIAL', 'SCALE', 'ADVANCE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PARENT', 'CHILD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttachmentSourceModule" ADD VALUE 'PROMOTED_EVENT';
ALTER TYPE "AttachmentSourceModule" ADD VALUE 'PROMOTED_EVENT_WIDGET_KIT';
ALTER TYPE "AttachmentSourceModule" ADD VALUE 'PROMOTED_EVENT_SPEAKER';
ALTER TYPE "AttachmentSourceModule" ADD VALUE 'PROMOTED_EVENT_EXHIBITOR';
ALTER TYPE "AttachmentSourceModule" ADD VALUE 'OTHERS';

-- AlterEnum
ALTER TYPE "CommentSourceModule" ADD VALUE 'EVENT_DETAIL_PAGE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterestSourceModule" ADD VALUE 'PROMOTED_EVENT_WIDGET';
ALTER TYPE "InterestSourceModule" ADD VALUE 'PROMOTED_EVENT_SPEAKER';
ALTER TYPE "InterestSourceModule" ADD VALUE 'PROMOTED_EVENT_EXHIBITOR';

-- AlterEnum
BEGIN;
CREATE TYPE "JobSource_new" AS ENUM ('SEND_SIGNIN_OTP', 'SEND_SIGNUP_OTP', 'SEND_ACCESS', 'EVENT_CANCEl', 'SEND_INVITE', 'SEND_INTEND_CREATE', 'SEND_INTEND_UPDATE');
ALTER TABLE "RequestedJob" ALTER COLUMN "source" TYPE "JobSource_new" USING ("source"::text::"JobSource_new");
ALTER TYPE "JobSource" RENAME TO "JobSource_old";
ALTER TYPE "JobSource_new" RENAME TO "JobSource";
DROP TYPE "JobSource_old";
COMMIT;

-- AlterEnum
ALTER TYPE "TrackerType" ADD VALUE 'T_CUSTOMER_ICP';

-- AlterEnum
ALTER TYPE "UnlockType" ADD VALUE 'COMPANY';

-- DropForeignKey
ALTER TABLE "ApiLogs" DROP CONSTRAINT "ApiLogs_userId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_accountId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropIndex
DROP INDEX "UserEventInterest_accountId_eventId_interestedUserId_intere_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "membership",
DROP COLUMN "pendingPocUnlockRequests",
DROP COLUMN "pendingRequests",
ADD COLUMN     "currentSubscriptionId" UUID NOT NULL,
ADD COLUMN     "domain" TEXT;

-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'PARENT';

-- AlterTable
ALTER TABLE "RequestedJob" ADD COLUMN     "processId" INTEGER,
ADD COLUMN     "sourceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SavedLocation" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UnlockedTransaction" DROP COLUMN "eventId",
DROP COLUMN "unlockByUserId",
DROP COLUMN "unlockType",
ADD COLUMN     "sourceId" TEXT NOT NULL,
ADD COLUMN     "target" "UnlockType" NOT NULL,
ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "source",
ADD COLUMN     "source" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyId",
ADD COLUMN     "primaryCompanyId" UUID,
ADD COLUMN     "source" "UserSource" NOT NULL DEFAULT 'SELF';

-- DropEnum
DROP TYPE "UnlockSource";

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "planStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planEndDate" TIMESTAMP(3) NOT NULL,
    "purchaseValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "pendingRequests" INTEGER NOT NULL DEFAULT 200,
    "pendingPocUnlockRequests" INTEGER NOT NULL DEFAULT 4400,
    "pendingCompanySearchRequests" INTEGER NOT NULL DEFAULT 20,
    "pendingProspectPocUnlockRequests" INTEGER NOT NULL DEFAULT 200,
    "accountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEventInterest_accountId_eventId_interestedUserId_intere_key" ON "UserEventInterest"("accountId", "eventId", "interestedUserId", "interest", "sourceModule", "sourceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryCompanyId_fkey" FOREIGN KEY ("primaryCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLogs" ADD CONSTRAINT "ApiLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
