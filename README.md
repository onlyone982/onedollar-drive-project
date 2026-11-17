# One Dollar Drive

굿즈 구매 + 무료 응모(No purchase necessary) 방식의 드림카 시승 경품 추첨 사이트.
GitHub Pages(정적 호스팅) + Firebase(Auth, Firestore, Realtime Database) + PayPal 결제 링크.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 메인 (회차 정보, 샵, 커뮤니티 미리보기, 서포터 월, FAQ) |
| `community.html` | 커뮤니티 "The Garage" (추천/최신/탐색, 레브, 댓글, 공유, 차고 제출) |
| `free-entry.html` | 무료 응모 (하루 1회, 구글 로그인) |
| `official-rules.html` | 공식 규칙 **초안**. 변호사 검토 전에는 공개하지 마세요 |
| `admin.html` | 관리자: 회차·주문·추첨, 차고 제출 승인, 새 게시물, 게시물 관리, 신고, 댓글 권한 |
| `js/account.js` | 로그인(구글/이메일 링크), 연령 확인, 닉네임·아바타 |
| `js/config.js` | **상품, 회차 기본값, 연락처는 여기서 수정** |
| `js/i18n.js` | 영어/한국어 문구 |
| `firestore.rules`, `storage.rules` | 보안 규칙 (반드시 배포) |

## 처음 한 번 해야 할 설정

1. **Blaze 요금제로 전환** (사진 업로드용 Storage에 필요. 미국 리전 버킷은 무료 사용량 있음)
   - Storage 버킷은 `US-CENTRAL1` / `US-EAST1` / `US-WEST1` 중 하나로 만드세요.
2. **보안 규칙 배포** (가장 중요)
   - Firestore → 규칙: `firestore.rules` 붙여넣고 게시
   - Storage → 규칙: `storage.rules` 붙여넣고 게시
   - Realtime Database → 규칙: `database.rules.json` (채팅 제거로 전부 잠금)
3. **Authentication → 로그인 방법**
   - `Google` 사용
   - `이메일/비밀번호` 사용 → 그 안의 **이메일 링크(비밀번호 없는 로그인)** 켜기
   - `익명(Anonymous)`은 더 이상 필요 없으니 끄세요
4. **관리자 등록**: `admin.html`에 구글로 로그인하면 UID가 표시됩니다.
   Firestore에서 `admins` 컬렉션 → 문서 ID = 그 UID, 필드는 아무거나(예: `role: "owner"`)
5. **회차 만들기**: `admin.html` → 회차 설정 저장 → 응모를 받을 때 상태를 `open`으로
6. **상품**: `js/config.js`의 `PRODUCTS`를 실제 굿즈로 바꾸고, 상품별 PayPal 결제 링크 입력.
   이미지는 `images/` 폴더에 넣고 `image: "./images/tee.jpg"`처럼 지정
7. **Authorized domains**: Authentication → 설정 → 승인된 도메인에 `onedollardrive.com` 포함 확인

## 운영 흐름 (현재 버전)

1. 구매자가 PayPal 링크로 결제
2. 관리자가 PayPal 대시보드에서 결제 확인 → `admin.html`에 이메일·거래 ID 입력 → 응모권 적립
3. 무료 응모는 `free-entry.html`에서 자동 저장 (하루 1회, 규칙으로 강제)
4. 마감 후 `admin.html` → 응모 내역 불러오기 → 무작위 추첨 (결과는 `draws`에 수정 불가 기록으로 남음)

> 다음 단계: PayPal 웹훅 + Cloud Functions로 2번을 자동화 (Blaze 요금제 필요)

## 커뮤니티 규칙

- **게시**: 운영자만. 사용자는 "내 차고 제출" → 관리자 승인 → 운영자가 게시(작성자 닉네임 표시)
- **레브(좋아요)**: 프로필이 있는 13세 이상 사용자
- **댓글**: 프로필 + **구매 이력**(`buyers/{이메일}`)이 있는 사용자. 주문 기록 시 자동 부여, 관리자 페이지에서 수동 부여/회수 가능
- **연령**: 13세 미만은 열람만 가능(가입 시 계정 즉시 삭제, 기기에 30일 차단 표시). 13~17세는 커뮤니티만, 응모는 18세 이상
- **아바타**: 구글 프로필 대신 사이트 기본 아바타 8종 (`js/avatars.js`)
- **추천 피드**: 레브 수 × 신선도 × 내가 레브/댓글 단 태그 취향 × 이미 본 글 감점 (브라우저에서 계산)

## 데이터 구조 (Firestore)

```
admins/{uid}
rounds/{roundId}                         회차 정보 + raisedUsd, supporterCount
rounds/{roundId}/entries/paypal_{txnId}  구매 응모권 (관리자만 작성)
rounds/{roundId}/freeEntries/{uid}_{YYYYMMDD}  무료 응모
rounds/{roundId}/supporters/{id}         서포터 월 (공개 이름만)
rounds/{roundId}/draws/{id}              추첨 기록
users/{uid}                              닉네임, 아바타, 연령대(teen/adult)
usernames/{닉네임 소문자}                 닉네임 중복 방지
buyers/{이메일}                           댓글 권한(구매 이력)
posts/{id}                               커뮤니티 게시물 (likeCount, tags, featured)
posts/{id}/likes/{uid}                   레브
posts/{id}/comments/{id}                 댓글
garageSubmissions/{id}                   차고 제출 (pending/approved/rejected)
reports/{id}                             댓글 신고
messages/{id}                            (예전 채팅, 사용 안 함)
donations/{id}                           예전 원화 후원 데이터 (관리자만 접근)
```

## 출시 전 체크리스트

- [ ] 공식 규칙 변호사 검토, 초안 표시 제거
- [ ] PayPal 스윕스테이크 사전 승인 (Acceptable Use Policy)
- [ ] 상품 ARV를 $5,000 이하로 유지하거나 NY/FL 등록·보증
- [ ] 도메인 이메일 만들고 `config.js`의 `contactEmail` 교체
- [ ] 개인정보처리방침(영문)에 응모 정보 수집 항목 추가
- [ ] `og-image.jpg` 교체 (현재 이미지에 "DONATION" 문구가 있음)
- [ ] 개인정보처리방침에 커뮤니티(닉네임, 댓글, 제출 사진) 항목 추가
- [ ] Firestore 미국 리전 이전 검토 (`config.js`의 `FIRESTORE_DB_ID`, `firebase.js`의 `databaseURL`)
