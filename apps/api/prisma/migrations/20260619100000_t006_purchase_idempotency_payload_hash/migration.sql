-- T-006 follow-up: keep requestId idempotency safe when payloads differ.
ALTER TABLE "ItemPurchaseLog"
  ADD COLUMN "requestPayloadHash" TEXT;
