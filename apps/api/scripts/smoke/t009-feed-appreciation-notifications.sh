#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3004/api/v1}"
RUN_ID="t009$(date +%s%N)"
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

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
  if [[ "$STATUS" != "$expected" ]]; then
    echo "Expected HTTP $expected, got $STATUS: $BODY" >&2
    exit 1
  fi
}

assert_json() {
  local expression="$1"
  echo "$BODY" | jq -e "$expression" >/dev/null || {
    echo "Assertion failed: $expression" >&2
    echo "$BODY" >&2
    exit 1
  }
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
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
  ' "$sql")
}

signup() {
  local email="$1"
  local name="$2"
  api POST "/auth/signup" "" "{\"email\":\"$email\",\"password\":\"Password123!\",\"name\":\"$name\"}"
  expect 201
  echo "$BODY" | jq -r '.accessToken'
}

OWNER_TOKEN="$(signup "owner-$RUN_ID@example.com" "아빠")"
MEMBER_TOKEN="$(signup "member-$RUN_ID@example.com" "엄마")"
OUTSIDER_TOKEN="$(signup "outsider-$RUN_ID@example.com" "외부인")"

api POST "/families" "$OWNER_TOKEN" "{\"familyName\":\"T009 검증 $RUN_ID\"}"
expect 201
FAMILY_ID="$(echo "$BODY" | jq -r '.family.id')"

api POST "/families/$FAMILY_ID/invites" "$OWNER_TOKEN"
expect 201
INVITE_CODE="$(echo "$BODY" | jq -r '.invite.code')"
api POST "/invites/$INVITE_CODE/accept" "$MEMBER_TOKEN"
expect 201

api GET "/families/$FAMILY_ID/members" "$OWNER_TOKEN"
expect 200
OWNER_MEMBER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="OWNER") | .id' | head -n1)"
MEMBER_MEMBER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="MEMBER") | .id' | head -n1)"
OWNER_USER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="OWNER") | .user.id' | head -n1)"
MEMBER_USER_ID="$(echo "$BODY" | jq -r '.members[] | select(.role=="MEMBER") | .user.id' | head -n1)"

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" "{\"title\":\"화장실 청소\",\"plannerMemberId\":\"$OWNER_MEMBER_ID\",\"assigneeMemberId\":\"$MEMBER_MEMBER_ID\",\"schedule\":{\"scheduleType\":\"ONCE\",\"startAt\":\"2026-07-22T09:00:00+09:00\",\"timezone\":\"Asia/Seoul\"}}"
expect 201
TODO_ID="$(echo "$BODY" | jq -r '.todo.id')"

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" "{\"title\":\"예약 알림 담당자 검증\",\"plannerMemberId\":\"$OWNER_MEMBER_ID\",\"assigneeMemberId\":\"$MEMBER_MEMBER_ID\",\"schedule\":{\"scheduleType\":\"ONCE\",\"startAt\":\"2026-07-23T09:00:00+09:00\",\"timezone\":\"Asia/Seoul\"}}"
expect 201
ASSIGNEE_TODO_ID="$(echo "$BODY" | jq -r '.todo.id')"

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" "{\"title\":\"지난 할 일 검증\",\"assigneeMemberId\":\"$MEMBER_MEMBER_ID\",\"schedule\":{\"scheduleType\":\"ONCE\",\"startAt\":\"2026-07-21T09:00:00+09:00\",\"timezone\":\"Asia/Seoul\"}}"
expect 201
PAST_TODO_ID="$(echo "$BODY" | jq -r '.todo.id')"

TODO_REQUEST_ID="$(new_uuid)"
api POST "/todos/$TODO_ID/completions" "$MEMBER_TOKEN" "{\"requestId\":\"$TODO_REQUEST_ID\",\"completedAt\":\"2026-07-22T10:00:00+09:00\",\"note\":\"완료\"}"
expect 201
COMPLETION_ID="$(echo "$BODY" | jq -r '.completion.id')"
api POST "/todos/$TODO_ID/completions" "$MEMBER_TOKEN" "{\"requestId\":\"$TODO_REQUEST_ID\",\"completedAt\":\"2026-07-22T10:00:00+09:00\",\"note\":\"완료\"}"
expect 201
assert_json '.completion.id == "'"$COMPLETION_ID"'"'

api POST "/families/$FAMILY_ID/household-items" "$OWNER_TOKEN" '{"name":"기저귀","cycleDays":7}'
expect 201
ITEM_ID="$(echo "$BODY" | jq -r '.householdItem.id')"
PURCHASE_REQUEST_ID="$(new_uuid)"
api POST "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN" "{\"requestId\":\"$PURCHASE_REQUEST_ID\",\"quantity\":1,\"unitPrice\":10000,\"totalAmount\":10000,\"currency\":\"KRW\",\"purchasedAt\":\"2026-07-20T09:00:00+09:00\"}"
expect 201
PURCHASE_ID="$(echo "$BODY" | jq -r '.purchase.id')"
api POST "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN" "{\"requestId\":\"$PURCHASE_REQUEST_ID\",\"quantity\":1,\"unitPrice\":10000,\"totalAmount\":10000,\"currency\":\"KRW\",\"purchasedAt\":\"2026-07-20T09:00:00+09:00\"}"
expect 201
assert_json '.purchase.id == "'"$PURCHASE_ID"'"'

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"월세","amount":850000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":25,"startDate":"2026-01-01","dueTime":"09:00","timezone":"Asia/Seoul","reminders":[{"daysBefore":3,"remindTime":"09:00","enabled":true}]}'
expect 201
FIXED_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"관리비","amount":200000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":26,"startDate":"2026-01-01","dueTime":"09:00","timezone":"Asia/Seoul","reminders":[{"daysBefore":3,"remindTime":"09:00","enabled":true}]}'
expect 201
CANCEL_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"

PAYMENT_REQUEST_ID="$(new_uuid)"
api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":850000,\"currency\":\"KRW\"}"
expect 201
PAYMENT_ID="$(echo "$BODY" | jq -r '.payment.id')"
api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":850000,\"currency\":\"KRW\"}"
expect 201
assert_json '.payment.id == "'"$PAYMENT_ID"'"'

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" "{\"title\":\"가족여행\",\"eventType\":\"TRAVEL\",\"startAt\":\"2026-07-28T09:00:00+09:00\",\"endAt\":\"2026-07-29T18:00:00+09:00\",\"timezone\":\"Asia/Seoul\",\"participantMemberIds\":[\"$MEMBER_MEMBER_ID\"]}"
expect 201
EVENT_ID="$(echo "$BODY" | jq -r '.event.id')"

api POST "/families/$FAMILY_ID/home-manuals" "$OWNER_TOKEN" '{"title":"아기 세탁 방법","category":"육아"}'
expect 201
MANUAL_ID="$(echo "$BODY" | jq -r '.homeManual.id')"

api GET "/templates" "$OWNER_TOKEN"
expect 200
TEMPLATE_ID="$(echo "$BODY" | jq -r '.templates[0].id // empty')"
if [[ -n "$TEMPLATE_ID" ]]; then
  api POST "/families/$FAMILY_ID/templates/$TEMPLATE_ID/apply" "$OWNER_TOKEN"
  expect 201
fi

api GET "/families/$FAMILY_ID/feed?limit=20" "$OWNER_TOKEN"
expect 200
assert_json '[.activities[].activityType] | index("TODO_COMPLETED") != null'
assert_json '[.activities[].activityType] | index("HOUSEHOLD_ITEM_PURCHASED") != null'
assert_json '[.activities[].activityType] | index("FIXED_EXPENSE_PAID") != null'
assert_json '[.activities[].activityType] | index("FAMILY_EVENT_CREATED") != null'
assert_json '[.activities[].activityType] | index("HOME_MANUAL_CREATED") != null'
assert_json '[.activities[] | select(.sourceId=="'"$COMPLETION_ID"'")] | length == 0'
assert_json '[.activities[] | select(.activityType=="TODO_COMPLETED")] | length == 1'
assert_json '[.activities[] | has("sourceAvailable")] | all(. == false)'
TODO_ACTIVITY_ID="$(echo "$BODY" | jq -r '.activities[] | select(.activityType=="TODO_COMPLETED") | .id' | head -n1)"
OWNER_ACTIVITY_ID="$(echo "$BODY" | jq -r '.activities[] | select(.actor.memberId=="'"$OWNER_MEMBER_ID"'") | .id' | head -n1)"

api GET "/families/$FAMILY_ID/feed?limit=2" "$OWNER_TOKEN"
expect 200
NEXT_CURSOR="$(echo "$BODY" | jq -r '.nextCursor // empty')"
if [[ -n "$NEXT_CURSOR" ]]; then
  api GET "/families/$FAMILY_ID/feed?limit=2&cursor=$NEXT_CURSOR" "$OWNER_TOKEN"
  expect 200
fi

api POST "/activities/$OWNER_ACTIVITY_ID/appreciations" "$MEMBER_TOKEN" '{"message":"챙겨줘서 고마워요!"}'
expect 201
APPRECIATION_ID="$(echo "$BODY" | jq -r '.appreciation.id')"
api POST "/activities/$OWNER_ACTIVITY_ID/appreciations" "$MEMBER_TOKEN" '{"message":"챙겨줘서 고마워요!"}'
expect 201
assert_json '.appreciation.id == "'"$APPRECIATION_ID"'"'
APPRECIATION_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Appreciation\" WHERE \"activityId\" = '$OWNER_ACTIVITY_ID' AND \"fromMemberId\" = '$MEMBER_MEMBER_ID' AND \"deletedAt\" IS NULL")"
[[ "$APPRECIATION_COUNT" == "1" ]] || {
  echo "Expected one active appreciation: $APPRECIATION_COUNT" >&2
  exit 1
}
APPRECIATION_NOTIFICATION_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'APPRECIATION_RECEIVED' AND \"sourceId\" = '$OWNER_ACTIVITY_ID' AND \"userId\" = '$OWNER_USER_ID'")"
[[ "$APPRECIATION_NOTIFICATION_COUNT" == "1" ]] || {
  echo "Expected one appreciation notification: $APPRECIATION_NOTIFICATION_COUNT" >&2
  exit 1
}

api GET "/activities/$OWNER_ACTIVITY_ID" "$MEMBER_TOKEN"
expect 200
assert_json '.activity.appreciationCount == 1 and .activity.appreciatedByMe == true'

api POST "/activities/$TODO_ACTIVITY_ID/appreciations" "$MEMBER_TOKEN" '{}'
expect 409

api GET "/families/$FAMILY_ID/feed" "$OUTSIDER_TOKEN"
expect 403
api POST "/activities/$OWNER_ACTIVITY_ID/appreciations" "$OUTSIDER_TOKEN" '{}'
expect 403

api GET "/notifications?limit=50" "$OWNER_TOKEN"
expect 200
assert_json '[.notifications[].notificationType] | index("APPRECIATION_RECEIVED") != null'
OWNER_NOTIFICATION_ID="$(echo "$BODY" | jq -r '.notifications[0].id')"

api GET "/notifications?limit=50" "$MEMBER_TOKEN"
expect 200
assert_json '[.notifications[] | select(.id=="'"$OWNER_NOTIFICATION_ID"'")] | length == 0'

api GET "/notifications/unread-count?familyId=$FAMILY_ID" "$OWNER_TOKEN"
expect 200
assert_json '.unreadCount >= 1'
api PATCH "/notifications/$OWNER_NOTIFICATION_ID/read" "$OWNER_TOKEN"
expect 200
api POST "/notifications/read-all" "$OWNER_TOKEN" "{\"familyId\":\"$FAMILY_ID\"}"
expect 201
api PATCH "/notifications/$OWNER_NOTIFICATION_ID/archive" "$OWNER_TOKEN"
expect 200

api GET "/notifications/$OWNER_NOTIFICATION_ID" "$MEMBER_TOKEN"
expect 403

api POST "/families" "$OUTSIDER_TOKEN" "{\"familyName\":\"다른 가족 $RUN_ID\"}"
expect 201
OTHER_FAMILY_ID="$(echo "$BODY" | jq -r '.family.id')"
api GET "/notifications/unread-count?familyId=$OTHER_FAMILY_ID" "$OWNER_TOKEN"
expect 403
api POST "/notifications/read-all" "$OWNER_TOKEN" "{\"familyId\":\"$OTHER_FAMILY_ID\"}"
expect 403

pushd "$REPO_ROOT" >/dev/null
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-t009-sync-1.json
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-t009-sync-2.json
popd >/dev/null

TODO_ASSIGNEE_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'TODO_DUE' AND \"sourceId\" = '$ASSIGNEE_TODO_ID' AND \"userId\" = '$MEMBER_USER_ID'")"
TODO_OWNER_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'TODO_DUE' AND \"sourceId\" = '$ASSIGNEE_TODO_ID' AND \"userId\" = '$OWNER_USER_ID'")"
[[ "$TODO_ASSIGNEE_COUNT" == "1" && "$TODO_OWNER_COUNT" == "0" ]] || {
  echo "TODO_DUE assignee priority failed: assignee=$TODO_ASSIGNEE_COUNT owner=$TODO_OWNER_COUNT" >&2
  exit 1
}

PAID_FIXED_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'FIXED_EXPENSE_DUE' AND \"sourceId\" = '$FIXED_EXPENSE_ID' AND payload->>'dueDate' = '2026-07-25'")"
[[ "$PAID_FIXED_COUNT" == "0" ]] || {
  echo "Paid fixed expense notification should not exist: $PAID_FIXED_COUNT" >&2
  exit 1
}

PAST_TODO_COUNT="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'TODO_DUE' AND \"sourceId\" = '$PAST_TODO_ID'")"
[[ "$PAST_TODO_COUNT" == "0" ]] || {
  echo "Past todo notification should not exist: $PAST_TODO_COUNT" >&2
  exit 1
}

CANCEL_PENDING_BEFORE="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'FIXED_EXPENSE_DUE' AND \"sourceId\" = '$CANCEL_EXPENSE_ID' AND payload->>'dueDate' = '2026-07-26' AND status = 'PENDING'")"
[[ "$CANCEL_PENDING_BEFORE" -ge 1 ]] || {
  echo "Expected pending fixed expense notification before payment" >&2
  exit 1
}

api POST "/fixed-expenses/$CANCEL_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-07-26\",\"paidAt\":\"2026-07-26T09:10:00+09:00\",\"amount\":200000,\"currency\":\"KRW\"}"
expect 201

pushd "$REPO_ROOT" >/dev/null
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-t009-sync-paid.json
popd >/dev/null

CANCELLED_AFTER_PAYMENT="$(db_scalar "SELECT COUNT(*) FROM \"Notification\" WHERE \"notificationType\" = 'FIXED_EXPENSE_DUE' AND \"sourceId\" = '$CANCEL_EXPENSE_ID' AND payload->>'dueDate' = '2026-07-26' AND status = 'CANCELLED'")"
[[ "$CANCELLED_AFTER_PAYMENT" -ge 1 ]] || {
  echo "Expected fixed expense notification to be cancelled after payment" >&2
  exit 1
}

NULL_DEDUPE_COUNT="$(db_scalar "SELECT (SELECT COUNT(*) FROM \"ActivityLog\" WHERE \"dedupeKey\" IS NULL) + (SELECT COUNT(*) FROM \"Notification\" WHERE \"dedupeKey\" IS NULL)")"
[[ "$NULL_DEDUPE_COUNT" == "0" ]] || {
  echo "Expected no null dedupeKey rows: $NULL_DEDUPE_COUNT" >&2
  exit 1
}

api DELETE "/events/$EVENT_ID" "$OWNER_TOKEN"
expect 200
pushd "$REPO_ROOT" >/dev/null
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-t009-sync-3.json
popd >/dev/null

api PATCH "/fixed-expenses/$FIXED_EXPENSE_ID" "$OWNER_TOKEN" '{"isActive":false}'
expect 200
pushd "$REPO_ROOT" >/dev/null
pnpm --filter @home-catcher/api notifications:sync -- --now=2026-07-22T00:00:00Z >/tmp/homecatcher-t009-sync-4.json
popd >/dev/null

echo "T-009 smoke passed"
