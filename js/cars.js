// ============================================================
// 차고 데이터 — 배경 테마 + 차량
// ------------------------------------------------------------
// ■ 배경(테마) 추가하는 법
//   1) 사진을 assets/themes/ 폴더에 넣습니다. (가로 1672 × 세로 941, 차량 배치가 같은 사진)
//   2) 아래 THEMES 목록에 한 줄을 추가합니다.
//   → 차량 윤곽선은 모든 테마가 함께 쓰므로 다시 그릴 필요가 없습니다.
//   → 어떤 사진에서 차가 조금 어긋나면 adjust 로 그 사진에서만 살짝 옮기거나 늘이면 됩니다.
//      dx/dy: 좌우·상하 이동(px), sx/sy: 가로·세로 배율 (1 = 그대로)
//   → 차 배치나 각도가 아예 다른 사진은 outlines 로 그 사진 전용 윤곽선을 적습니다. (airport 참고)
//   ※ 테마 버튼에 보이는 이름은 id 가 아니라 name 입니다.
//
// ■ 차량 윤곽선(outline)
//   사진 크기(1672×941) 기준 좌표를 시계 방향으로 이은 점들입니다.
//   윤곽선이 차에서 벗어나 보이면 해당 점의 숫자를 조금씩 바꾸세요.
//
// ■ 제원(headline, specs) — 여러 언어
//   label / 왼쪽 이름은 번역 키입니다: power, zero100, top, engine, torque, drive, weight
//   (번역은 js/i18n.js 와 js/lang/ 의 "spec.키" 에 있습니다)
//   값은 "720N·m" 처럼 그냥 적거나, { en: "...", ko: "...", ja: "..." } 처럼 언어별로 적습니다.
//   언어별 값이 없는 언어는 en(영어) 값이 표시됩니다.
// ============================================================

// 여러 차가 같이 쓰는 제원 문구
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

export const IMAGE_SIZE = { width: 1672, height: 941 };

export const THEMES = [
  {
    id: "airport",
    name: "Airport",          // ← 테마 버튼에 보이는 이름은 이 값입니다
    src: "assets/themes/airport.webp",
    swatch: "linear-gradient(135deg, #d9dce1, #2b2d31)",
    // 이 사진은 차 배치·각도가 다른 사진과 달라서 윤곽선을 따로 그렸습니다.
    // (outlines 에 적은 차는 아래 CARS 의 outline 대신 이 점들을 씁니다)
    outlines: {
      svj: [
        [92, 684], [103, 645], [112, 607], [130, 582], [168, 560], [168, 546], [190, 542], [210, 543],
        [263, 515], [319, 506], [389, 506], [452, 513], [484, 513], [575, 518], [578, 530], [550, 532],
        [564, 554], [581, 575], [584, 610], [582, 648], [568, 663], [515, 673], [473, 690], [410, 690],
        [326, 687], [200, 688], [130, 687],
      ],
      gt3rs: [
        [643, 690], [640, 646], [643, 597], [648, 575], [660, 561], [660, 542], [671, 534], [671, 514],
        [671, 501], [740, 500], [756, 490], [830, 487], [901, 490], [920, 500], [1028, 500], [1028, 513],
        [1002, 534], [1002, 547], [1006, 570], [1014, 592], [1020, 619], [1022, 647], [1020, 690],
        [940, 695], [830, 696], [720, 695],
      ],
      "812": [
        [1088, 659], [1081, 631], [1081, 575], [1088, 551], [1102, 537], [1088, 523], [1092, 516],
        [1158, 516], [1158, 525], [1176, 511], [1221, 502], [1291, 502], [1354, 511], [1410, 530],
        [1442, 544], [1463, 544], [1466, 558], [1508, 572], [1543, 589], [1561, 610], [1568, 645],
        [1582, 688], [1564, 693], [1480, 695], [1375, 693], [1270, 691], [1221, 694], [1204, 680],
        [1151, 670], [1116, 663],
      ],
    },
  },
  {
    id: "forest",
    name: "Forest",
    src: "assets/themes/forest.webp",
    swatch: "linear-gradient(135deg, #1f3b2a, #6f8f4e)",
  },
  {
    id: "ocean",
    name: "Ocean",
    src: "assets/themes/ocean.webp",
    swatch: "linear-gradient(135deg, #f2a65a, #2b6c9e)",
  },
  {
    id: "tokyo",
    name: "Tokyo City",
    src: "assets/themes/tokyo.webp",
    swatch: "linear-gradient(135deg, #ff3fa4, #3a4bff)",
    adjust: { "812": { sy: 0.91 } },
  },
  {
    id: "f1",
    name: "F1 Circuit",
    src: "assets/themes/f1.webp",
    swatch: "linear-gradient(135deg, #e10600, #1b1f3a)",
    adjust: { "812": { sy: 0.91 } },
  },
  {
    id: "lake",
    name: "Lake",
    src: "assets/themes/lake.webp",
    swatch: "linear-gradient(135deg, #8fd0ff, #2f5d3a)",
  },
];

export const CARS = [
  {
    id: "svj",
    brand: "Lamborghini",
    model: "Aventador SVJ",
    outline: [
      [73, 671], [80, 632], [100, 570], [124, 543], [172, 524], [190, 511], [206, 514],
      [222, 506], [268, 482], [354, 474], [450, 482], [505, 477], [585, 476], [588, 489],
      [565, 498], [576, 520], [583, 540], [594, 575], [596, 622], [582, 639], [545, 645],
      [498, 664], [474, 673], [425, 678], [270, 680], [130, 677],
    ],
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
    outline: [
      [652, 678], [648, 617], [655, 567], [669, 542], [680, 512], [684, 495], [686, 474],
      [993, 474], [995, 495], [998, 514], [1013, 542], [1026, 578], [1029, 617], [1026, 675],
      [963, 682], [719, 682],
    ],
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
    outline: [
      [1102, 556], [1107, 620], [1124, 632], [1158, 637], [1225, 671], [1266, 670], [1293, 671],
      [1394, 678], [1495, 674], [1590, 670], [1610, 661], [1600, 617], [1600, 583], [1586, 550],
      [1556, 529], [1509, 523], [1468, 523], [1465, 506], [1448, 504], [1428, 496], [1374, 472],
      [1266, 467], [1212, 472], [1178, 475], [1150, 482], [1112, 487], [1110, 512],
    ],
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
