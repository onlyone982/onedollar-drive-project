# One Dollar Drive

굿즈 구매 + 무료 응모(No purchase necessary) 방식의 드림카 시승 경품 추첨 사이트.
GitHub Pages(정적 호스팅) + Firebase(Auth, Firestore, Realtime Database) + PayPal 결제 링크.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 메인 (회차 정보, 샵, 서포터 월, 채팅, FAQ) |
| `free-entry.html` | 무료 응모 (하루 1회, 구글 로그인) |
| `official-rules.html` | 공식 규칙 **초안**. 변호사 검토 전에는 공개하지 마세요 |
| `admin.html` | 관리자: 회차 설정, PayPal 주문 기록, 응모 현황, CSV, 추첨 |
| `js/config.js` | **상품, 회차 기본값, 연락처는 여기서 수정** |
| `js/i18n.js` | 영어/한국어 문구 |
| `firestore.rules`, `database.rules.json` | 보안 규칙 (반드시 배포) |

## 처음 한 번 해야 할 설정

1. **보안 규칙 배포** (가장 중요)
   - Firebase 콘솔 → Firestore → 규칙: `firestore.rules` 내용 붙여넣고 게시
   - Realtime Database → 규칙: `database.rules.json` 내용 붙여넣고 게시
2. **Authentication → 로그인 방법**에서 `Google`, `익명(Anonymous)` 사용 설정
   (익명 로그인은 접속자 수 집계용)
3. **관리자 등록**: `admin.html`에 구글로 로그인하면 UID가 표시됩니다.
   Firestore에서 `admins` 컬렉션 → 문서 ID = 그 UID, 필드는 아무거나(예: `role: "owner"`)
4. **회차 만들기**: `admin.html` → 회차 설정 저장 → 응모를 받을 때 상태를 `open`으로
5. **상품**: `js/config.js`의 `PRODUCTS`를 실제 굿즈로 바꾸고, 상품별 PayPal 결제 링크 입력.
   이미지는 `images/` 폴더에 넣고 `image: "./images/tee.jpg"`처럼 지정
6. **Authorized domains**: Authentication → 설정 → 승인된 도메인에 `onedollardrive.com` 포함 확인

## 운영 흐름 (현재 버전)

1. 구매자가 PayPal 링크로 결제
2. 관리자가 PayPal 대시보드에서 결제 확인 → `admin.html`에 이메일·거래 ID 입력 → 응모권 적립
3. 무료 응모는 `free-entry.html`에서 자동 저장 (하루 1회, 규칙으로 강제)
4. 마감 후 `admin.html` → 응모 내역 불러오기 → 무작위 추첨 (결과는 `draws`에 수정 불가 기록으로 남음)

> 다음 단계: PayPal 웹훅 + Cloud Functions로 2번을 자동화 (Blaze 요금제 필요)

## 데이터 구조 (Firestore)

```
admins/{uid}
rounds/{roundId}                         회차 정보 + raisedUsd, supporterCount
rounds/{roundId}/entries/paypal_{txnId}  구매 응모권 (관리자만 작성)
rounds/{roundId}/freeEntries/{uid}_{YYYYMMDD}  무료 응모
rounds/{roundId}/supporters/{id}         서포터 월 (공개 이름만)
rounds/{roundId}/draws/{id}              추첨 기록
messages/{id}                            채팅
donations/{id}                           예전 원화 후원 데이터 (관리자만 접근)
```

## 출시 전 체크리스트

- [ ] 공식 규칙 변호사 검토, 초안 표시 제거
- [ ] PayPal 스윕스테이크 사전 승인 (Acceptable Use Policy)
- [ ] 상품 ARV를 $5,000 이하로 유지하거나 NY/FL 등록·보증
- [ ] 도메인 이메일 만들고 `config.js`의 `contactEmail` 교체
- [ ] 개인정보처리방침(영문)에 응모 정보 수집 항목 추가
- [ ] Firestore/RTDB 미국 리전 이전 검토 (`config.js`의 `FIRESTORE_DB_ID`, `firebase.js`의 `databaseURL`)
