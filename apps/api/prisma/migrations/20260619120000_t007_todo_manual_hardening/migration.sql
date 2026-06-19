-- T-007 hardening: prevent duplicate active manual target relations.
CREATE UNIQUE INDEX "ManualRelation_active_household_item_key"
  ON "ManualRelation"("homeManualId", "householdItemId")
  WHERE "deletedAt" IS NULL AND "householdItemId" IS NOT NULL;

CREATE UNIQUE INDEX "ManualRelation_active_todo_task_key"
  ON "ManualRelation"("homeManualId", "todoTaskId")
  WHERE "deletedAt" IS NULL AND "todoTaskId" IS NOT NULL;
