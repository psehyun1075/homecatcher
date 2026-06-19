# home-catcher-api

NestJS API server.

## Prisma
```bash
pnpm --filter @home-catcher/api prisma:generate
pnpm --filter @home-catcher/api prisma:migrate
pnpm --filter @home-catcher/api prisma:studio
pnpm --filter @home-catcher/api prisma:reset
```

## 인증 API 예시
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password1234","name":"홍길동"}'

curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password1234"}'

curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

## 가족 그룹 예시
```bash
ACCESS_TOKEN="<accessToken>"

FAMILY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/families \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"familyName":"우리집"}')

FAMILY_ID=$(echo "$FAMILY_RESPONSE" | jq -r '.family.id // .data.family.id // .familyId // .data.familyId // .id // .data.id')

INVITE_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/invites" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

INVITE_CODE=$(echo "$INVITE_RESPONSE" | jq -r '.invite.code // .data.invite.code // .inviteCode // .data.inviteCode // .code // .data.code')

curl "http://localhost:3000/api/v1/invites/$INVITE_CODE"

curl -X POST "http://localhost:3000/api/v1/invites/$INVITE_CODE/accept" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 템플릿 빠른 시작 예시
기본 시스템 템플릿을 먼저 seed 합니다.

```bash
pnpm --filter @home-catcher/api prisma:seed
```

템플릿 목록을 조회합니다.

```bash
curl http://localhost:3000/api/v1/templates \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

템플릿 상세를 조회합니다.

```bash
TEMPLATE_RESPONSE=$(curl -s http://localhost:3000/api/v1/templates \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TEMPLATE_SET_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.templates[0].id // .data.templates[0].id')

curl "http://localhost:3000/api/v1/templates/$TEMPLATE_SET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

가족 그룹에 템플릿을 적용합니다.

```bash
curl -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/templates/$TEMPLATE_SET_ID/apply" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

같은 템플릿을 다시 적용하면 `409 Conflict`가 반환됩니다.

```bash
curl -i -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/templates/$TEMPLATE_SET_ID/apply" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 생필품과 상품 URL 예시
생필품을 생성합니다.

```bash
HOUSEHOLD_ITEM_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/household-items" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"기저귀","category":"육아","unit":"팩","minStock":1,"cycleDays":7,"memo":"2팩 이하가 되면 주문해요"}')

HOUSEHOLD_ITEM_ID=$(echo "$HOUSEHOLD_ITEM_RESPONSE" | jq -r '.householdItem.id // .data.householdItem.id // .id // .data.id')
```

생필품 목록과 상세를 조회합니다.

```bash
curl "http://localhost:3000/api/v1/families/$FAMILY_ID/household-items" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

생필품을 수정하고 삭제합니다.

```bash
curl -X PATCH "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memo":"1팩 이하가 되면 바로 주문해요"}'

curl -X DELETE "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

상품 URL 미리보기를 확인합니다.

```bash
curl -X POST http://localhost:3000/api/v1/product-links/preview \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/product/123"}'
```

상품 URL을 생필품에 저장합니다. 미리보기 추출이 실패해도 URL은 저장됩니다.

```bash
PRODUCT_LINK_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/product-links" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/product/123","isPrimary":true}')

PRODUCT_LINK_ID=$(echo "$PRODUCT_LINK_RESPONSE" | jq -r '.productLink.id // .data.productLink.id // .id // .data.id')
```

상품 URL을 수정하거나 미리보기 정보를 새로고침합니다.

```bash
curl -X PATCH "http://localhost:3000/api/v1/product-links/$PRODUCT_LINK_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isPrimary":true}'

curl -X POST "http://localhost:3000/api/v1/product-links/$PRODUCT_LINK_ID/refresh" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

재주문 미리보기를 조회합니다.

```bash
curl "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/reorder-preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 생필품 재주문 완료와 가계부 연동 예시
구매 규칙을 저장하고 조회합니다. `PUT`은 `OWNER` 또는 `ADMIN`만 사용할 수 있습니다.

```bash
curl -X PUT "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchase-rule" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exactOnly": true,
    "substitutionPolicy": "NOT_ALLOWED",
    "priceLimit": 50000,
    "deliveryCondition": "내일 도착이면 좋아요",
    "reorderThreshold": 1,
    "approvalRequiredAbove": 50000,
    "note": "같은 브랜드 4단계만 주문해요"
  }'

curl "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchase-rule" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

`approvalRequiredAbove`는 API 요청/응답 필드명이며 DB 내부에서는 기존 `approvalThreshold` 필드에 저장됩니다.

재주문 미리보기에서 상품 URL, 최근 실제 구매 금액, 구매 규칙, 확인 필요 여부를 함께 조회합니다.

```bash
curl "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/reorder-preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

쇼핑몰에서 주문한 뒤 앱으로 돌아와 구매 완료를 기록합니다. 같은 `requestId`를 다시 보내도 구매 기록과 가계부 기록은 중복 생성되지 않습니다.

```bash
REQUEST_ID="$(uuidgen)"

curl -X POST "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchases" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$REQUEST_ID\",
    \"productLinkId\": \"$PRODUCT_LINK_ID\",
    \"quantity\": 2,
    \"unitPrice\": 18400,
    \"totalAmount\": 36800,
    \"currency\": \"KRW\",
    \"purchasedAt\": \"2026-06-18T10:00:00+09:00\",
    \"stockAfterPurchase\": 2,
    \"note\": \"기저귀 2팩 주문\",
    \"confirmRuleOverride\": false
  }"

curl -X POST "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchases" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$REQUEST_ID\",
    \"productLinkId\": \"$PRODUCT_LINK_ID\",
    \"quantity\": 2,
    \"unitPrice\": 18400,
    \"totalAmount\": 36800,
    \"currency\": \"KRW\"
  }"
```

구매 기록 목록과 상세를 조회합니다.

```bash
PURCHASES_RESPONSE=$(curl -s "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchases" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

PURCHASE_ID=$(echo "$PURCHASES_RESPONSE" | jq -r '.purchases[0].id // .data.purchases[0].id')

curl "http://localhost:3000/api/v1/purchases/$PURCHASE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

가계부 기본 카테고리는 가족별로 자동 준비됩니다. 생필품 구매는 `HOUSEHOLD_SUPPLIES` 카테고리 지출로 연결됩니다.

```bash
CATEGORIES_RESPONSE=$(curl -s "http://localhost:3000/api/v1/families/$FAMILY_ID/accountbook/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HOUSEHOLD_SUPPLIES_CATEGORY_ID=$(echo "$CATEGORIES_RESPONSE" | jq -r '.categories[] | select(.code=="HOUSEHOLD_SUPPLIES") | .id')
FOOD_CATEGORY_ID=$(echo "$CATEGORIES_RESPONSE" | jq -r '.categories[] | select(.code=="FOOD") | .id')
```

가계부를 직접 입력하고 월간 요약을 조회합니다.

```bash
curl -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/accountbook/entries" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": \"$FOOD_CATEGORY_ID\",
    \"entryType\": \"EXPENSE\",
    \"amount\": 45000,
    \"currency\": \"KRW\",
    \"occurredAt\": \"2026-06-18T10:00:00+09:00\",
    \"title\": \"장보기\",
    \"memo\": \"주말 식재료\"
  }"

curl "http://localhost:3000/api/v1/families/$FAMILY_ID/accountbook/entries?month=2026-06&page=1&limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost:3000/api/v1/families/$FAMILY_ID/accountbook/monthly-summary?month=2026-06" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

가격 제한을 넘었는데 확인하지 않으면 `409 Conflict`가 반환됩니다. `MEMBER`가 `confirmRuleOverride=true`로 우회하려고 하면 `403 Forbidden`이 반환됩니다.

```bash
curl -i -X POST "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchases" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$(uuidgen)\",
    \"totalAmount\": 70000,
    \"currency\": \"KRW\",
    \"confirmRuleOverride\": false
  }"

MEMBER_ACCESS_TOKEN="<memberAccessToken>"

curl -i -X POST "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchases" \
  -H "Authorization: Bearer $MEMBER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$(uuidgen)\",
    \"totalAmount\": 70000,
    \"currency\": \"KRW\",
    \"confirmRuleOverride\": true
  }"
```

`MEMBER`는 자신이 만든 가계부 기록만 수정/삭제할 수 있고, 외부인은 생필품 구매와 가계부 모두 접근할 수 없습니다.

```bash
ACCOUNT_ENTRY_ID="<accountEntryId>"

curl -i -X PATCH "http://localhost:3000/api/v1/accountbook/entries/$ACCOUNT_ENTRY_ID" \
  -H "Authorization: Bearer $MEMBER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memo":"내가 만든 기록이 아니면 403"}'

curl -i -X DELETE "http://localhost:3000/api/v1/accountbook/entries/$ACCOUNT_ENTRY_ID" \
  -H "Authorization: Bearer $MEMBER_ACCESS_TOKEN"

curl -i "http://localhost:3000/api/v1/families/$FAMILY_ID/accountbook/categories" \
  -H "Authorization: Bearer $OUTSIDER_ACCESS_TOKEN"

curl -i "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/purchases" \
  -H "Authorization: Bearer $OUTSIDER_ACCESS_TOKEN"
```

## 할 일(Todo)과 우리집 매뉴얼 예시
할 일은 제목만으로 만들 수 있습니다.

```bash
TODO_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/todos" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"분리수거"}')

TODO_ID=$(echo "$TODO_RESPONSE" | jq -r '.todo.id')
```

담당자와 반복 설정이 있는 할 일을 생성합니다.

```bash
MEMBERS_RESPONSE=$(curl -s "http://localhost:3000/api/v1/families/$FAMILY_ID/members" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

MEMBER_ID=$(echo "$MEMBERS_RESPONSE" | jq -r '.members[0].id')

REPEAT_TODO_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/todos" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"화장실 청소\",
    \"description\": \"세면대와 변기를 청소하고 마지막에 환기해요.\",
    \"category\": \"청소\",
    \"priority\": 2,
    \"estimatedMinutes\": 20,
    \"plannerMemberId\": \"$MEMBER_ID\",
    \"assigneeMemberId\": \"$MEMBER_ID\",
    \"schedule\": {
      \"scheduleType\": \"WEEKLY\",
      \"intervalValue\": 1,
      \"daysOfWeek\": [6],
      \"startAt\": \"2026-06-20T09:00:00+09:00\",
      \"endAt\": null,
      \"timezone\": \"Asia/Seoul\"
    }
  }")

REPEAT_TODO_ID=$(echo "$REPEAT_TODO_RESPONSE" | jq -r '.todo.id')
```

할 일 목록, 상세, 수정, 반복 일정을 조회합니다.

```bash
curl "http://localhost:3000/api/v1/families/$FAMILY_ID/todos?page=1&limit=20&category=청소&completed=false" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -X PATCH "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estimatedMinutes":25}'

curl "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID/schedule" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

`completed=true`는 최종 완료된 단발성 할 일(Todo)을 의미합니다. 활성 반복 Todo는 완료 이력이 있어도 다음 예정일로 계속 관리되므로 `completed=false` 목록에 포함됩니다.

할 일을 완료합니다. 같은 `requestId`와 같은 완료 payload는 기존 완료 기록을 반환하고, 다른 payload면 `409 Conflict`가 반환됩니다.

```bash
TODO_COMPLETION_REQUEST_ID="$(uuidgen)"

COMPLETION_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID/completions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$TODO_COMPLETION_REQUEST_ID\",
    \"completedAt\": \"2026-06-20T10:30:00+09:00\",
    \"note\": \"청소하고 20분 환기했어요.\"
  }")

COMPLETION_ID=$(echo "$COMPLETION_RESPONSE" | jq -r '.completion.id')

curl -X POST "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID/completions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestId\": \"$TODO_COMPLETION_REQUEST_ID\",
    \"completedAt\": \"2026-06-20T10:30:00+09:00\",
    \"note\": \"청소하고 20분 환기했어요.\"
  }"

curl "http://localhost:3000/api/v1/todo-completions/$COMPLETION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID/schedule" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

우리집 매뉴얼을 만들고 단계를 관리합니다.

```bash
MANUAL_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/families/$FAMILY_ID/home-manuals" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "아기 세탁 방법",
    "category": "육아",
    "description": "아기 옷과 손수건은 따로 세탁해요.",
    "isPinned": true,
    "steps": [
      { "title": "아기 옷과 손수건을 분리해요.", "sortOrder": 1 },
      { "title": "저자극 세제를 사용해요.", "description": "섬유유연제는 사용하지 않아요.", "sortOrder": 2 }
    ]
  }')

MANUAL_ID=$(echo "$MANUAL_RESPONSE" | jq -r '.homeManual.id')
STEP_ID=$(echo "$MANUAL_RESPONSE" | jq -r '.homeManual.steps[0].id')

curl -X POST "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID/steps" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"햇볕에 말려요."}'

curl -X PATCH "http://localhost:3000/api/v1/manual-steps/$STEP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"아기 옷과 손수건을 먼저 분리해요.","sortOrder":1}'

STEP_IDS=$(curl -s "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID/steps" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq -c '[.steps[].id]')

curl -X PUT "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID/steps/reorder" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"stepIds\":$STEP_IDS}"
```

매뉴얼을 생필품 또는 할 일과 연결합니다.

```bash
curl -X POST "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID/relations" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"targetType\": \"HOUSEHOLD_ITEM\",
    \"householdItemId\": \"$HOUSEHOLD_ITEM_ID\",
    \"todoTaskId\": null,
    \"note\": \"기저귀 재고 확인할 때 같이 봐요.\"
  }"

curl -X POST "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID/relations" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"targetType\": \"TODO\",
    \"householdItemId\": null,
    \"todoTaskId\": \"$REPEAT_TODO_ID\",
    \"note\": null
  }"

curl "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

`MEMBER`는 자신이 만든 할 일/우리집 매뉴얼만 수정·삭제할 수 있고, 외부인은 접근할 수 없습니다.
템플릿으로 생성된 할 일(Todo)과 우리집 매뉴얼은 템플릿을 적용한 구성원이 만든 데이터로 기록되며, OWNER/ADMIN은 수정·삭제할 수 있고 일반 MEMBER는 본인이 만든 경우에만 수정·삭제할 수 있습니다.

```bash
curl -i -X PATCH "http://localhost:3000/api/v1/todos/$REPEAT_TODO_ID" \
  -H "Authorization: Bearer $MEMBER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"권한 확인"}'

curl -i -X PATCH "http://localhost:3000/api/v1/home-manuals/$MANUAL_ID" \
  -H "Authorization: Bearer $MEMBER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"권한 확인"}'

curl -i "http://localhost:3000/api/v1/families/$FAMILY_ID/todos" \
  -H "Authorization: Bearer $OUTSIDER_ACCESS_TOKEN"

curl -i "http://localhost:3000/api/v1/families/$FAMILY_ID/home-manuals" \
  -H "Authorization: Bearer $OUTSIDER_ACCESS_TOKEN"
```

다른 가족 구성원이 아닌 사용자는 `403 Forbidden`이 반환됩니다.

```bash
OUTSIDER_ACCESS_TOKEN="<outsiderAccessToken>"

curl -i "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID" \
  -H "Authorization: Bearer $OUTSIDER_ACCESS_TOKEN"

curl -i -X POST "http://localhost:3000/api/v1/household-items/$HOUSEHOLD_ITEM_ID/product-links" \
  -H "Authorization: Bearer $OUTSIDER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/product/123"}'
```

## 테스트용 실행 순서
```bash
pnpm install
pnpm --filter @home-catcher/api prisma:generate
pnpm --filter @home-catcher/api prisma:migrate
pnpm --filter @home-catcher/api prisma:seed
pnpm typecheck
pnpm build
pnpm --filter @home-catcher/api dev
```
