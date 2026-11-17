// ============================================================
//  Pit Stop 데이터 — What if... 질문 / 드림카 목록 / 링크
//  코드를 몰라도 아래 목록에 항목을 복사해 붙여넣으면 바로 화면에 나옵니다.
// ------------------------------------------------------------
//  ■ 질문(QUESTIONS) 추가하는 법
//    1) 아래 { id: "delivery", ... } 덩어리를 통째로 복사해서 바로 아래에 붙여넣습니다.
//       (덩어리 끝의 "}," 쉼표까지 함께 복사하세요)
//    2) id 를 겹치지 않는 영어 단어로 바꿉니다. (예: "coffee")
//    3) question = 질문 문장, unit = 결과에서 환산할 물건, counter = 한국어 세는 말(잔, 개, 마리…)
//       unitPriceUsd = 그 물건 1개 가격(달러), maxUsd = 한 달에 입력할 수 있는 최대 금액
//    → 질문은 위에서부터 순서대로 한 장씩 나옵니다.
//    ※ 담배, 술, 월급처럼 민감한 질문은 넣지 않습니다. (13세 이상 사용자)
//
//  ■ 드림카(DREAM_CARS) 추가하는 법
//    1) { id: "gt3rs", ... } 덩어리를 통째로 복사해 붙여넣고 id 를 바꿉니다. (예: "svj")
//    2) name = 화면에 보이는 이름, aliases = 검색에 걸릴 다른 이름들(대소문자·띄어쓰기 상관없음)
//    3) priceUsd = 가격(달러, 쉼표 없이 숫자만), priceNote = 가격 기준 설명, asOf = 확인한 연-월
//    4) image = 차 사진 경로 (assets/cars/ 폴더에 넣고 "assets/cars/svj.webp" 처럼 적기). 비우면 실루엣
//    5) personality = Carscope 결과에 나오는 성격 한 줄
//    → Carscope 는 이 목록 중에서 하나를 골라 보여줍니다. 차가 많을수록 결과가 다양해집니다.
//
//  ■ en 은 영어, ko 는 한국어입니다. 다른 언어(ja, zh, es …)를 추가하지 않으면 영어로 보입니다.
// ============================================================

// 한국어 화면에서 원화 대략값을 보여줄 때 쓰는 고정 환율 (1달러 = 1,400원)
export const KRW_PER_USD = 1400;

export const QUESTIONS = [
  {
    id: "delivery",
    question: {
      en: "How much do you spend on delivery and eating out per month?",
      ko: "한 달에 배달·외식에 얼마를 쓰나요?",
    },
    unit: { en: "fried chickens", ko: "치킨" }, // 결과에서 "치킨 약 N마리"처럼 환산
    counter: { en: "", ko: "마리" },            // 한국어 세는 말 (영어는 비워 둠)
    unitPriceUsd: 20,
    maxUsd: 5000,
  },
];
// 담배, 술, 월급 같은 질문은 넣지 않는다(13세 이상 사용자, 민감 정보).

// ※ 가격은 샘플입니다. 실제 가격을 확인한 뒤 priceUsd 와 asOf 를 고쳐 주세요.
export const DREAM_CARS = [
  {
    id: "gt3rs",
    name: "Porsche 911 GT3 RS",
    aliases: ["gt3 rs", "gt3rs", "911 gt3 rs", "지티쓰리"],
    priceUsd: 241300, // 샘플 값 — 확인 필요
    priceNote: { en: "US base MSRP", ko: "미국 신차 기본가" },
    asOf: "2026-11",
    image: "", // 나중에 assets/cars/ 에 이미지를 넣고 경로를 적는다. 비어 있으면 실루엣 아이콘 표시
    personality: {
      en: "Precise, a little obsessive, and happiest when everything is dialed in.",
      ko: "정확하고 약간 집요한 타입. 모든 게 딱 맞아떨어질 때 가장 행복합니다.",
    },
  },
];

export const PITSTOP_LINKS = {
  carRequestForm: "", // 목록에 없는 차 요청용 구글폼 주소. 비어 있으면 요청 버튼 숨김
};
