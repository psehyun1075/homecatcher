-- T-008 calendar and fixed expense foundations.
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'TRAVEL';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'VACATION';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'BUSINESS_TRIP';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'FAMILY_EVENT';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'CHILD_EVENT';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SOCIAL_EVENT';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'MEDICAL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurrenceType') THEN
    CREATE TYPE "RecurrenceType" AS ENUM ('ONCE', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INTERVAL_DAYS');
  END IF;
END $$;

ALTER TABLE "FamilyEvent"
  ADD COLUMN IF NOT EXISTS "createdByMemberId" TEXT,
  ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
  ADD COLUMN IF NOT EXISTS "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'ONCE',
  ADD COLUMN IF NOT EXISTS "recurrenceRule" JSONB;

ALTER TABLE "FamilyEvent"
  ADD CONSTRAINT "FamilyEvent_createdByMemberId_fkey"
  FOREIGN KEY ("createdByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "FamilyEvent_createdByMemberId_idx" ON "FamilyEvent"("createdByMemberId");
CREATE INDEX IF NOT EXISTS "FamilyEvent_eventType_idx" ON "FamilyEvent"("eventType");
CREATE INDEX IF NOT EXISTS "FamilyEvent_deletedAt_idx" ON "FamilyEvent"("deletedAt");

ALTER TABLE "FixedExpense"
  ADD COLUMN IF NOT EXISTS "createdByMemberId" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KRW',
  ADD COLUMN IF NOT EXISTS "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "dayOfMonth" INTEGER,
  ADD COLUMN IF NOT EXISTS "dayOfWeek" INTEGER,
  ADD COLUMN IF NOT EXISTS "intervalValue" INTEGER,
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dueTime" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
  ADD COLUMN IF NOT EXISTS "memo" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "FixedExpense"
SET
  "dayOfMonth" = COALESCE("dayOfMonth", "dueDay"),
  "dueTime" = COALESCE("dueTime", '09:00'),
  "startDate" = COALESCE("startDate", date_trunc('day', "createdAt"))
WHERE "dayOfMonth" IS NULL OR "dueTime" IS NULL OR "startDate" IS NULL;

ALTER TABLE "FixedExpense"
  ADD CONSTRAINT "FixedExpense_createdByMemberId_fkey"
  FOREIGN KEY ("createdByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "FixedExpense_createdByMemberId_idx" ON "FixedExpense"("createdByMemberId");
CREATE INDEX IF NOT EXISTS "FixedExpense_recurrenceType_idx" ON "FixedExpense"("recurrenceType");
CREATE INDEX IF NOT EXISTS "FixedExpense_isActive_idx" ON "FixedExpense"("isActive");
CREATE INDEX IF NOT EXISTS "FixedExpense_deletedAt_idx" ON "FixedExpense"("deletedAt");

ALTER TABLE "FixedExpenseReminder"
  ADD COLUMN IF NOT EXISTS "daysBefore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "remindTime" TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS "FixedExpenseReminder_fixedExpenseId_daysBefore_key"
  ON "FixedExpenseReminder"("fixedExpenseId", "daysBefore");

CREATE TABLE IF NOT EXISTS "FixedExpensePayment" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requestPayloadHash" TEXT,
  "fixedExpenseId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KRW',
  "paidByMemberId" TEXT,
  "accountEntryId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "FixedExpensePayment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FixedExpensePayment"
  ADD CONSTRAINT "FixedExpensePayment_fixedExpenseId_fkey"
  FOREIGN KEY ("fixedExpenseId") REFERENCES "FixedExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FixedExpensePayment"
  ADD CONSTRAINT "FixedExpensePayment_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FixedExpensePayment"
  ADD CONSTRAINT "FixedExpensePayment_paidByMemberId_fkey"
  FOREIGN KEY ("paidByMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FixedExpensePayment"
  ADD CONSTRAINT "FixedExpensePayment_accountEntryId_fkey"
  FOREIGN KEY ("accountEntryId") REFERENCES "AccountEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "FixedExpensePayment_requestId_key" ON "FixedExpensePayment"("requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "FixedExpensePayment_accountEntryId_key" ON "FixedExpensePayment"("accountEntryId");
CREATE UNIQUE INDEX IF NOT EXISTS "FixedExpensePayment_fixedExpenseId_dueDate_key" ON "FixedExpensePayment"("fixedExpenseId", "dueDate");
CREATE INDEX IF NOT EXISTS "FixedExpensePayment_familyId_idx" ON "FixedExpensePayment"("familyId");
CREATE INDEX IF NOT EXISTS "FixedExpensePayment_fixedExpenseId_idx" ON "FixedExpensePayment"("fixedExpenseId");
CREATE INDEX IF NOT EXISTS "FixedExpensePayment_paidByMemberId_idx" ON "FixedExpensePayment"("paidByMemberId");
CREATE INDEX IF NOT EXISTS "FixedExpensePayment_dueDate_idx" ON "FixedExpensePayment"("dueDate");
