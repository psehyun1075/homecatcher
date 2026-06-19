-- T-005: household item CRUD and product link preview metadata.
ALTER TYPE "MetadataStatus" ADD VALUE IF NOT EXISTS 'UNSUPPORTED';

CREATE TYPE "MetadataSource" AS ENUM ('OPEN_GRAPH', 'JSON_LD', 'TITLE', 'NONE');

ALTER TABLE "HouseholdItem"
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "unit" TEXT;

ALTER TABLE "ProductLink"
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "metadataSource" "MetadataSource" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "HouseholdItem_createdByUserId_idx" ON "HouseholdItem"("createdByUserId");

ALTER TABLE "HouseholdItem"
  ADD CONSTRAINT "HouseholdItem_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "UserAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
