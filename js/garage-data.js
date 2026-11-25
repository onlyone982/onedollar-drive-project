// ============================================================
//  드림 개러지 데이터 — 테마(빈 차고) / 차량 / 기본 차고
//  코드를 몰라도 "이미지 넣기 + 아래 목록에 한 칸 추가"로 늘릴 수 있습니다.
// ------------------------------------------------------------
//  ■ 차량 추가하는 법
//    1) assets/cars/{차id}/ 폴더를 만들고 투명 배경 이미지를 넣습니다. (WebP 권장, 가로 1200px 정도)
//         left.webp   = 왼쪽 자리용 (차 앞이 화면 오른쪽, 즉 가운데를 향함)
//         center.webp = 가운데 자리용 (정면)
//         right.webp  = 오른쪽 자리용 (차 앞이 화면 왼쪽, 즉 가운데를 향함)
//       → 세 대가 모두 가운데를 바라보는 구도입니다.
//         thumb.webp  = 목록용 작은 이미지 (가로 360 × 세로 200)
//       → 차 둘레의 빈 공간은 잘라내고, 바퀴 바닥이 이미지 아래 끝에 닿게 해 주세요.
//       → 이미지를 좌우 반전해서 쓰지 마세요. (로고·글자가 뒤집힘)
//       → 어떤 자리용 이미지가 아직 없으면 그 칸을 지우면 됩니다. 목록에서 "준비 중"으로 보입니다.
//    2) 아래 CARS 에서 { id: "gt3rs", ... } 덩어리를 통째로 복사해 붙여넣고
//       id(폴더 이름과 같게), brand, model, category, images 경로, 제원을 고칩니다.
//       category: "supercar"(슈퍼카) / "sports"(스포츠카) / "suv" / "gt" 중 하나
//
//  ■ 테마(빈 차고) 추가하는 법
//    1) assets/garages/{테마id}.webp 로 빈 차고 사진을 넣습니다. (가로 1672 × 세로 941)
//    2) 아래 THEMES 에서 덩어리 하나를 복사해 id, name, image 를 고칩니다.
//    3) 자리 위치(slots)는 주소 끝에 ?debug=1 을 붙여 열면 끌어서 맞출 수 있고,
//       화면에 나온 값을 [복사]해서 slots 자리에 붙여넣으면 됩니다.
//       x, y = 차 바닥 가운데의 위치(사진 기준 %), width = 차 폭(사진 가로의 %)
//    4) grade = 그 차고 조명에 차 색감을 맞추는 값 (모든 차에 똑같이 적용)
//       brightness/contrast/saturate: 1 = 그대로, 0.9 = 10% 낮춤
//       tint: 덧씌울 색, tintStrength: 0(없음) ~ 0.3(강함)
//       reflection: 바닥이 반짝이면 true (차가 바닥에 비침)
// ============================================================

export const IMAGE_SIZE = { width: 1672, height: 941 };

export const THEMES = [
  {
    id: "forest",
    name: { en: "Forest", ko: "숲" },
    image: "assets/garages/forest.webp",
    swatch: "linear-gradient(135deg, #1f3b2a, #6f8f4e)",
    slots: {
      left:   { x: 21, y: 73.5, width: 30 },
      center: { x: 50, y: 74.5, width: 24 },
      right:  { x: 79, y: 73.5, width: 30 },
    },
    grade: { brightness: 0.96, contrast: 1.04, saturate: 0.95, tint: "#ffb36b", tintStrength: 0.1 },
    reflection: true,
  },
  {
    id: "ocean",
    name: { en: "Ocean", ko: "바다" },
    image: "assets/garages/ocean.webp",
    swatch: "linear-gradient(135deg, #f2a65a, #2b6c9e)",
    slots: {
      left:   { x: 21, y: 73.5, width: 30 },
      center: { x: 50, y: 74.5, width: 24 },
      right:  { x: 79, y: 73.5, width: 30 },
    },
    grade: { brightness: 0.96, contrast: 1.04, saturate: 1, tint: "#ffb877", tintStrength: 0.16 },
    reflection: true,
  },
  {
    id: "tokyo",
    name: { en: "Tokyo City", ko: "도쿄 시티" },
    image: "assets/garages/tokyo.webp",
    swatch: "linear-gradient(135deg, #ff3fa4, #3a4bff)",
    slots: {
      left:   { x: 21, y: 73.5, width: 30 },
      center: { x: 50, y: 74.5, width: 24 },
      right:  { x: 79, y: 73.5, width: 30 },
    },
    grade: { brightness: 0.8, contrast: 1.08, saturate: 1.1, tint: "#9a4dff", tintStrength: 0.26 },
    reflection: true,
  },
  {
    id: "f1",
    name: { en: "F1 Circuit", ko: "F1 서킷" },
    image: "assets/garages/f1.webp",
    swatch: "linear-gradient(135deg, #e10600, #1b1f3a)",
    slots: {
      left:   { x: 21, y: 73.5, width: 30 },
      center: { x: 50, y: 74.5, width: 24 },
      right:  { x: 79, y: 73.5, width: 30 },
    },
    grade: { brightness: 0.8, contrast: 1.08, saturate: 0.95, tint: "#3f5bff", tintStrength: 0.18 },
    reflection: true,
  },
  {
    id: "airport",
    name: { en: "Airport", ko: "공항" },
    image: "assets/garages/airport.webp",
    swatch: "linear-gradient(135deg, #d9dce1, #2b2d31)",
    slots: {
      left:   { x: 21, y: 73.5, width: 30 },
      center: { x: 50, y: 74.5, width: 24 },
      right:  { x: 79, y: 73.5, width: 30 },
    },
    grade: { brightness: 0.92, contrast: 1.04, saturate: 0.92, tint: "#a9bcd6", tintStrength: 0.06 },
    reflection: true,
  },
];

/* ----- 여러 차가 같이 쓰는 제원 문구 (언어별) ----- */
const V12_NA = {
  en: "6.5L naturally aspirated V12", ko: "6.5L V12 자연흡기", ja: "6.5L V12 自然吸気",
  zh: "6.5L 自然吸气 V12", es: "V12 atmosférico de 6,5 L", it: "V12 aspirato 6,5 L",
  de: "6,5-l-V12-Saugmotor", fr: "V12 atmosphérique 6,5 L",
};
const DRY_1525 = {
  en: "1,525 kg (dry)", ko: "1,525kg (건조)", ja: "1,525kg（乾燥）", zh: "1,525 kg（干重）",
  es: "1.525 kg (en seco)", it: "1.525 kg (a secco)", de: "1.525 kg (trocken)", fr: "1 525 kg (à sec)",
};
const gearbox = (layout, type) => ({
  en: `${layout} · 7-speed ${type}`, ko: `${layout} · 7단 ${type}`, ja: `${layout} · 7速 ${type}`,
  zh: `${layout} · 7速 ${type}`, es: `${layout} · ${type} de 7 vel.`, it: `${layout} · ${type} a 7 marce`,
  de: `${layout} · 7-Gang-${type}`, fr: `${layout} · ${type} 7 rapports`,
});

// 제원: headline = 스티커 위쪽 큰 숫자 3개, specs = 아래 줄. 왼쪽 이름은 번역 키입니다.
//   (power, zero100, top, engine, torque, drive, weight — 번역은 js/i18n.js 의 "spec.키")
//   값은 그냥 글자로 적거나 { en: "...", ko: "..." } 처럼 언어별로 적습니다.
export const CARS = [
  {
    id: "aventador-svj",
    brand: "Lamborghini",
    model: "Aventador SVJ",
    category: "supercar",
    images: {
      left: "assets/cars/aventador-svj/left.webp",
      center: "assets/cars/aventador-svj/center.webp",
      right: "assets/cars/aventador-svj/right.webp",
      thumb: "assets/cars/aventador-svj/thumb.webp",
    },
    headline: [
      { label: "power", value: "770", unit: "CV" },
      { label: "zero100", value: "2.8", unit: "s" },
      { label: "top", value: "350+", unit: "km/h" },
    ],
    specs: [
      ["engine", V12_NA],
      ["torque", "720N·m"],
      ["drive", gearbox("AWD", "ISR")],
      ["weight", DRY_1525],
    ],
  },
  {
    id: "gt3rs",
    brand: "Porsche",
    model: "911 GT3 RS",
    category: "sports",
    images: {
      left: "assets/cars/gt3rs/left.webp",
      center: "assets/cars/gt3rs/center.webp",
      right: "assets/cars/gt3rs/right.webp",
      thumb: "assets/cars/gt3rs/thumb.webp",
    },
    headline: [
      { label: "power", value: "525", unit: "PS" },
      { label: "zero100", value: "3.2", unit: "s" },
      { label: "top", value: "296", unit: "km/h" },
    ],
    specs: [
      ["engine", {
        en: "4.0L flat-six", ko: "4.0L 수평대향 6기통", ja: "4.0L 水平対向6気筒", zh: "4.0L 水平对置六缸",
        es: "Bóxer de 6 cilindros 4,0 L", it: "Boxer 6 cilindri 4,0 L", de: "4,0-l-Sechszylinder-Boxer", fr: "Flat-six 4,0 L",
      }],
      ["torque", "465N·m"],
      ["drive", gearbox("RR", "PDK")],
      ["weight", "1,450kg (DIN)"],
    ],
  },
  {
    id: "812",
    brand: "Ferrari",
    model: "812 Superfast",
    category: "supercar",
    images: {
      left: "assets/cars/812/left.webp",
      center: "assets/cars/812/center.webp",
      right: "assets/cars/812/right.webp",
      thumb: "assets/cars/812/thumb.webp",
    },
    headline: [
      { label: "power", value: "800", unit: "cv" },
      { label: "zero100", value: "2.9", unit: "s" },
      { label: "top", value: "340+", unit: "km/h" },
    ],
    specs: [
      ["engine", V12_NA],
      ["torque", "718N·m"],
      ["drive", gearbox("FR", "DCT")],
      ["weight", DRY_1525],
    ],
  },
];

// 처음 방문한 사람에게 보여줄 차고 (자리용 이미지가 있는 차만 쓰세요. 비우려면 "")
export const DEFAULT_GARAGE = { theme: "forest", left: "aventador-svj", center: "gt3rs", right: "812" };
