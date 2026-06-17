-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TemplateTargetType" AS ENUM ('FAMILY', 'HOUSEHOLD_ITEM', 'TODO_TASK', 'HOME_MANUAL', 'FIXED_EXPENSE', 'ACCOUNT_CATEGORY', 'FAMILY_EVENT');

-- CreateEnum
CREATE TYPE "TemplateItemType" AS ENUM ('HOUSEHOLD_ITEM', 'TODO_TASK', 'HOME_MANUAL', 'FIXED_EXPENSE', 'ACCOUNT_CATEGORY', 'FAMILY_EVENT');

-- CreateEnum
CREATE TYPE "MetadataStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "TodoScheduleType" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('FAMILY', 'TRIP', 'WORK', 'SCHOOL', 'HEALTH', 'BIRTHDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountEntryType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FixedExpenseStatus" AS ENUM ('ACTIVE', 'PAUSED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'REMINDER', 'TASK', 'EVENT', 'EXPENSE', 'FEED', 'APPRECIATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ITEM_PURCHASE', 'TODO_COMPLETE', 'FIXED_EXPENSE_PAID', 'MANUAL_CREATED', 'EVENT_CREATED', 'APPRECIATION_SENT', 'MEMBER_JOINED');

-- CreateEnum
CREATE TYPE "AppreciationType" AS ENUM ('THANKS', 'PRAISE', 'HELP', 'SUPPORT', 'ENCOURAGEMENT');

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "id" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "FamilyRole" NOT NULL DEFAULT 'MEMBER',
    "displayName" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "code" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentKey" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "familyId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetType" "TemplateTargetType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TemplateSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateItem" (
    "id" TEXT NOT NULL,
    "templateSetId" TEXT NOT NULL,
    "itemType" "TemplateItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "memo" TEXT,
    "minStock" INTEGER,
    "cycleDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HouseholdItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLink" (
    "id" TEXT NOT NULL,
    "householdItemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "productName" TEXT,
    "productImageUrl" TEXT,
    "mallName" TEXT,
    "lastPrice" DECIMAL(12,2),
    "metadataStatus" "MetadataStatus" NOT NULL DEFAULT 'TIMEOUT',
    "previewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPurchaseRule" (
    "id" TEXT NOT NULL,
    "householdItemId" TEXT NOT NULL,
    "exactOnly" BOOLEAN NOT NULL DEFAULT false,
    "priceLimit" DECIMAL(12,2),
    "approvalThreshold" DECIMAL(12,2),
    "preferredMallName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ItemPurchaseRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPurchaseLog" (
    "id" TEXT NOT NULL,
    "householdItemId" TEXT NOT NULL,
    "purchasedByMemberId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ItemPurchaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAccountLink" (
    "id" TEXT NOT NULL,
    "itemPurchaseLogId" TEXT NOT NULL,
    "accountEntryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ItemAccountLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoTask" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plannerMemberId" TEXT,
    "assigneeMemberId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TodoTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoSchedule" (
    "id" TEXT NOT NULL,
    "todoTaskId" TEXT NOT NULL,
    "scheduleType" "TodoScheduleType" NOT NULL,
    "repeatRule" JSONB,
    "nextDueAt" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TodoSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoCompletion" (
    "id" TEXT NOT NULL,
    "todoTaskId" TEXT NOT NULL,
    "completedByMemberId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TodoCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeManual" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HomeManual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualStep" (
    "id" TEXT NOT NULL,
    "homeManualId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "warning" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ManualStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualRelation" (
    "id" TEXT NOT NULL,
    "homeManualId" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "relationKind" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ManualRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyEvent" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "displayColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "familyEventId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "displayName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarViewSetting" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "weekStartDay" INTEGER NOT NULL DEFAULT 1,
    "displayOptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarViewSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountCategory" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryType" "AccountEntryType" NOT NULL DEFAULT 'EXPENSE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccountCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountEntry" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "accountCategoryId" TEXT NOT NULL,
    "entryType" "AccountEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "title" TEXT NOT NULL,
    "memo" TEXT,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedExpense" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "accountCategoryId" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "repeatRule" JSONB,
    "dueDay" INTEGER NOT NULL,
    "status" "FixedExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FixedExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedExpenseReminder" (
    "id" TEXT NOT NULL,
    "fixedExpenseId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FixedExpenseReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAccountLink" (
    "id" TEXT NOT NULL,
    "familyEventId" TEXT NOT NULL,
    "accountEntryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventAccountLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT,
    "notificationType" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "actorMemberId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appreciation" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "appreciationType" "AppreciationType" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Appreciation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE INDEX "FamilyMember_familyId_idx" ON "FamilyMember"("familyId");

-- CreateIndex
CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember"("familyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_familyId_idx" ON "Invite"("familyId");

-- CreateIndex
CREATE INDEX "Invite_createdByUserId_idx" ON "Invite"("createdByUserId");

-- CreateIndex
CREATE INDEX "Invite_acceptedByUserId_idx" ON "Invite"("acceptedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");

-- CreateIndex
CREATE INDEX "ConsentLog_consentKey_idx" ON "ConsentLog"("consentKey");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_familyId_idx" ON "AuditLog"("familyId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateSet_slug_key" ON "TemplateSet"("slug");

-- CreateIndex
CREATE INDEX "TemplateItem_templateSetId_idx" ON "TemplateItem"("templateSetId");

-- CreateIndex
CREATE INDEX "HouseholdItem_familyId_idx" ON "HouseholdItem"("familyId");

-- CreateIndex
CREATE INDEX "HouseholdItem_familyId_name_idx" ON "HouseholdItem"("familyId", "name");

-- CreateIndex
CREATE INDEX "ProductLink_householdItemId_idx" ON "ProductLink"("householdItemId");

-- CreateIndex
CREATE INDEX "ProductLink_url_idx" ON "ProductLink"("url");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPurchaseRule_householdItemId_key" ON "ItemPurchaseRule"("householdItemId");

-- CreateIndex
CREATE INDEX "ItemPurchaseLog_householdItemId_idx" ON "ItemPurchaseLog"("householdItemId");

-- CreateIndex
CREATE INDEX "ItemPurchaseLog_purchasedByMemberId_idx" ON "ItemPurchaseLog"("purchasedByMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAccountLink_itemPurchaseLogId_key" ON "ItemAccountLink"("itemPurchaseLogId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAccountLink_accountEntryId_key" ON "ItemAccountLink"("accountEntryId");

-- CreateIndex
CREATE INDEX "TodoTask_familyId_idx" ON "TodoTask"("familyId");

-- CreateIndex
CREATE INDEX "TodoTask_plannerMemberId_idx" ON "TodoTask"("plannerMemberId");

-- CreateIndex
CREATE INDEX "TodoTask_assigneeMemberId_idx" ON "TodoTask"("assigneeMemberId");

-- CreateIndex
CREATE INDEX "TodoSchedule_todoTaskId_idx" ON "TodoSchedule"("todoTaskId");

-- CreateIndex
CREATE INDEX "TodoSchedule_nextDueAt_idx" ON "TodoSchedule"("nextDueAt");

-- CreateIndex
CREATE INDEX "TodoCompletion_todoTaskId_idx" ON "TodoCompletion"("todoTaskId");

-- CreateIndex
CREATE INDEX "TodoCompletion_completedByMemberId_idx" ON "TodoCompletion"("completedByMemberId");

-- CreateIndex
CREATE INDEX "HomeManual_familyId_idx" ON "HomeManual"("familyId");

-- CreateIndex
CREATE INDEX "ManualStep_homeManualId_idx" ON "ManualStep"("homeManualId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualStep_homeManualId_stepNo_key" ON "ManualStep"("homeManualId", "stepNo");

-- CreateIndex
CREATE INDEX "ManualRelation_homeManualId_idx" ON "ManualRelation"("homeManualId");

-- CreateIndex
CREATE INDEX "ManualRelation_fromStepId_idx" ON "ManualRelation"("fromStepId");

-- CreateIndex
CREATE INDEX "ManualRelation_toStepId_idx" ON "ManualRelation"("toStepId");

-- CreateIndex
CREATE INDEX "FamilyEvent_familyId_idx" ON "FamilyEvent"("familyId");

-- CreateIndex
CREATE INDEX "FamilyEvent_startAt_idx" ON "FamilyEvent"("startAt");

-- CreateIndex
CREATE INDEX "EventParticipant_familyEventId_idx" ON "EventParticipant"("familyEventId");

-- CreateIndex
CREATE INDEX "EventParticipant_familyMemberId_idx" ON "EventParticipant"("familyMemberId");

-- CreateIndex
CREATE INDEX "CalendarViewSetting_familyId_idx" ON "CalendarViewSetting"("familyId");

-- CreateIndex
CREATE INDEX "CalendarViewSetting_userId_idx" ON "CalendarViewSetting"("userId");

-- CreateIndex
CREATE INDEX "AccountCategory_familyId_idx" ON "AccountCategory"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCategory_familyId_name_key" ON "AccountCategory"("familyId", "name");

-- CreateIndex
CREATE INDEX "AccountEntry_familyId_idx" ON "AccountEntry"("familyId");

-- CreateIndex
CREATE INDEX "AccountEntry_accountCategoryId_idx" ON "AccountEntry"("accountCategoryId");

-- CreateIndex
CREATE INDEX "AccountEntry_createdByMemberId_idx" ON "AccountEntry"("createdByMemberId");

-- CreateIndex
CREATE INDEX "AccountEntry_spentAt_idx" ON "AccountEntry"("spentAt");

-- CreateIndex
CREATE INDEX "FixedExpense_familyId_idx" ON "FixedExpense"("familyId");

-- CreateIndex
CREATE INDEX "FixedExpense_accountCategoryId_idx" ON "FixedExpense"("accountCategoryId");

-- CreateIndex
CREATE INDEX "FixedExpense_dueDay_idx" ON "FixedExpense"("dueDay");

-- CreateIndex
CREATE INDEX "FixedExpenseReminder_fixedExpenseId_idx" ON "FixedExpenseReminder"("fixedExpenseId");

-- CreateIndex
CREATE INDEX "FixedExpenseReminder_remindAt_idx" ON "FixedExpenseReminder"("remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventAccountLink_accountEntryId_key" ON "EventAccountLink"("accountEntryId");

-- CreateIndex
CREATE INDEX "EventAccountLink_familyEventId_idx" ON "EventAccountLink"("familyEventId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_familyId_idx" ON "Notification"("familyId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_familyId_idx" ON "ActivityLog"("familyId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorMemberId_idx" ON "ActivityLog"("actorMemberId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Appreciation_activityId_idx" ON "Appreciation"("activityId");

-- CreateIndex
CREATE INDEX "Appreciation_fromMemberId_idx" ON "Appreciation"("fromMemberId");

-- CreateIndex
CREATE INDEX "Appreciation_toMemberId_idx" ON "Appreciation"("toMemberId");

-- AddForeignKey
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateItem" ADD CONSTRAINT "TemplateItem_templateSetId_fkey" FOREIGN KEY ("templateSetId") REFERENCES "TemplateSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdItem" ADD CONSTRAINT "HouseholdItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_householdItemId_fkey" FOREIGN KEY ("householdItemId") REFERENCES "HouseholdItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPurchaseRule" ADD CONSTRAINT "ItemPurchaseRule_householdItemId_fkey" FOREIGN KEY ("householdItemId") REFERENCES "HouseholdItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPurchaseLog" ADD CONSTRAINT "ItemPurchaseLog_householdItemId_fkey" FOREIGN KEY ("householdItemId") REFERENCES "HouseholdItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPurchaseLog" ADD CONSTRAINT "ItemPurchaseLog_purchasedByMemberId_fkey" FOREIGN KEY ("purchasedByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAccountLink" ADD CONSTRAINT "ItemAccountLink_itemPurchaseLogId_fkey" FOREIGN KEY ("itemPurchaseLogId") REFERENCES "ItemPurchaseLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAccountLink" ADD CONSTRAINT "ItemAccountLink_accountEntryId_fkey" FOREIGN KEY ("accountEntryId") REFERENCES "AccountEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_plannerMemberId_fkey" FOREIGN KEY ("plannerMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_assigneeMemberId_fkey" FOREIGN KEY ("assigneeMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoSchedule" ADD CONSTRAINT "TodoSchedule_todoTaskId_fkey" FOREIGN KEY ("todoTaskId") REFERENCES "TodoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoCompletion" ADD CONSTRAINT "TodoCompletion_todoTaskId_fkey" FOREIGN KEY ("todoTaskId") REFERENCES "TodoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoCompletion" ADD CONSTRAINT "TodoCompletion_completedByMemberId_fkey" FOREIGN KEY ("completedByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeManual" ADD CONSTRAINT "HomeManual_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStep" ADD CONSTRAINT "ManualStep_homeManualId_fkey" FOREIGN KEY ("homeManualId") REFERENCES "HomeManual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRelation" ADD CONSTRAINT "ManualRelation_homeManualId_fkey" FOREIGN KEY ("homeManualId") REFERENCES "HomeManual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRelation" ADD CONSTRAINT "ManualRelation_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "ManualStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRelation" ADD CONSTRAINT "ManualRelation_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "ManualStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyEvent" ADD CONSTRAINT "FamilyEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_familyEventId_fkey" FOREIGN KEY ("familyEventId") REFERENCES "FamilyEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarViewSetting" ADD CONSTRAINT "CalendarViewSetting_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarViewSetting" ADD CONSTRAINT "CalendarViewSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCategory" ADD CONSTRAINT "AccountCategory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEntry" ADD CONSTRAINT "AccountEntry_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEntry" ADD CONSTRAINT "AccountEntry_accountCategoryId_fkey" FOREIGN KEY ("accountCategoryId") REFERENCES "AccountCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEntry" ADD CONSTRAINT "AccountEntry_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_accountCategoryId_fkey" FOREIGN KEY ("accountCategoryId") REFERENCES "AccountCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpenseReminder" ADD CONSTRAINT "FixedExpenseReminder_fixedExpenseId_fkey" FOREIGN KEY ("fixedExpenseId") REFERENCES "FixedExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccountLink" ADD CONSTRAINT "EventAccountLink_familyEventId_fkey" FOREIGN KEY ("familyEventId") REFERENCES "FamilyEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccountLink" ADD CONSTRAINT "EventAccountLink_accountEntryId_fkey" FOREIGN KEY ("accountEntryId") REFERENCES "AccountEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appreciation" ADD CONSTRAINT "Appreciation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appreciation" ADD CONSTRAINT "Appreciation_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appreciation" ADD CONSTRAINT "Appreciation_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
