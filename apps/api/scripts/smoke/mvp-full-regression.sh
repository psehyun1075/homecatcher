#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3006/api/v1}"
RUN_ID="mvp$(date +%s%N)"
RUN_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
PASSED=0

finish() {
  local status=$?
  if [[ "$status" == "0" ]]; then
    echo "MVP full regression passed ($PASSED checks)"
  else
    echo "MVP full regression failed after $PASSED checks" >&2
  fi
}
trap finish EXIT

api() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"
  local out
  out="$(mktemp)"
  if [[ -n "$body" ]]; then
    STATUS="$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$API_BASE_URL$path" \
      -H "Content-Type: application/json" \
      ${token:+-H "Authorization: Bearer $token"} \
      --data "$body")"
  else
    STATUS="$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$API_BASE_URL$path" \
      ${token:+-H "Authorization: Bearer $token"})"
  fi
  BODY="$(cat "$out")"
  rm -f "$out"
}

expect() {
  local expected="$1"
  local label="$2"
  if [[ "$STATUS" != "$expected" ]]; then
    echo "[$label] expected HTTP $expected, got $STATUS" >&2
    echo "$BODY" >&2
    exit 1
  fi
  PASSED=$((PASSED + 1))
}

assert_json() {
  local expression="$1"
  local label="$2"
  echo "$BODY" | jq -e "$expression" >/dev/null || {
    echo "[$label] assertion failed: $expression" >&2
    echo "$BODY" >&2
    exit 1
  }
  PASSED=$((PASSED + 1))
}

new_uuid() {
  cat /proc/sys/kernel/random/uuid
}

db_scalar() {
  local sql="$1"
  (cd "$REPO_ROOT/apps/api" && node -e '
    require("dotenv").config({ path: "../../.env", quiet: true });
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const sql = process.argv[1];
    (async () => {
      const rows = await prisma.$queryRawUnsafe(sql);
      const row = rows[0] || {};
      const value = Object.values(row)[0] ?? "";
      console.log(String(value));
      await prisma.$disconnect();
    })().catch(async (error) => {
      console.error(error.message);
      await prisma.$disconnect();
      process.exit(1);
    });
  ' "$sql")
}

signup() {
  local email="$1"
  local name="$2"
  api POST "/auth/signup" "" "{\"email\":\"$email\",\"password\":\"Password123!\",\"name\":\"$name\"}"
  expect 201 "signup $name"
  echo "$BODY" | jq -r '.accessToken'
}

OWNER_TOKEN="$(signup "owner-$RUN_ID@example.com" "아빠")"
MEMBER_TOKEN="$(signup "member-$RUN_ID@example.com" "엄마")"
OUTSIDER_TOKEN="$(signup "outsider-$RUN_ID@example.com" "외부인")"

api POST "/families" "$OWNER_TOKEN" "{\"familyName\":\"MVP 검증 $RUN_ID\"}"
expect 201 "family create"
FAMILY_ID="$(echo "$BODY" | jq -r '.family.id')"

api POST "/families/$FAMILY_ID/invites" "$OWNER_TOKEN"
expect 201 "invite create"
INVITE_CODE="$(echo "$BODY" | jq -r '.invite.code')"
[[ -n "$INVITE_CODE" && "$INVITE_CODE" != "null" ]] || { echo "invite code missing" >&2; exit 1; }

api POST "/invites/$INVITE_CODE/accept" "$MEMBER_TOKEN"
expect 201 "invite accept"

api POST "/families" "$OUTSIDER_TOKEN" "{\"familyName\":\"외부 가족 $RUN_ID\"}"
expect 201 "outsider family create"
OUTSIDER_FAMILY_ID="$(echo "$BODY" | jq -r '.family.id')"

api GET "/families/$FAMILY_ID/members" "$OWNER_TOKEN"
expect 200 "member list"
OWNER_MEMBER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="OWNER") | .id' | head -n1)"
MEMBER_MEMBER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="MEMBER") | .id' | head -n1)"
OWNER_USER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="OWNER") | .user.id' | head -n1)"
MEMBER_USER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="MEMBER") | .user.id' | head -n1)"

api GET "/templates" "$OWNER_TOKEN"
expect 200 "template list"
TEMPLATE_ID="$(echo "$BODY" | jq -r '.templates[0].id // empty')"
if [[ -n "$TEMPLATE_ID" ]]; then
  api POST "/families/$FAMILY_ID/templates/$TEMPLATE_ID/apply" "$OWNER_TOKEN"
  expect 201 "template apply"
fi

api GET "/families/$FAMILY_ID/household-items" "$OWNER_TOKEN"
expect 200 "household item list"

api POST "/families/$FAMILY_ID/household-items" "$OWNER_TOKEN" "{\"name\":\"기저귀 $RUN_ID\",\"category\":\"생필품\",\"cycleDays\":7}"
expect 201 "household item create"
ITEM_ID="$(echo "$BODY" | jq -r '.householdItem.id')"

api POST "/household-items/$ITEM_ID/product-links" "$OWNER_TOKEN" "{\"url\":\"https://example.com/product/$RUN_ID\",\"isPrimary\":true}"
expect 201 "product link create"
PRODUCT_LINK_ID="$(echo "$BODY" | jq -r '.productLink.id')"

api GET "/household-items/$ITEM_ID/reorder-preview" "$OWNER_TOKEN"
expect 200 "reorder preview"
assert_json '.reorderPreview.householdItem.id == "'"$ITEM_ID"'"' "reorder preview item"

PURCHASE_REQUEST_ID="$(new_uuid)"
PURCHASE_BODY="{\"requestId\":\"$PURCHASE_REQUEST_ID\",\"productLinkId\":\"$PRODUCT_LINK_ID\",\"quantity\":2,\"unitPrice\":18400,\"totalAmount\":36800,\"currency\":\"KRW\",\"purchasedAt\":\"2026-07-20T09:00:00+09:00\",\"stockAfterPurchase\":2,\"note\":\"기저귀 2팩\"}"
api POST "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN" "$PURCHASE_BODY"
expect 201 "purchase create"
PURCHASE_ID="$(echo "$BODY" | jq -r '.purchase.id')"

api POST "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN" "$PURCHASE_BODY"
expect 201 "purchase idempotent same"
assert_json '.purchase.id == "'"$PURCHASE_ID"'"' "purchase same id"

api POST "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN" "{\"requestId\":\"$PURCHASE_REQUEST_ID\",\"productLinkId\":\"$PRODUCT_LINK_ID\",\"quantity\":2,\"unitPrice\":18400,\"totalAmount\":99999,\"currency\":\"KRW\",\"purchasedAt\":\"2026-07-20T09:00:00+09:00\"}"
expect 409 "purchase idempotent conflict"

api GET "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN"
expect 200 "purchase list"
assert_json '[.purchases[] | select(.id=="'"$PURCHASE_ID"'")] | length == 1' "purchase list contains purchase"

api GET "/families/$FAMILY_ID/accountbook/entries?month=2026-07&page=1&limit=20" "$OWNER_TOKEN"
expect 200 "account entries after purchase"
assert_json '[.entries[] | select(.itemPurchaseLogId=="'"$PURCHASE_ID"'")] | length == 1' "purchase account entry"

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" "{\"title\":\"분리수거 $RUN_ID\",\"plannerMemberId\":\"$OWNER_MEMBER_ID\",\"assigneeMemberId\":\"$MEMBER_MEMBER_ID\",\"schedule\":{\"scheduleType\":\"ONCE\",\"startAt\":\"2026-07-22T09:00:00+09:00\",\"timezone\":\"Asia/Seoul\"}}"
expect 201 "todo create"
TODO_ID="$(echo "$BODY" | jq -r '.todo.id')"

TODO_REQUEST_ID="$(new_uuid)"
TODO_BODY="{\"requestId\":\"$TODO_REQUEST_ID\",\"completedAt\":\"2026-07-22T10:00:00+09:00\",\"note\":\"완료\"}"
api POST "/todos/$TODO_ID/completions" "$MEMBER_TOKEN" "$TODO_BODY"
expect 201 "todo completion create"
COMPLETION_ID="$(echo "$BODY" | jq -r '.completion.id')"
api POST "/todos/$TODO_ID/completions" "$MEMBER_TOKEN" "$TODO_BODY"
expect 201 "todo completion idempotent same"
assert_json '.completion.id == "'"$COMPLETION_ID"'"' "todo same id"
api POST "/todos/$TODO_ID/completions" "$MEMBER_TOKEN" "{\"requestId\":\"$TODO_REQUEST_ID\",\"completedAt\":\"2026-07-22T11:00:00+09:00\",\"note\":\"완료\"}"
expect 409 "todo completion conflict"

api POST "/families/$FAMILY_ID/home-manuals" "$OWNER_TOKEN" "{\"title\":\"세탁 방법 $RUN_ID\",\"category\":\"생활\",\"steps\":[{\"title\":\"분리해요\",\"sortOrder\":1}]}"
expect 201 "manual create"
MANUAL_ID="$(echo "$BODY" | jq -r '.homeManual.id')"
api GET "/home-manuals/$MANUAL_ID" "$MEMBER_TOKEN"
expect 200 "manual detail"

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" "{\"title\":\"가족여행 $RUN_ID\",\"eventType\":\"TRAVEL\",\"location\":\"제주\",\"startAt\":\"2026-07-28T09:00:00+09:00\",\"endAt\":\"2026-07-29T18:00:00+09:00\",\"timezone\":\"Asia/Seoul\",\"participantMemberIds\":[\"$MEMBER_MEMBER_ID\"]}"
expect 201 "family event create"
EVENT_ID="$(echo "$BODY" | jq -r '.event.id')"

api POST "/families/$FAMILY_ID/fixed-expenses" "$MEMBER_TOKEN" '{"title":"권한 검증","amount":1,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":25,"startDate":"2026-01-01","dueTime":"09:00","timezone":"Asia/Seoul"}'
expect 403 "member fixed expense create forbidden"

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" "{\"title\":\"월세 $RUN_ID\",\"amount\":850000,\"currency\":\"KRW\",\"recurrenceType\":\"MONTHLY\",\"dayOfMonth\":25,\"startDate\":\"2026-01-01\",\"dueTime\":\"09:00\",\"timezone\":\"Asia/Seoul\",\"reminders\":[{\"daysBefore\":3,\"remindTime\":\"09:00\",\"enabled\":true}]}"
expect 201 "fixed expense create"
FIXED_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"

PAYMENT_REQUEST_ID="$(new_uuid)"
PAYMENT_BODY="{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":850000,\"currency\":\"KRW\",\"note\":\"7월 월세\"}"
api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "$PAYMENT_BODY"
expect 201 "fixed payment create"
PAYMENT_ID="$(echo "$BODY" | jq -r '.payment.id')"
api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "$PAYMENT_BODY"
expect 201 "fixed payment idempotent same"
assert_json '.payment.id == "'"$PAYMENT_ID"'"' "fixed payment same id"
api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":850001,\"currency\":\"KRW\"}"
expect 409 "fixed payment conflict"

api GET "/families/$FAMILY_ID/calendar/month?month=2026-07&timezone=Asia/Seoul" "$OWNER_TOKEN"
expect 200 "calendar month"
assert_json '[.days[].items[]? | select(.sourceType=="FIXED_EXPENSE" and .sourceId=="'"$FIXED_EXPENSE_ID"'")] | length >= 1' "calendar fixed expense"
assert_json '[.days[].items[]? | select(.sourceType=="FAMILY_EVENT" and .sourceId=="'"$EVENT_ID"'")] | length >= 1' "calendar family event"

api GET "/families/$FAMILY_ID/accountbook/monthly-summary?month=2026-07" "$OWNER_TOKEN"
expect 200 "account monthly summary"
assert_json '.totalExpense >= 886800' "monthly summary amount"

api GET "/families/$FAMILY_ID/accountbook/categories" "$OWNER_TOKEN"
expect 200 "account categories"
OTHER_CATEGORY_ID="$(echo "$BODY" | jq -r '.categories[] | select(.code=="OTHER") | .id' | head -n1)"
api POST "/families/$FAMILY_ID/accountbook/entries" "$OWNER_TOKEN" "{\"categoryId\":\"$OTHER_CATEGORY_ID\",\"entryType\":\"EXPENSE\",\"amount\":12000,\"currency\":\"KRW\",\"occurredAt\":\"2026-07-26T12:00:00+09:00\",\"title\":\"직접 입력 $RUN_ID\"}"
expect 201 "account direct entry"

api GET "/families/$FAMILY_ID/feed?limit=50" "$OWNER_TOKEN"
expect 200 "feed list"
assert_json '[.activities[].activityType] | index("TODO_COMPLETED") != null' "feed todo activity"
assert_json '[.activities[].activityType] | index("HOUSEHOLD_ITEM_PURCHASED") != null' "feed purchase activity"
assert_json '[.activities[].activityType] | index("FIXED_EXPENSE_PAID") != null' "feed fixed payment activity"
TODO_ACTIVITY_ID="$(echo "$BODY" | jq -r '.activities[] | select(.activityType=="TODO_COMPLETED") | .id' | head -n1)"
OWNER_ACTIVITY_ID="$(echo "$BODY" | jq -r '.activities[] | select(.actor.memberId=="'"$OWNER_MEMBER_ID"'") | .id' | head -n1)"
PURCHASE_ACTIVITY_COUNT="$(echo "$BODY" | jq '[.activities[] | select(.activityType=="HOUSEHOLD_ITEM_PURCHASED")] | length')"
[[ "$PURCHASE_ACTIVITY_COUNT" == "1" ]] || { echo "purchase activity duplicated: $PURCHASE_ACTIVITY_COUNT" >&2; exit 1; }
PASSED=$((PASSED + 1))

api POST "/activities/$OWNER_ACTIVITY_ID/appreciations" "$MEMBER_TOKEN" '{"message":"고마워요!"}'
expect 201 "appreciation create"
APPRECIATION_ID="$(echo "$BODY" | jq -r '.appreciation.id')"
api POST "/activities/$OWNER_ACTIVITY_ID/appreciations" "$MEMBER_TOKEN" '{"message":"고마워요!"}'
expect 201 "appreciation idempotent"
assert_json '.appreciation.id == "'"$APPRECIATION_ID"'"' "appreciation same id"
APPRECIATION_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Appreciation\" WHERE \"activityId\" = '$OWNER_ACTIVITY_ID' AND \"fromMemberId\" = '$MEMBER_MEMBER_ID' AND \"deletedAt\" IS NULL")"
[[ "$APPRECIATION_COUNT" == "1" ]] || { echo "appreciation duplicated: $APPRECIATION_COUNT" >&2; exit 1; }
PASSED=$((PASSED + 1))

api POST "/activities/$TODO_ACTIVITY_ID/appreciations" "$MEMBER_TOKEN" '{}'
expect 409 "self appreciation forbidden"

api GET "/notifications?familyId=$FAMILY_ID&limit=50" "$OWNER_TOKEN"
expect 200 "owner notifications"
OWNER_NOTIFICATION_ID="$(echo "$BODY" | jq -r '.notifications[0].id')"
assert_json '[.notifications[].notificationType] | index("APPRECIATION_RECEIVED") != null' "appreciation notification"
api GET "/notifications/$OWNER_NOTIFICATION_ID" "$MEMBER_TOKEN"
expect 403 "other user notification forbidden"
api PATCH "/notifications/$OWNER_NOTIFICATION_ID/read" "$OWNER_TOKEN"
expect 200 "notification read"
api GET "/notifications/unread-count?familyId=$FAMILY_ID" "$OWNER_TOKEN"
expect 200 "unread count"
api POST "/notifications/read-all" "$OWNER_TOKEN" "{\"familyId\":\"$FAMILY_ID\"}"
expect 201 "read all"
api PATCH "/notifications/$OWNER_NOTIFICATION_ID/archive" "$OWNER_TOKEN"
expect 200 "archive notification"

api GET "/household-items/$ITEM_ID" "$OUTSIDER_TOKEN"
expect 403 "outsider household item forbidden"
api GET "/todos/$TODO_ID" "$OUTSIDER_TOKEN"
expect 403 "outsider todo forbidden"
api GET "/home-manuals/$MANUAL_ID" "$OUTSIDER_TOKEN"
expect 403 "outsider manual forbidden"
api GET "/families/$FAMILY_ID/calendar/month?month=2026-07&timezone=Asia/Seoul" "$OUTSIDER_TOKEN"
expect 403 "outsider calendar forbidden"
api GET "/families/$FAMILY_ID/accountbook/entries?month=2026-07&page=1&limit=5" "$OUTSIDER_TOKEN"
expect 403 "outsider accountbook forbidden"
api GET "/families/$FAMILY_ID/feed" "$OUTSIDER_TOKEN"
expect 403 "outsider feed forbidden"
api GET "/notifications/unread-count?familyId=$OUTSIDER_FAMILY_ID" "$OWNER_TOKEN"
expect 403 "other family unread forbidden"

pushd "$REPO_ROOT" >/dev/null
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-mvp-sync-1.json
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-mvp-sync-2.json
popd >/dev/null
SYNC_DUPES="$(db_scalar "SELECT COUNT(*) FROM (SELECT \"dedupeKey\" FROM \"Notification\" WHERE \"dedupeKey\" IS NOT NULL AND \"createdAt\" >= '$RUN_STARTED_AT'::timestamptz GROUP BY \"dedupeKey\" HAVING COUNT(*) > 1) d")"
[[ "$SYNC_DUPES" == "0" ]] || { echo "notification dedupe duplicates: $SYNC_DUPES" >&2; exit 1; }
PASSED=$((PASSED + 1))
