-- T-007: Todo and home manual APIs.
ALTER TYPE "TodoScheduleType" ADD VALUE IF NOT EXISTS 'INTERVAL_DAYS';

ALTER TABLE "TodoTask"
  ADD COLUMN "createdByMemberId" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "priority" INTEGER,
  ADD COLUMN "estimatedMinutes" INTEGER,
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "TodoSchedule"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul';

ALTER TABLE "TodoCompletion"
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "requestPayloadHash" TEXT;

UPDATE "TodoCompletion"
SET "requestId" = "id"
WHERE "requestId" IS NULL;

ALTER TABLE "TodoCompletion"
  ALTER COLUMN "requestId" SET NOT NULL;

ALTER TABLE "HomeManual"
  ADD COLUMN "createdByMemberId" TEXT;

ALTER TABLE "ManualRelation"
  ALTER COLUMN "fromStepId" DROP NOT NULL,
  ALTER COLUMN "toStepId" DROP NOT NULL,
  ADD COLUMN "targetType" TEXT,
  ADD COLUMN "householdItemId" TEXT,
  ADD COLUMN "todoTaskId" TEXT,
  ADD COLUMN "note" TEXT;

UPDATE "ManualRelation"
SET "targetType" = 'STEP'
WHERE "targetType" IS NULL;

CREATE INDEX "TodoTask_createdByMemberId_idx" ON "TodoTask"("createdByMemberId");
CREATE INDEX "TodoTask_completedAt_idx" ON "TodoTask"("completedAt");
CREATE UNIQUE INDEX "TodoCompletion_requestId_key" ON "TodoCompletion"("requestId");
CREATE INDEX "TodoCompletion_requestId_idx" ON "TodoCompletion"("requestId");
CREATE INDEX "HomeManual_createdByMemberId_idx" ON "HomeManual"("createdByMemberId");
CREATE INDEX "ManualRelation_householdItemId_idx" ON "ManualRelation"("householdItemId");
CREATE INDEX "ManualRelation_todoTaskId_idx" ON "ManualRelation"("todoTaskId");

ALTER TABLE "TodoTask"
  ADD CONSTRAINT "TodoTask_createdByMemberId_fkey"
  FOREIGN KEY ("createdByMemberId") REFERENCES "FamilyMember"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HomeManual"
  ADD CONSTRAINT "HomeManual_createdByMemberId_fkey"
  FOREIGN KEY ("createdByMemberId") REFERENCES "FamilyMember"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManualRelation"
  ADD CONSTRAINT "ManualRelation_householdItemId_fkey"
  FOREIGN KEY ("householdItemId") REFERENCES "HouseholdItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManualRelation"
  ADD CONSTRAINT "ManualRelation_todoTaskId_fkey"
  FOREIGN KEY ("todoTaskId") REFERENCES "TodoTask"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
