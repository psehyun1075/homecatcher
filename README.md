# 홈캐처 HomeCatcher

우리집 일을 놓치지 않게 잡아주는 가족 생활 앱입니다.

## 개발 스택
- Mobile: React Native + Expo + TypeScript
- API: NestJS + TypeScript
- DB: PostgreSQL
- ORM: Prisma
- Monorepo: pnpm workspace

## 설치
```bash
pnpm install
```

## 로컬 실행
API 서버:
```bash
pnpm dev:api
```

모바일 앱:
```bash
pnpm dev:mobile
```

둘 다 함께 실행:
```bash
pnpm dev
```

## 검증
```bash
pnpm build
pnpm typecheck
pnpm lint
```

## API Health Check
API 서버가 올라오면 아래 엔드포인트로 확인합니다.
```bash
curl http://172.16.0.200:3000/api/v1/health
```

응답 예시:
```json
{
  "status": "ok",
  "service": "home-catcher-api",
  "appName": "홈캐처",
  "version": "0.1.0"
}
```

## 환경 변수
- `API_HOST`: API 서버가 바인딩할 호스트입니다. 기본값은 `0.0.0.0`입니다.
- `API_PORT`: API 서버 포트입니다. 기본값은 `3000`입니다.
- `EXPO_PUBLIC_API_BASE_URL`: 모바일 앱이 참고할 API 기본 URL입니다. 로컬 개발에서는 실제 접속 가능한 LAN IP 또는 `localhost`를 사용합니다.

자세한 개발 티켓은 `development_tickets.md`를 확인하세요.
