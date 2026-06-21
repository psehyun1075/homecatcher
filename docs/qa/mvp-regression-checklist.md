# HomeCatcher MVP Regression Checklist

이 문서는 홈캐처 MVP의 API, 모바일 화면, 권한, 오류, 자동/수동 검증 범위를 정리합니다.

| 기능명 | 관련 API | 모바일 화면 | 정상 시나리오 | 권한 시나리오 | 오류 시나리오 | 자동 테스트 | 수동 테스트 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 인증 | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | 로그인, 회원가입, Splash | 가입, 로그인, refresh 기반 세션 복원, logout | 비로그인 API 접근 차단 | 중복 이메일, 잘못된 비밀번호, 만료 refresh | `mvp-full-regression.sh` | Web/Native 세션 복원 |
| 가족/초대 | `GET/POST /families`, `GET /families/:id/members`, `POST /families/:id/invites`, `GET /invites/:code`, `POST /invites/:code/accept` | 가족 온보딩, 가족 선택, 가족 초대하기 | 가족 생성, 초대 코드 발급, 초대 수락, 가족 전환 | 외부인은 가족 데이터 접근 불가 | 만료/잘못된 초대 코드, 저장소 실패 | `mvp-full-regression.sh` | 초대 코드 복사/공유 |
| 템플릿 | `GET /templates`, `GET /templates/:id`, `POST /families/:familyId/templates/:templateId/apply` | 템플릿 선택/상세 | 템플릿 목록, 상세, 적용, 건너뛰기 | 가족 구성원만 적용 | 이미 적용된 템플릿 409 처리 | `mvp-full-regression.sh` | 템플릿 카드 UI |
| 생필품/상품 URL/구매 | `GET/POST /families/:familyId/household-items`, `GET /household-items/:id`, `POST /household-items/:id/product-links`, `GET /household-items/:id/reorder-preview`, `POST /household-items/:id/purchases` | 생필품 목록/상세, 재주문, 구매 완료 | 상품 URL 저장, 재주문 미리보기, 구매 완료 | 외부인 접근 403 | requestId 충돌 409, 가격 확인 필요 409 | `mvp-full-regression.sh` | 외부 상품 링크 열기 |
| Todo | `GET/POST /families/:familyId/todos`, `GET /todos/:id`, `POST /todos/:id/completions` | Todo 목록/상세/완료 | 반복/단발 Todo 조회, 완료 기록, nextDueAt 갱신 | 외부인 접근 403, MEMBER 수정 제한 | 완료 requestId 충돌 409 | `mvp-full-regression.sh` | 반복 Todo UX |
| 우리집 매뉴얼 | `GET/POST /families/:familyId/home-manuals`, `GET /home-manuals/:id`, `GET /home-manuals/:id/steps`, `GET /home-manuals/:id/relations` | 매뉴얼 목록/상세 | 매뉴얼 생성/조회, 단계/연결 조회 | 외부인 접근 403 | 삭제된 매뉴얼 404 | `mvp-full-regression.sh` | 단계 정렬/이미지 fallback |
| 캘린더/가족 일정 | `GET /families/:familyId/calendar/month`, `GET /families/:familyId/calendar/day`, `POST /families/:familyId/events`, `GET /events/:id` | 월간 달력, 일간 상세, 일정 생성/상세 | 일정 생성, 월간/일간 표시, Todo/생필품/고정지출 통합 | 외부인 접근 403 | 잘못된 날짜 400, 삭제 원본 접근 404 | `mvp-full-regression.sh` | 월 이동, 작은 화면 달력 |
| 고정지출/납부 | `GET/POST /families/:familyId/fixed-expenses`, `GET /fixed-expenses/:id`, `POST /fixed-expenses/:id/payments` | 고정지출 목록/등록/상세/납부 | 고정지출 등록, 캘린더 예정일, 납부, PAID 반영 | MEMBER 생성 403, 외부인 접근 403 | 임의 dueDate 400, requestId 충돌 409 | `mvp-full-regression.sh` | 캘린더 occurrence에서 납부 |
| 가계부 | `GET /families/:familyId/accountbook/categories`, `GET/POST /families/:familyId/accountbook/entries`, `GET /families/:familyId/accountbook/monthly-summary` | 가계부 홈, 내역, 지출 입력 | 구매/납부 자동 기록, 직접 입력, 월간 요약 | 외부인 접근 403, MEMBER 수정 제한 | 잘못된 카테고리/금액 400 | `mvp-full-regression.sh` | 카테고리별 표시 |
| 가족 피드/고마워요 | `GET /families/:familyId/feed`, `GET /activities/:id`, `POST/GET /activities/:id/appreciations`, `DELETE /appreciations/:id` | 우리집 소식, 활동 상세 | 주요 활동 자동 기록, 고마워요 생성/취소 | 외부인 403, 자기 활동 409 | 중복 고마워요 idempotent | `mvp-full-regression.sh` | 두 계정 UX |
| 인앱 알림 | `GET /notifications`, `GET /notifications/unread-count`, `GET/PATCH /notifications/:id/read`, `POST /notifications/read-all`, `PATCH /notifications/:id/archive` | 알림함, 알림 상세 | 목록, 읽음, 모두 읽음, 보관, 관련 화면 이동 | 다른 사용자 알림 접근 차단 | read 실패 비차단 안내 | `mvp-full-regression.sh` | sync 후 예약 알림 표시 |

## 자동 테스트 범위

- `apps/api/scripts/smoke/mvp-full-regression.sh`
- owner/member/outsider 세 계정 기반 권한 검증
- 구매/Todo 완료/고정지출 납부 idempotency
- ActivityLog 중복 방지
- 고마워요 중복 방지
- Notification 사용자 격리와 sync 중복 방지

## 수동 테스트가 필요한 범위

- Expo Web/Native 화면 배치와 터치 영역
- 외부 상품 URL 열기
- Native clipboard/share
- 앱 재시작 후 SecureStore 세션 복원
- 실제 모바일 브라우저와 Expo Go 네트워크 오류 UX
