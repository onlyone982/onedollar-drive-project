// ============================================================
//  One Dollar Drive — site configuration
//  이 파일만 고치면 대부분의 내용(상품, 회차 기본값, 연락처)이 바뀝니다.
// ============================================================

export const SITE = {
  name: "One Dollar Drive",
  // TODO: 도메인 메일(예: hello@onedollardrive.com)을 만들면 교체하세요.
  //       현재 주소는 도메인 철자(onedollar)와 다릅니다(onedolla).
  contactEmail: "onedolladrive@gmail.com",
  sponsorName: "Yellow Horizon",          // 사업자 영문 상호 (사업자등록상 표기와 맞추세요)
  sponsorRepresentative: "Myeongjun Lee", // 대표자 영문 표기
  sponsorAddress: "1815-1 Haenggu-dong, Wonju-si, Gangwon-do, Republic of Korea",
  businessLicense: "598-43-01196",
  onlineBusinessLicense: "2023-강원원주-01485호",
  privacyUrl: "https://sites.google.com/view/onedollardrive-privacy-en/홈",
  termsUrl: "https://sites.google.com/view/onedollardrive-policy/홈",
  youtubeEmbed: "https://www.youtube.com/embed/DZAdVY9kKbc",
};

// Firestore 데이터베이스 ID.
// 미국 리전(nam5 등)에 새 데이터베이스를 만들었다면 그 이름으로 바꾸세요.
// 기존 기본 데이터베이스를 쓰려면 "(default)" 그대로 두면 됩니다.
export const FIRESTORE_DB_ID = "(default)";

// 현재 진행 중인 회차 ID. Firestore의 rounds/{ROUND_ID} 문서를 읽습니다.
export const ROUND_ID = "round-1";

// Firestore에 회차 문서가 아직 없을 때 화면에 보여줄 기본값.
// 관리자 페이지(admin.html)에서 저장하면 Firestore 값이 우선합니다.
export const ROUND_DEFAULTS = {
  number: 1,
  status: "upcoming",            // upcoming | open | closed | drawn
  carName: "Porsche 911 GT3 RS (992)",
  prizeTitle: "A full day behind the wheel of a Porsche 911 GT3 RS",
  prizeArvUsd: 3500,             // 상품 예상 가치. $5,000 이하로 두면 NY/FL 등록·보증 의무를 피할 수 있습니다.
  milestoneUsd: 5000,            // 커뮤니티 마일스톤(진행률 바). 상품 지급 조건이 아닙니다.
  startsAt: null,                // ISO 문자열, 예: "2026-12-01T00:00:00-05:00"
  endsAt: null,
  drawAt: null,
};

// 커뮤니티 수치(서포터 수, 접속자 수)는 이 값 이상일 때만 노출합니다.
// 0명 표시는 신뢰를 떨어뜨리기 때문입니다.
export const MIN_VISIBLE_COUNT = 5;

// 무료 응모(No purchase necessary): 하루에 받을 수 있는 응모권 수.
// 가장 저렴한 상품 구매로 받는 응모권 수와 같게 두는 것이 일반적입니다.
export const FREE_ENTRIES_PER_DAY = 1;

// ------------------------------------------------------------
//  Shop — 판매 상품
//  paypalLink: PayPal 대시보드에서 상품별 결제 링크를 만들어 넣으세요.
//  image: /images/ 폴더에 이미지를 넣고 경로를 적으면 표시됩니다(없으면 아이콘).
//  TODO: 아래 상품은 예시입니다. 실제 의류 라인업으로 교체하세요.
// ------------------------------------------------------------
export const PRODUCTS = [
  {
    id: "sticker",
    name: { en: "Dream Ticket Sticker", ko: "드림 티켓 스티커" },
    desc: { en: "Die-cut vinyl sticker. The cheapest way in.", ko: "다이컷 비닐 스티커. 가장 가볍게 참여하는 방법." },
    priceUsd: 1,
    entries: 1,
    icon: "🎟️",
    image: "",
    paypalLink: "https://www.paypal.com/ncp/payment/8A53863TW23CA",
  },
  {
    id: "cap",
    name: { en: "Pit Lane Cap", ko: "피트 레인 캡" },
    desc: { en: "Embroidered logo cap.", ko: "자수 로고 캡 모자." },
    priceUsd: 25,
    entries: 25,
    icon: "🧢",
    image: "",
    paypalLink: "",
  },
  {
    id: "tee",
    name: { en: "Redline Tee", ko: "레드라인 티셔츠" },
    desc: { en: "Heavyweight cotton tee, limited run per round.", ko: "회차별 한정 헤비웨이트 면 티셔츠." },
    priceUsd: 45,
    entries: 50,
    icon: "👕",
    image: "",
    paypalLink: "",
  },
];

// ------------------------------------------------------------
//  Community
// ------------------------------------------------------------
export const COMMUNITY = {
  maxCommentLength: 300,
  maxSubmissionPhotos: 5,
  // 1차 금칙어 필터(클라이언트). 최종 판단은 운영자의 신고 처리입니다. 필요에 따라 추가하세요.
  blockedWords: [
    "fuck", "shit", "bitch", "cunt", "nigger", "faggot", "porn", "nude", "sex",
    "kill yourself", "kys", "terror", "isis", "trump", "biden", "democrat", "republican",
    "씨발", "시발", "병신", "좆", "섹스", "야동",
  ],
};

// 아바타 개수 (js/avatars.js, firestore.rules 와 맞춤)
export const AVATAR_COUNT = 8;
