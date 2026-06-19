#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3003/api/v1}"
RUN_ID="t008$(date +%s%N)"

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

signup() {
  local email="$1"
  api POST "/auth/signup" "" "{\"email\":\"$email\",\"password\":\"Password123!\",\"name\":\"테스터\"}"
  expect 201
  echo "$BODY" | jq -r '.accessToken'
}

OWNER_TOKEN="$(signup "owner-$RUN_ID@example.com")"
MEMBER_TOKEN="$(signup "member-$RUN_ID@example.com")"
OUTSIDER_TOKEN="$(signup "outsider-$RUN_ID@example.com")"

api POST "/families" "$OWNER_TOKEN" "{\"familyName\":\"T008 검증 $RUN_ID\"}"
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

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" "{\"title\":\"제주도 가족여행\",\"description\":\"여름 가족여행\",\"eventType\":\"TRAVEL\",\"location\":\"제주도\",\"startAt\":\"2026-07-10T09:00:00+09:00\",\"endAt\":\"2026-07-13T18:00:00+09:00\",\"allDay\":false,\"timezone\":\"Asia/Seoul\",\"displayColor\":\"#67A57A\",\"participantMemberIds\":[\"$OWNER_MEMBER_ID\"]}"
expect 201
EVENT_ID="$(echo "$BODY" | jq -r '.event.id')"

api PATCH "/events/$EVENT_ID" "$OWNER_TOKEN" '{"location":"서귀포"}'
expect 200
assert_json '.event.location == "서귀포"'

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" '{"title":"매월 가족회의","eventType":"FAMILY_EVENT","startAt":"2026-07-31T20:00:00+09:00","endAt":"2026-07-31T21:00:00+09:00","timezone":"Asia/Seoul","recurrenceType":"MONTHLY"}'
expect 201

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" '{"title":"8월까지만 반복","eventType":"FAMILY_EVENT","startAt":"2026-08-31T20:00:00+09:00","endAt":"2026-08-31T21:00:00+09:00","timezone":"Asia/Seoul","recurrenceType":"MONTHLY","recurrenceRule":{"endDate":"2026-08-31"}}'
expect 201
LIMITED_EVENT_ID="$(echo "$BODY" | jq -r '.event.id')"

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" '{"title":"잘못된 가족 반복","eventType":"FAMILY_EVENT","startAt":"2026-07-01T09:00:00+09:00","timezone":"Asia/Seoul","recurrenceType":"INTERVAL_DAYS"}'
expect 400

api POST "/families/$FAMILY_ID/events" "$OWNER_TOKEN" '{"title":"이어지는 일정","eventType":"FAMILY_EVENT","startAt":"2026-06-30T09:00:00+09:00","endAt":"2026-07-02T18:00:00+09:00","timezone":"Asia/Seoul"}'
expect 201
OVERLAP_EVENT_ID="$(echo "$BODY" | jq -r '.event.id')"

api GET "/families/$FAMILY_ID/events?from=2026-07-01T00:00:00.000Z&to=2026-07-03T00:00:00.000Z" "$OWNER_TOKEN"
expect 200
assert_json '[.events[].id] | index("'"$OVERLAP_EVENT_ID"'") != null'

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" '{"title":"분리수거","schedule":{"scheduleType":"WEEKLY","daysOfWeek":[5],"startAt":"2026-07-10T20:00:00+09:00","timezone":"Asia/Seoul"}}'
expect 201

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" '{"title":"월수금 운동","schedule":{"scheduleType":"WEEKLY","daysOfWeek":[1,3,5],"startAt":"2026-07-01T07:00:00+09:00","timezone":"Asia/Seoul"}}'
expect 201
MULTI_WEEKLY_TODO_ID="$(echo "$BODY" | jq -r '.todo.id')"

api POST "/families/$FAMILY_ID/todos" "$OWNER_TOKEN" '{"title":"완료될 단발 Todo","schedule":{"scheduleType":"ONCE","startAt":"2026-07-15T09:00:00+09:00","timezone":"Asia/Seoul"}}'
expect 201
ONCE_TODO_ID="$(echo "$BODY" | jq -r '.todo.id')"
api POST "/todos/$ONCE_TODO_ID/completions" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"completedAt\":\"2026-07-15T10:00:00+09:00\"}"
expect 201

api POST "/families/$FAMILY_ID/household-items" "$OWNER_TOKEN" '{"name":"기저귀","cycleDays":20}'
expect 201
ITEM_ID="$(echo "$BODY" | jq -r '.householdItem.id')"
api POST "/household-items/$ITEM_ID/purchases" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"quantity\":1,\"unitPrice\":10000,\"totalAmount\":10000,\"currency\":\"KRW\",\"purchasedAt\":\"2026-06-25T10:00:00+09:00\"}"
expect 201

api POST "/families/$FAMILY_ID/fixed-expenses" "$MEMBER_TOKEN" '{"title":"월세","amount":850000,"recurrenceType":"MONTHLY","dayOfMonth":25,"startDate":"2026-01-01"}'
expect 403

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"월세","amount":850000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":25,"startDate":"2026-01-01","dueTime":"09:00","timezone":"Asia/Seoul","memo":"매월 25일","reminders":[{"daysBefore":3,"remindTime":"09:00","enabled":true},{"daysBefore":0,"remindTime":"09:00","enabled":true}]}'
expect 201
FIXED_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"

api GET "/fixed-expenses/$FIXED_EXPENSE_ID/reminders" "$OWNER_TOKEN"
expect 200
assert_json '.reminders | length == 2'

api PUT "/fixed-expenses/$FIXED_EXPENSE_ID/reminders" "$OWNER_TOKEN" '{"reminders":[{"daysBefore":1,"remindTime":"08:30","enabled":true}]}'
expect 200
assert_json '.reminders[0].daysBefore == 1'

api GET "/families/$FAMILY_ID/calendar/month?month=2026-07&timezone=Asia/Seoul" "$OWNER_TOKEN"
expect 200
assert_json '[.days[] | select(.date=="2026-07-10") | .items[] | select(.sourceType=="FAMILY_EVENT")] | length >= 1'
assert_json '[.days[] | select(.date=="2026-07-01") | .items[] | select(.sourceId=="'"$OVERLAP_EVENT_ID"'")] | length == 1'
assert_json '[.days[] | select(.date=="2026-07-25") | .items[] | select(.sourceType=="FIXED_EXPENSE")] | length == 1'
assert_json '[.days[] | .items[] | select(.sourceType=="TODO")] | length >= 1'
assert_json '[.days[] | select(.date=="2026-07-06") | .items[] | select(.sourceId=="'"$MULTI_WEEKLY_TODO_ID"'")] | length == 1'
assert_json '[.days[] | select(.date=="2026-07-08") | .items[] | select(.sourceId=="'"$MULTI_WEEKLY_TODO_ID"'")] | length == 1'
assert_json '[.days[] | select(.date=="2026-07-10") | .items[] | select(.sourceId=="'"$MULTI_WEEKLY_TODO_ID"'")] | length == 1'
assert_json '[.days[] | .items[] | select(.sourceId=="'"$ONCE_TODO_ID"'")] | length == 0'
assert_json '[.days[] | .items[] | select(.sourceType=="HOUSEHOLD_ITEM")] | length >= 1'
assert_json '([.days[].items[].occurrenceKey] | length) == ([.days[].items[].occurrenceKey] | unique | length)'

api GET "/families/$FAMILY_ID/calendar/month?month=2026-09&timezone=Asia/Seoul&types=FAMILY_EVENT" "$OWNER_TOKEN"
expect 200
assert_json '[.days[].items[] | select(.sourceId=="'"$LIMITED_EVENT_ID"'")] | length == 0'

api GET "/families/$FAMILY_ID/calendar/day?date=2026-02-31&timezone=Asia/Seoul" "$OWNER_TOKEN"
expect 400

api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-07-24\",\"amount\":850000,\"currency\":\"KRW\"}"
expect 400

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"시작일 검증","amount":10000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":10,"startDate":"2026-07-10","dueTime":"09:00","timezone":"Asia/Seoul"}'
expect 201
START_LIMIT_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"
api POST "/fixed-expenses/$START_LIMIT_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-06-10\",\"amount\":10000,\"currency\":\"KRW\"}"
expect 400

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"종료일 검증","amount":10000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":10,"startDate":"2026-01-10","endDate":"2026-07-10","dueTime":"09:00","timezone":"Asia/Seoul"}'
expect 201
END_LIMIT_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"
api POST "/fixed-expenses/$END_LIMIT_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-08-10\",\"amount\":10000,\"currency\":\"KRW\"}"
expect 400

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"월말 검증","amount":31000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":31,"startDate":"2026-01-31","dueTime":"09:00","timezone":"Asia/Seoul"}'
expect 201
MONTH_END_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"
api POST "/fixed-expenses/$MONTH_END_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-02-28\",\"amount\":31000,\"currency\":\"KRW\"}"
expect 201

api POST "/families/$FAMILY_ID/fixed-expenses" "$OWNER_TOKEN" '{"title":"비활성 검증","amount":12000,"currency":"KRW","recurrenceType":"MONTHLY","dayOfMonth":12,"startDate":"2026-01-12","dueTime":"09:00","timezone":"Asia/Seoul"}'
expect 201
INACTIVE_EXPENSE_ID="$(echo "$BODY" | jq -r '.fixedExpense.id')"
api PATCH "/fixed-expenses/$INACTIVE_EXPENSE_ID" "$OWNER_TOKEN" '{"isActive":false}'
expect 200
api POST "/fixed-expenses/$INACTIVE_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-07-12\",\"amount\":12000,\"currency\":\"KRW\"}"
expect 409

PAYMENT_REQUEST_ID="$(new_uuid)"
api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":850000,\"currency\":\"KRW\",\"note\":\"7월 월세 납부\"}"
expect 201
PAYMENT_ID="$(echo "$BODY" | jq -r '.payment.id')"
ACCOUNT_ENTRY_ID="$(echo "$BODY" | jq -r '.payment.accountEntryId')"

api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":850000,\"currency\":\"KRW\",\"note\":\"7월 월세 납부\"}"
expect 201
assert_json '.payment.id == "'"$PAYMENT_ID"'"'

api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$PAYMENT_REQUEST_ID\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:10:00+09:00\",\"amount\":840000,\"currency\":\"KRW\",\"note\":\"7월 월세 납부\"}"
expect 409

api POST "/fixed-expenses/$FIXED_EXPENSE_ID/payments" "$OWNER_TOKEN" "{\"requestId\":\"$(new_uuid)\",\"dueDate\":\"2026-07-25\",\"paidAt\":\"2026-07-25T09:20:00+09:00\",\"amount\":850000,\"currency\":\"KRW\"}"
expect 409

api GET "/accountbook/entries/$ACCOUNT_ENTRY_ID" "$OWNER_TOKEN"
expect 200
assert_json '.accountEntry.categoryCode == "FIXED_EXPENSE"'

api GET "/families/$FAMILY_ID/calendar/month?month=2026-07&timezone=Asia/Seoul&types=FIXED_EXPENSE" "$OWNER_TOKEN"
expect 200
assert_json '[.days[] | select(.date=="2026-07-25") | .items[] | select(.status=="PAID")] | length == 1'

api DELETE "/events/$EVENT_ID" "$OWNER_TOKEN"
expect 200
api GET "/events/$EVENT_ID" "$OWNER_TOKEN"
expect 404

api GET "/families/$FAMILY_ID/calendar/month?month=2026-07" "$OUTSIDER_TOKEN"
expect 403
api GET "/families/$FAMILY_ID/fixed-expenses" "$OUTSIDER_TOKEN"
expect 403

echo "T-008 smoke passed"
