# HomeCatcher Mobile

Expo 기반 홈캐처 모바일 앱입니다. T-010A 범위는 인증, 가족 온보딩, 템플릿 적용, 홈 화면 최소 연결입니다.

## 설치

```bash
pnpm install
```

## 환경변수

`apps/mobile/.env.example`을 참고해 Expo 실행 환경에 `EXPO_PUBLIC_API_BASE_URL`을 지정합니다.

```bash
EXPO_PUBLIC_API_BASE_URL=http://172.16.0.200:3000/api/v1
```

실제 `.env` 또는 `.env.local`은 커밋하지 않습니다. Native 세션은 `expo-secure-store`에 저장합니다. Web 미리보기의 세션 저장은 개발 편의를 위한 `localStorage` adapter를 사용하며, 운영용 Web 인증 구현은 이번 범위가 아닙니다.

저장소가 일시적으로 실패해도 현재 메모리 세션과 선택한 가족은 유지됩니다. 다만 로그인 정보를 저장하지 못한 경우 앱을 다시 열면 다시 로그인해야 할 수 있습니다. 가족 전환 시에는 이전 가족의 family scope query cache를 제거해 다른 가족 데이터가 잠시 보이지 않게 처리합니다.

## API 서버 실행

```bash
API_HOST=0.0.0.0 API_PORT=3000 pnpm --filter @home-catcher/api dev
```

Expo Web 개발 origin이 필요하면 API는 `CORS_ORIGINS`에 comma-separated origin을 지정합니다. 개발 환경에서는 localhost/127.0.0.1 Expo origin을 추가 허용합니다.

## Expo Web 실행

```bash
EXPO_PUBLIC_API_BASE_URL=http://172.16.0.200:3000/api/v1 \
REACT_NATIVE_PACKAGER_HOSTNAME=172.16.0.200 \
pnpm --filter @home-catcher/mobile exec expo start --web --host lan --clear
```

## Expo Go / LAN 실행

```bash
EXPO_PUBLIC_API_BASE_URL=http://172.16.0.200:3000/api/v1 \
REACT_NATIVE_PACKAGER_HOSTNAME=172.16.0.200 \
pnpm --filter @home-catcher/mobile exec expo start --host lan --clear
```

Expo Go에서 테스트할 때는 휴대폰과 API 서버가 같은 네트워크에 있어야 합니다. `EXPO_PUBLIC_API_BASE_URL`에는 휴대폰에서 접근 가능한 LAN IP와 `/api/v1` 경로를 포함합니다. iOS/Android 모두 회원가입, 로그인, 가족 생성, 템플릿 건너뛰기 또는 적용, 앱 재실행 후 세션 복원을 확인합니다.

## 수동 테스트 순서

1. 회원가입 후 홈캐처 세션이 생성되는지 확인합니다.
2. 로그아웃 후 같은 계정으로 로그인합니다.
3. 앱 재실행 시 refresh token으로 세션이 복원되는지 확인합니다.
4. 가족이 없으면 `우리집 만들기` 또는 `초대 코드가 있어요` 흐름으로 진입합니다.
5. 가족 생성 후 템플릿 목록과 상세를 확인합니다.
6. 템플릿 적용 또는 `지금은 건너뛰기` 후 홈 화면에 진입합니다.
7. 여러 가족이 있으면 `우리집` 탭에서 가족을 전환합니다.
8. API 서버를 중단했을 때 각 섹션이 오류와 재시도를 표시하는지 확인합니다.

이번 티켓에서는 생필품 CRUD, Todo 완료, 매뉴얼 CRUD, 본격 캘린더 UI, 가계부, 가족 피드, 고마워요, 알림함 상세 화면을 구현하지 않습니다.
