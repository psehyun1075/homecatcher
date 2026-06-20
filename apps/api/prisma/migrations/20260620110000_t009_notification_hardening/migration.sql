UPDATE "ActivityLog"
SET "dedupeKey" = 'LEGACY_ACTIVITY:' || "id"
WHERE "dedupeKey" IS NULL;

UPDATE "Notification"
SET "dedupeKey" = 'LEGACY_NOTIFICATION:' || "id"
WHERE "dedupeKey" IS NULL;

ALTER TABLE "ActivityLog"
  ALTER COLUMN "dedupeKey" SET NOT NULL;

ALTER TABLE "Notification"
  ALTER COLUMN "dedupeKey" SET NOT NULL;
