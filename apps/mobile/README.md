# HomeCatcher Mobile

Expo 기반 홈캐처 모바일 앱입니다. 현재 모바일 범위는 인증, 가족 온보딩, 템플릿 적용, 홈 최소 연결, 생필품/재주문, Todo 완료, 우리집 매뉴얼 조회입니다.

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

T-010B 수동 테스트에서는 3005 포트를 사용할 수 있습니다.

```bash
CORS_ORIGINS=http://172.16.0.200:8081 \
API_HOST=0.0.0.0 \
API_PORT=3005 \
pnpm --filter @home-catcher/api dev
```

Expo Web 개발 origin이 필요하면 API는 `CORS_ORIGINS`에 comma-separated origin을 지정합니다. 개발 환경에서는 localhost/127.0.0.1 Expo origin을 추가 허용합니다.

## Expo Web 실행

```bash
EXPO_PUBLIC_API_BASE_URL=http://172.16.0.200:3000/api/v1 \
REACT_NATIVE_PACKAGER_HOSTNAME=172.16.0.200 \
pnpm --filter @home-catcher/mobile exec expo start --web --host lan --clear
```

3005 API 서버에 연결하려면 다음처럼 실행합니다.

```bash
EXPO_PUBLIC_API_BASE_URL=http://172.16.0.200:3005/api/v1 \
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

## T-010B 화면

- 생필품 목록, 상세, 재주문 미리보기, 구매 완료 기록
- Todo 목록, 상세, 완료 기록
- 우리집 매뉴얼 목록, 상세, 단계/연결 정보 조회
- 홈 빠른 행동의 실제 탭/화면 연결
- 캘린더 탭은 placeholder를 유지합니다.

상품 URL은 앱 안 WebView로 열지 않고 외부 브라우저 또는 쇼핑몰 앱으로 엽니다. 생필품 구매 완료를 기록하면 백엔드가 구매 기록과 가계부 지출 기록을 함께 남깁니다.

## T-010B 수동 테스트

1. 템플릿이 적용된 가족으로 로그인합니다.
2. 생필품 탭에서 템플릿 생필품이 보이는지 확인합니다.
3. 상품사진이 있으면 이미지가 보이고, 없거나 실패하면 placeholder가 보이는지 확인합니다.
4. 생필품 상세에서 상품 URL이 있는 항목의 `재주문 확인하기`를 엽니다.
5. `상품 보러가기`가 외부 브라우저/앱으로 열리는지 확인합니다.
6. `주문했어요`에서 수량과 금액을 입력하고 구매 완료를 기록합니다.
7. 성공 안내와 함께 구매/가계부 기록이 남는지 API 또는 백엔드 데이터로 확인합니다.
8. Todo 탭에서 목록과 상세를 확인하고 반복 Todo를 완료합니다.
9. 완료 후 nextDueAt과 최근 완료 기록이 갱신되는지 확인합니다.
10. ONCE Todo 완료 후 완료 버튼이 사라지거나 비활성 상태인지 확인합니다.
11. 우리집 탭에서 우리집 매뉴얼 목록과 상세 단계가 보이는지 확인합니다.
12. pull-to-refresh, API 서버 중단 시 오류/재시도, 가족 전환 후 이전 가족 데이터 미노출을 확인합니다.

이번 티켓에서는 생필품 등록·수정, 상품 URL 등록·수정, Todo 등록·수정, 매뉴얼 등록·수정, 본격 캘린더 UI, 가계부 전체 UI, 가족 피드, 고마워요, 알림함 상세 화면을 구현하지 않습니다.
