-- AlterTable
ALTER TABLE "TemplateSet" ADD COLUMN "code" TEXT;

-- Backfill
UPDATE "TemplateSet"
SET "code" = UPPER(REGEXP_REPLACE("slug", '[^A-Za-z0-9]+', '_', 'g'))
WHERE "code" IS NULL;

-- AlterTable
ALTER TABLE "TemplateSet" ALTER COLUMN "code" SET NOT NULL;

-- CreateTable
CREATE TABLE "FamilyTemplateApplication" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "templateSetId" TEXT NOT NULL,
    "appliedByUserId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTemplateApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateSet_code_key" ON "TemplateSet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyTemplateApplication_familyId_templateSetId_key" ON "FamilyTemplateApplication"("familyId", "templateSetId");

-- CreateIndex
CREATE INDEX "FamilyTemplateApplication_familyId_idx" ON "FamilyTemplateApplication"("familyId");

-- CreateIndex
CREATE INDEX "FamilyTemplateApplication_templateSetId_idx" ON "FamilyTemplateApplication"("templateSetId");

-- CreateIndex
CREATE INDEX "FamilyTemplateApplication_appliedByUserId_idx" ON "FamilyTemplateApplication"("appliedByUserId");

-- AddForeignKey
ALTER TABLE "FamilyTemplateApplication" ADD CONSTRAINT "FamilyTemplateApplication_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTemplateApplication" ADD CONSTRAINT "FamilyTemplateApplication_templateSetId_fkey" FOREIGN KEY ("templateSetId") REFERENCES "TemplateSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTemplateApplication" ADD CONSTRAINT "FamilyTemplateApplication_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
