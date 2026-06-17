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

## 테스트용 실행 순서
```bash
pnpm install
pnpm --filter @home-catcher/api prisma:generate
pnpm --filter @home-catcher/api prisma:migrate
pnpm typecheck
pnpm build
pnpm --filter @home-catcher/api dev
```
