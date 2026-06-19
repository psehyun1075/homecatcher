-- T-006: purchase completion, accountbook linkage, and default account categories.
CREATE TYPE "SubstitutionPolicy" AS ENUM ('NOT_ALLOWED', 'SAME_BRAND', 'ANY');

ALTER TABLE "HouseholdItem"
  ADD COLUMN "lastPurchasedAt" TIMESTAMP(3),
  ADD COLUMN "nextEstimatedRunOutAt" TIMESTAMP(3);

ALTER TABLE "ItemPurchaseRule"
  ADD COLUMN "substitutionPolicy" "SubstitutionPolicy" NOT NULL DEFAULT 'NOT_ALLOWED',
  ADD COLUMN "deliveryCondition" TEXT,
  ADD COLUMN "reorderThreshold" INTEGER,
  ADD COLUMN "note" TEXT;

ALTER TABLE "ItemPurchaseLog"
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "productLinkId" TEXT,
  ADD COLUMN "quantity" DECIMAL(12,2),
  ADD COLUMN "unitPrice" DECIMAL(12,2),
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW',
  ADD COLUMN "stockAfterPurchase" INTEGER;

UPDATE "ItemPurchaseLog"
SET "requestId" = "id"
WHERE "requestId" IS NULL;

ALTER TABLE "ItemPurchaseLog"
  ALTER COLUMN "requestId" SET NOT NULL;

ALTER TABLE "AccountEntry"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW';

ALTER TABLE "AccountCategory"
  ADD COLUMN "code" TEXT;

UPDATE "AccountCategory"
SET "code" = CASE
  WHEN "name" = '고정지출' THEN 'FIXED_EXPENSE'
  WHEN "name" = '식비' THEN 'FOOD'
  WHEN "name" = '식재료' THEN 'GROCERIES'
  WHEN "name" = '생필품' THEN 'HOUSEHOLD_SUPPLIES'
  WHEN "name" = '아이·교육' THEN 'CHILD_EDUCATION'
  WHEN "name" = '교통·차량' THEN 'VEHICLE'
  WHEN "name" = '경조사' THEN 'SOCIAL_EVENTS'
  WHEN "name" = '여행·여가' THEN 'TRAVEL_LEISURE'
  WHEN "name" = '기타' THEN 'OTHER'
  ELSE UPPER(REGEXP_REPLACE("name", '[^A-Za-z0-9가-힣]+', '_', 'g')) || '_' || SUBSTRING("id", 1, 8)
END
WHERE "code" IS NULL;

ALTER TABLE "AccountCategory"
  ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "ItemPurchaseLog_requestId_key" ON "ItemPurchaseLog"("requestId");
CREATE INDEX "ItemPurchaseLog_requestId_idx" ON "ItemPurchaseLog"("requestId");
CREATE INDEX "ItemPurchaseLog_productLinkId_idx" ON "ItemPurchaseLog"("productLinkId");
CREATE UNIQUE INDEX "AccountCategory_familyId_code_key" ON "AccountCategory"("familyId", "code");

ALTER TABLE "ItemPurchaseLog"
  ADD CONSTRAINT "ItemPurchaseLog_productLinkId_fkey"
  FOREIGN KEY ("productLinkId") REFERENCES "ProductLink"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
