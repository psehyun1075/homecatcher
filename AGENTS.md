# AGENTS.md

## Project
프로젝트명: 홈캐처 / HomeCatcher / home-catcher

## Product Concept
홈캐처는 가족 안에서 한 사람이 떠안고 있던 기획노동을 앱이 대신 구조화하고,
가족 구성원이 함께 실행할 수 있게 만드는 가정 운영 앱입니다.

핵심은 다음과 같습니다.
- 누가 기억하지 않아도 되게 만든다.
- 누가 매번 설명하지 않아도 되게 만든다.
- 누가 시키지 않아도 실행할 수 있게 만든다.
- 사용자가 처음부터 많은 설정을 하지 않아도 되게 한다.
- V1/V1.5에서는 광고, 제휴, 카드/계좌 자동연동, 영수증 사진 첨부를 제외한다.

## User-facing Terms
- 앱명: 홈캐처
- 생필품, 할 일(Todo), 우리집 매뉴얼, 가족 피드, 고마워요, 고정지출 알림, 가계부를 사용한다.
- 오류 메시지는 친근한 한국어로 작성한다.

## Scope
포함:
- 회원가입/로그인
- 가족 그룹 생성/초대
- 템플릿 기반 빠른 시작
- 생필품 등록
- 상품 URL 등록 및 상품명/상품사진/쇼핑몰명/가격 자동 미리보기
- 생필품 재주문
- 생필품 구매 후 가계부 기록
- 할 일(Todo)
- 우리집 매뉴얼
- 달력형 가족 캘린더
- 고정지출 알림
- 가계부
- 가족 피드
- 고마워요
- 푸시/인앱 알림

제외:
- 광고
- 제휴 클릭 로그
- 카드/계좌 자동연동
- 영수증 사진 첨부
- 금융상품 추천
- V2 기능

## Tech Stack
- Mobile: React Native + Expo + TypeScript
- API: NestJS + TypeScript
- DB: PostgreSQL
- ORM: Prisma
- Package manager: pnpm

## Engineering Rules
- 작은 개발 티켓 단위로 작업한다.
- API, DB schema, mobile UI 변경은 관련 검증을 함께 수행한다.
- 사용자 입력 부담을 늘리는 UI를 피한다.
- 고급 설정은 기본적으로 접거나 선택 입력으로 둔다.
- 비밀번호, 토큰, API 키는 절대 하드코딩하지 않는다.
- .env.example을 유지한다.

## Done Criteria
- TypeScript type check 통과
- lint 통과
- 관련 API 실행 가능
- Prisma schema/migration 정리
- 변경 파일 목록과 검증 결과 요약
