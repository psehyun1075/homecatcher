# 홈캐처 초기 개발 티켓

## T-001 모노레포 초기화
- apps/mobile, apps/api, packages/shared 구조 확정
- docker-compose PostgreSQL/Redis 구성
- API /health 구현

## T-002 Prisma 스키마 초안
- v5 ERD 기준 User, Family, Template, HouseholdItem, ProductLink, Todo, Calendar, FixedExpense, AccountBook, Feed 모델 작성

## T-003 인증/가족 그룹
- 회원가입, 로그인, refresh token, 가족 그룹 생성, 초대 코드 생성/수락

## T-004 템플릿 빠른 시작
- 템플릿 목록/상세/적용 API
- 영유아/신혼/반려동물/맞벌이 기본 데이터 seed

## T-005 생필품 + 상품 URL 자동 미리보기
- Open Graph/JSON-LD 파싱
- product_image_url, product_name, mall_name, last_price 저장
- success/partial/failed/timeout 상태 관리

## T-006 재주문 + 가계부 기록
- 재주문 미리보기
- 주문했어요 확인
- ITEM_PURCHASE_LOG + ACCOUNT_ENTRY 생성
- 가족 피드 생성

## T-007 할 일(Todo) + 우리집 매뉴얼
- 반복 할 일, 담당자, 완료 기록
- 매뉴얼, 단계, 주의사항

## T-008 달력형 가족 캘린더 + 고정지출 알림
- 월간 달력 칩 조회
- 고정지출 등록/납부 완료/알림 설정

## T-009 가계부 월간 요약
- 카테고리별 보기
- 고정지출/생필품 구매 연동 내역 표시

## T-010 모바일 MVP 화면 연결
- 홈, 생필품 URL 등록, 재주문 확인, 캘린더, 고정지출, 가계부, 가족 피드 화면
