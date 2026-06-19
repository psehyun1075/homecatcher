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
