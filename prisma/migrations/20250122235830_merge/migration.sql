/*
  Warnings:

  - The values [READ,WRITE] on the enum `AccessType` will be removed. If these variants are still used in the database, this will fail.
  - The values [APPROVED] on the enum `EnquiryStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `constraints` on the `Configuration` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Configuration` table. All the data in the column will be lost.
  - You are about to drop the column `atachmentId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `exportStatus` on the `Export` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `filterValue` on the `Tracker` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdBy` on the `UserEventInterest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Verification` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the `AccountConfiguration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserConfiguration` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[configurationId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[targetModule,targetId,userId,intentType,accountId]` on the table `Intent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `configurationId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Made the column `updateAt` on table `Brand` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `config` to the `Configuration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventData` to the `Enquiry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filterValues` to the `Tracker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modifiedBy` to the `UserEventInterest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Widget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templatePublicId` to the `Widget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Widget` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('Page', 'Section', 'StickyTop', 'StickyFooter', 'pop', 'Pop');

-- CreateEnum
CREATE TYPE "WidgetStatus" AS ENUM ('active', 'draft', 'deactivate');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('SEND_OTP', 'SEND_ACCESS', 'EVENT_CANCEl', 'SEND_INVITE', 'SEND_INTEND_CREATE', 'SEND_INTEND_UPDATE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterEnum
BEGIN;
CREATE TYPE "AccessType_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');
ALTER TABLE "Access" ALTER COLUMN "accessType" TYPE "AccessType_new" USING ("accessType"::text::"AccessType_new");
ALTER TYPE "AccessType" RENAME TO "AccessType_old";
ALTER TYPE "AccessType_new" RENAME TO "AccessType";
DROP TYPE "AccessType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttachmentSourceModule" ADD VALUE 'EVENT';
ALTER TYPE "AttachmentSourceModule" ADD VALUE 'BRANDKIT';

-- AlterEnum
BEGIN;
CREATE TYPE "EnquiryStatus_new" AS ENUM ('PENDING', 'IN_DISCUSSION', 'SHORTLISTED', 'IN_NEGOTIATION', 'CONFIRMED', 'CANCELLED', 'REJECTED');
ALTER TABLE "Enquiry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Enquiry" ALTER COLUMN "status" TYPE "EnquiryStatus_new" USING ("status"::text::"EnquiryStatus_new");
ALTER TYPE "EnquiryStatus" RENAME TO "EnquiryStatus_old";
ALTER TYPE "EnquiryStatus_new" RENAME TO "EnquiryStatus";
DROP TYPE "EnquiryStatus_old";
ALTER TABLE "Enquiry" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "Interest" ADD VALUE 'ORGANIZE';

-- AlterEnum
ALTER TYPE "InterestSourceModule" ADD VALUE 'PROMOTED_EVENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterestStatus" ADD VALUE 'WAITLISTING';
ALTER TYPE "InterestStatus" ADD VALUE 'FOLLOWING';
ALTER TYPE "InterestStatus" ADD VALUE 'INVITATION';

-- AlterEnum
ALTER TYPE "OnboardingState" ADD VALUE 'PROMOTED_USER';

-- DropForeignKey
ALTER TABLE "AccountConfiguration" DROP CONSTRAINT "AccountConfiguration_accountId_fkey";

-- DropForeignKey
ALTER TABLE "AccountConfiguration" DROP CONSTRAINT "AccountConfiguration_configurationId_fkey";

-- DropForeignKey
ALTER TABLE "Configuration" DROP CONSTRAINT "Configuration_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_atachmentId_fkey";

-- DropForeignKey
ALTER TABLE "UserConfiguration" DROP CONSTRAINT "UserConfiguration_configurationId_fkey";

-- DropForeignKey
ALTER TABLE "UserConfiguration" DROP CONSTRAINT "UserConfiguration_userId_fkey";

-- DropForeignKey
ALTER TABLE "Widget" DROP CONSTRAINT "Widget_eventId_fkey";

-- DropIndex
DROP INDEX "Intent_targetModule_targetId_userId_intentType_key";

-- AlterTable
ALTER TABLE "Access" ADD COLUMN     "accountId" UUID,
ADD COLUMN     "lastModifiedBy" UUID;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "configurationId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ApiLogs" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "Brand" ALTER COLUMN "updateAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "Configuration" DROP COLUMN "constraints",
DROP COLUMN "createdById",
ADD COLUMN     "config" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "eventData" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "EnquiryActivity" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "atachmentId",
ADD COLUMN     "attachmentId" UUID;

-- AlterTable
ALTER TABLE "Export" DROP COLUMN "exportStatus",
ALTER COLUMN "outputData" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Intent" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "SavedLocation" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "Tracker" DROP COLUMN "filterValue",
ADD COLUMN     "accountId" UUID,
ADD COLUMN     "filterValues" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" UUID,
ADD COLUMN     "primaryAccountId" UUID,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "UserActivity" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "UserEventInterest" DROP COLUMN "createdBy",
DROP COLUMN "modifiedBy",
ADD COLUMN     "modifiedBy" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Widget" DROP COLUMN "eventId",
ADD COLUMN     "customizationData" JSONB,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "otherData" JSONB,
ADD COLUMN     "status" "WidgetStatus" NOT NULL,
ADD COLUMN     "templatePublicId" INTEGER NOT NULL,
ADD COLUMN     "type" "WidgetType" NOT NULL;

-- DropTable
DROP TABLE "AccountConfiguration";

-- DropTable
DROP TABLE "UserConfiguration";

-- DropEnum
DROP TYPE "BullStatus";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "RequestedJob" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "source" "JobSource" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "inputData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventToWidget" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EventToWidget_AB_unique" ON "_EventToWidget"("A", "B");

-- CreateIndex
CREATE INDEX "_EventToWidget_B_index" ON "_EventToWidget"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Account_configurationId_key" ON "Account"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_accountId_key" ON "Company"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Intent_targetModule_targetId_userId_intentType_accountId_key" ON "Intent"("targetModule", "targetId", "userId", "intentType", "accountId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intent" ADD CONSTRAINT "Intent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryActivity" ADD CONSTRAINT "EnquiryActivity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLogs" ADD CONSTRAINT "ApiLogs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestedJob" ADD CONSTRAINT "RequestedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToWidget" ADD CONSTRAINT "_EventToWidget_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToWidget" ADD CONSTRAINT "_EventToWidget_B_fkey" FOREIGN KEY ("B") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
