-- CreateEnum
CREATE TYPE "AttachmentSourceModule" AS ENUM ('COMMENT', 'TRACKER', 'USER', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "IntentTargetModule" AS ENUM ('COMMENT');

-- CreateEnum
CREATE TYPE "IntentType" AS ENUM ('UPVOTE');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('TEXT', 'RECOMMENDATION', 'INTEREST');

-- CreateEnum
CREATE TYPE "CommentSourceModule" AS ENUM ('TRACKER', 'COORDINATE', 'OUTREACH');

-- CreateEnum
CREATE TYPE "EnquiryActivityType" AS ENUM ('FOLLOW', 'UPVOTE');

-- CreateEnum
CREATE TYPE "EnquiryActivitySubType" AS ENUM ('ATTEND', 'SPEAK', 'SPONSOR', 'EXHIBIT');

-- CreateEnum
CREATE TYPE "ExportFileType" AS ENUM ('CSV', 'JSON');

-- CreateEnum
CREATE TYPE "AccessSourceEntity" AS ENUM ('TRACKER');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('READ', 'WRITE');

-- CreateEnum
CREATE TYPE "TrackerType" AS ENUM ('T_PEOPLE_FINDER', 'T_COMPETITOR', 'T_SPEAKING_OPPORTUNITY', 'T_PRODUCT_KEYWORDS', 'T_RECRUITMENT', 'T_LOCATION', 'T_VENUE', 'T_GEOTIME', 'T_CUSTOM', 'TR_CUSTOM');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('GEO_JSON', 'LOCATION_ID');

-- CreateEnum
CREATE TYPE "RadiusUnit" AS ENUM ('KM', 'MI');

-- CreateEnum
CREATE TYPE "GeomType" AS ENUM ('POINT');

-- CreateEnum
CREATE TYPE "UnlockSource" AS ENUM ('CONTACT_DETAIL', 'EVENT_DETAIL');

-- CreateEnum
CREATE TYPE "UnlockType" AS ENUM ('USER', 'EVENT');

-- CreateEnum
CREATE TYPE "UnlockValue" AS ENUM ('EMAIL', 'PHONE', 'BASIC', 'ADVANCE');

-- CreateEnum
CREATE TYPE "BullStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvitationEntity" AS ENUM ('EVENT');

-- CreateEnum
CREATE TYPE "UsageTrackerEntity" AS ENUM ('USER');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('INVITAION');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterestSourceModule" AS ENUM ('RESEARCH', 'TRACKER', 'COMMENT');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('CONFIRMED', 'PENDING', 'SHORTLISTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Interest" AS ENUM ('BOOKMARK', 'ATTEND', 'SPEAK', 'SPONSOR', 'EXHIBIT');

-- CreateEnum
CREATE TYPE "AttachmentEntityType" AS ENUM ('USER', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "OnboardingState" AS ENUM ('VERIFICATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('IMAGE', 'PDF', 'CSV', 'JSON');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "industry" TEXT,
    "category" TEXT,
    "subIndustry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT,
    "currentOnboardingState" "OnboardingState" NOT NULL DEFAULT 'VERIFICATION',
    "primaryLocation" JSONB,
    "imageUrl" TEXT,
    "profileImageId" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "website" TEXT,
    "imageUrl" TEXT,
    "profileImageId" TEXT,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "membership" SMALLINT NOT NULL DEFAULT 0,
    "pendingRequests" INTEGER DEFAULT 200,
    "pendingPocUnlockRequests" INTEGER DEFAULT 4400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "sourceModule" "AttachmentSourceModule" NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEventInterest" (
    "id" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "enquiryId" UUID,
    "eventId" TEXT NOT NULL,
    "note" TEXT,
    "sourceModule" "InterestSourceModule" NOT NULL,
    "sourceId" TEXT,
    "status" "InterestStatus" NOT NULL DEFAULT 'PENDING',
    "interest" "Interest" NOT NULL,
    "modifiedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" UUID,
    "recommendedBy" UUID,
    "interestedUserId" UUID NOT NULL,

    CONSTRAINT "UserEventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'PENDING',
    "eventId" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "initiatedBy" UUID NOT NULL,
    "ownerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "content" TEXT,
    "commentType" "CommentType" NOT NULL,
    "userId" UUID NOT NULL,
    "sourceModule" "CommentSourceModule" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "parentCommentId" UUID,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intent" (
    "id" UUID NOT NULL,
    "targetModule" "IntentTargetModule" NOT NULL,
    "targetId" TEXT NOT NULL,
    "intentType" "IntentType" NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryActivity" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activityType" "EnquiryActivityType" NOT NULL,
    "activitySubType" "EnquiryActivitySubType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EnquiryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "exportFileType" "ExportFileType" NOT NULL,
    "exportStatus" "BullStatus" NOT NULL DEFAULT 'PENDING',
    "inputData" JSONB NOT NULL,
    "outputData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" UUID NOT NULL,
    "request" JSONB NOT NULL,
    "path" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLogs" (
    "id" UUID NOT NULL,
    "request" JSONB NOT NULL,
    "path" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "passkey" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Access" (
    "id" UUID NOT NULL,
    "sourceEntity" "AccessSourceEntity" NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "accessReceiverId" UUID NOT NULL,
    "accessProviderId" UUID NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "token" TEXT,
    "expiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracker" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200),
    "filterValue" JSONB NOT NULL,
    "attachmentId" TEXT,
    "type" "TrackerType" NOT NULL DEFAULT 'T_CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "lastModifiedBy" UUID,

    CONSTRAINT "Tracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedLocation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "LocationType" NOT NULL,
    "locationId" TEXT,
    "geomType" "GeomType",
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "radiusUnit" "RadiusUnit",
    "locationName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "area" DOUBLE PRECISION,

    CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountConfiguration" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" UUID NOT NULL,
    "constraints" JSONB NOT NULL,
    "createdById" UUID NOT NULL,
    "lastModifiedById" UUID,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConfiguration" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockedTransaction" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "unlockByUserId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "unlockType" "UnlockType" NOT NULL,
    "unlockValue" "UnlockValue" NOT NULL,
    "source" "UnlockSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedById" UUID NOT NULL,

    CONSTRAINT "UnlockedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "atachmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "approval" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "registration" BOOLEAN NOT NULL DEFAULT true,
    "waitlisting" BOOLEAN NOT NULL DEFAULT false,
    "accountId" UUID NOT NULL,
    "parentEventId" UUID,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "entityType" "InvitationEntity" NOT NULL DEFAULT 'EVENT',
    "entityId" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "status" "BullStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" UUID NOT NULL,
    "entityId" VARCHAR(50) NOT NULL,
    "entityType" "UsageTrackerEntity" NOT NULL DEFAULT 'USER',
    "creditType" "CreditType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "CustomBrandKit" (
    "id" UUID NOT NULL,
    "data" JSONB,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "color" TEXT,
    "fontFamily" TEXT,
    "logoUrl" TEXT,
    "otherData" JSONB,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "CustomBrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "customBrandKitId" UUID,
    "createdBy" UUID NOT NULL,
    "accountId" UUID NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AccountToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_fileUrl_key" ON "Attachment"("fileUrl");

-- CreateIndex
CREATE UNIQUE INDEX "UserEventInterest_accountId_eventId_interestedUserId_intere_key" ON "UserEventInterest"("accountId", "eventId", "interestedUserId", "interest");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_accountId_eventId_key" ON "Enquiry"("accountId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Intent_targetModule_targetId_userId_intentType_key" ON "Intent"("targetModule", "targetId", "userId", "intentType");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_userId_key" ON "Verification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_saved_location_constraint" ON "SavedLocation"("userId", "type", "locationId", "latitude", "longitude", "radius", "radiusUnit", "geomType");

-- CreateIndex
CREATE INDEX "Credit_entityId_idx" ON "Credit"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_domain_key" ON "Brand"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomBrandKit_accountId_key" ON "CustomBrandKit"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "_AccountToUser_AB_unique" ON "_AccountToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_AccountToUser_B_index" ON "_AccountToUser"("B");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInterest" ADD CONSTRAINT "UserEventInterest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInterest" ADD CONSTRAINT "UserEventInterest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInterest" ADD CONSTRAINT "UserEventInterest_recommendedBy_fkey" FOREIGN KEY ("recommendedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInterest" ADD CONSTRAINT "UserEventInterest_interestedUserId_fkey" FOREIGN KEY ("interestedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEventInterest" ADD CONSTRAINT "UserEventInterest_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intent" ADD CONSTRAINT "Intent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryActivity" ADD CONSTRAINT "EnquiryActivity_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryActivity" ADD CONSTRAINT "EnquiryActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLogs" ADD CONSTRAINT "ApiLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_accessReceiverId_fkey" FOREIGN KEY ("accessReceiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_accessProviderId_fkey" FOREIGN KEY ("accessProviderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountConfiguration" ADD CONSTRAINT "AccountConfiguration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountConfiguration" ADD CONSTRAINT "AccountConfiguration_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConfiguration" ADD CONSTRAINT "UserConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConfiguration" ADD CONSTRAINT "UserConfiguration_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedTransaction" ADD CONSTRAINT "UnlockedTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedTransaction" ADD CONSTRAINT "UnlockedTransaction_unlockedById_fkey" FOREIGN KEY ("unlockedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_atachmentId_fkey" FOREIGN KEY ("atachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomBrandKit" ADD CONSTRAINT "CustomBrandKit_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomBrandKit" ADD CONSTRAINT "CustomBrandKit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_customBrandKitId_fkey" FOREIGN KEY ("customBrandKitId") REFERENCES "CustomBrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountToUser" ADD CONSTRAINT "_AccountToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountToUser" ADD CONSTRAINT "_AccountToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
