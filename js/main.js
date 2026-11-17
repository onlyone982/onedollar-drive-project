import { CARS, THEMES, IMAGE_SIZE } from "./cars.js";
import { t, getLang, onLangChange } from "./common.js";
import "./header.js";

// JS가 켜져 있다는 표시 (스크롤 등장 애니메이션 등에 사용)
document.documentElement.classList.add("js");

const SVG_NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ============================================================
   도우미: 점 목록 → 부드러운 곡선 경로, 테마별 보정, 영역 계산
   ============================================================ */
function smoothPath(pts, t = 0.75) {
  const n = pts.length;
  const p = (i) => pts[(i + n) % n];
  let d = `M${p(0)[0]} ${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2);
    const c1x = x1 + ((x2 - x0) / 6) * t, c1y = y1 + ((y2 - y0) / 6) * t;
    const c2x = x2 - ((x3 - x1) / 6) * t, c2y = y2 - ((y3 - y1) / 6) * t;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2} ${y2}`;
  }
  return d + " Z";
}

function bbox(pts) {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}

// 테마 전용 윤곽선(outlines)이 있으면 그것을, 없으면 공통 윤곽선을 씀.
// 그다음 adjust 값으로 살짝 옮기거나 늘림 (기준점: 차 바닥 가운데)
function adjustedOutline(car, theme) {
  const base = theme.outlines?.[car.id] || car.outline;
  const a = theme.adjust?.[car.id];
  if (!a) return base;
  const b = bbox(base);
  const { dx = 0, dy = 0, sx = 1, sy = 1 } = a;
  return base.map(([x, y]) => [
    +(b.cx + (x - b.cx) * sx + dx).toFixed(1),
    +(b.maxY + (y - b.maxY) * sy + dy).toFixed(1),
  ]);
}

const pctX = (x) => `${(x / IMAGE_SIZE.width) * 100}%`;
const pctY = (y) => `${(y / IMAGE_SIZE.height) * 100}%`;

/* ============================================================
   블랙 스티커 만들기 (언어가 바뀌면 fillSticker 로 다시 채움)
   ============================================================ */
const carName = (car) => `${car.brand} ${car.model}`;
// 제원 값: 그냥 글자이거나 { en: "...", ko: "..." } 처럼 언어별로 적을 수 있음
const pick = (v) => (typeof v === "string" ? v : v?.[getLang()] ?? v?.en ?? "");
// 제원 이름: cars.js 의 "power" 같은 키 → 번역 (번역이 없으면 그대로 표시)
const specLabel = (k) => t(`spec.${k}`).replace(/^spec\./, "");

function buildSticker(car) {
  const sticker = document.createElement("div");
  sticker.className = "sticker";
  sticker.id = `sticker-${car.id}`;
  sticker.setAttribute("role", "dialog");
  sticker.hidden = true;
  sticker.addEventListener("click", (e) => e.stopPropagation()); // 스티커 안을 눌러도 닫히지 않게
  fillSticker(car, sticker);
  return sticker;
}

function fillSticker(car, sticker) {
  sticker.setAttribute("aria-label", t("g.specsOf", { car: carName(car) }));

  const head = document.createElement("div");
  head.className = "sticker-head";
  const brand = document.createElement("p");
  brand.className = "sticker-brand";
  brand.textContent = car.brand;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "sticker-close";
  close.setAttribute("aria-label", t("common.close"));
  close.textContent = "×";
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    closeSticker(true);
  });
  head.append(brand, close);

  const title = document.createElement("p");
  title.className = "sticker-model";
  title.textContent = car.model;

  const stats = document.createElement("dl");
  stats.className = "sticker-stats";
  car.headline.forEach(({ label, value, unit }) => {
    const box = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    const sm = document.createElement("small");
    dt.textContent = specLabel(label);
    sm.textContent = unit;
    dd.append(value, sm);
    box.append(dt, dd);
    stats.appendChild(box);
  });

  const rows = document.createElement("dl");
  rows.className = "sticker-rows";
  car.specs.forEach(([k, v]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = specLabel(k);
    dd.textContent = pick(v);
    rows.append(dt, dd);
  });

  const hint = document.createElement("p");
  hint.className = "sticker-hint";
  hint.textContent = t("g.arrowHint");

  sticker.replaceChildren(head, title, stats, rows, hint);
}

/* ============================================================
   차량 윤곽선(SVG) + 점·이름표·스티커 + 아래 선택 버튼
   ============================================================ */
const svg = document.getElementById("outlines");
const hotspotsEl = document.getElementById("hotspots");
const switchEl = document.getElementById("carSwitch");
let openIndex = -1;

svg.innerHTML = `
  <defs>
    <filter id="outlineGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
  </defs>`;

const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
};

CARS.forEach((car, i) => {
  // 1) 윤곽선 묶음 (누를 수 있는 버튼 역할)
  const g = svgEl("g", {
    class: "car-shape",
    tabindex: "0",
    role: "button",
    "aria-label": t("g.viewSpecs", { car: carName(car) }),
    "aria-expanded": "false",
    "aria-controls": `sticker-${car.id}`,
  });
  const dim = svgEl("path", { class: "shape-dim", "fill-rule": "evenodd" });
  const glow = svgEl("path", { class: "shape-glow", filter: "url(#outlineGlow)" });
  const line = svgEl("path", { class: "shape-line" });
  const flow = svgEl("path", { class: "shape-flow", pathLength: "1000" });
  const hit = svgEl("path", { class: "shape-hit" });
  flow.style.animationDelay = `${-i * 0.9}s`;
  g.append(dim, glow, line, flow, hit);
  svg.appendChild(g);

  const toggle = () => (openIndex === i ? closeSticker(true) : openSticker(i));
  g.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });
  g.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  });
  const showLabel = (on) => label.classList.toggle("is-show", on);
  g.addEventListener("pointerenter", () => showLabel(true));
  g.addEventListener("pointerleave", () => showLabel(false));
  g.addEventListener("focus", () => showLabel(true));
  g.addEventListener("blur", () => showLabel(false));

  // 2) 반짝이는 점 + 이름표 + 스티커 (HTML)
  const pin = document.createElement("span");
  pin.className = "hotspot-pin";
  pin.style.animationDelay = `${i * 0.4}s`;
  const label = document.createElement("span");
  label.className = "hotspot-label";
  label.textContent = car.model;
  const sticker = buildSticker(car);
  hotspotsEl.append(pin, label, sticker);

  // 3) 아래쪽 선택 버튼
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "switch-btn glow";
  pill.setAttribute("aria-pressed", "false");
  pill.innerHTML = `<span class="switch-no">0${i + 1}</span><span class="switch-name"></span>`;
  pill.querySelector(".switch-name").textContent = car.model;
  pill.addEventListener("click", (e) => {
    e.stopPropagation();
    openIndex === i ? closeSticker(false) : openSticker(i, { scroll: true });
  });
  switchEl.appendChild(pill);

  Object.assign(car, { _g: g, _paths: { dim, glow, line, flow, hit }, _pin: pin, _label: label, _sticker: sticker, _pill: pill });
});

// 현재 테마 기준으로 윤곽선과 점·스티커 위치를 그림
function layoutCars(theme) {
  CARS.forEach((car) => {
    const pts = adjustedOutline(car, theme);
    const d = smoothPath(pts);
    const { dim, glow, line, flow, hit } = car._paths;
    dim.setAttribute("d", `M0 0H${IMAGE_SIZE.width}V${IMAGE_SIZE.height}H0Z ${d}`);
    [glow, line, flow, hit].forEach((p) => p.setAttribute("d", d));

    const b = bbox(pts);
    car._box = b;
    car._pin.style.left = pctX(b.cx);
    car._pin.style.top = pctY(b.minY + b.h * 0.45);
    car._label.style.left = pctX(b.cx);
    car._label.style.top = pctY(b.minY);
    car._sticker.style.left = pctX(b.cx);
    car._sticker.style.top = pctY(b.cy);
  });
}

function openSticker(i, { scroll = false } = {}) {
  closeSticker(false);
  const car = CARS[i];
  openIndex = i;
  car._g.setAttribute("aria-expanded", "true");
  car._g.classList.add("is-active");
  car._pill.setAttribute("aria-pressed", "true");
  svg.classList.add("has-active");
  hotspotsEl.classList.add("has-active");
  car._pin.classList.add("is-hidden");
  car._sticker.hidden = false;
  requestAnimationFrame(() => car._sticker.classList.add("is-open")); // 등장 애니메이션
  if (scroll) scrollToCar(car);
}

function closeSticker(returnFocus) {
  if (openIndex < 0) return;
  const car = CARS[openIndex];
  car._g.setAttribute("aria-expanded", "false");
  car._g.classList.remove("is-active");
  car._pill.setAttribute("aria-pressed", "false");
  svg.classList.remove("has-active");
  hotspotsEl.classList.remove("has-active");
  car._pin.classList.remove("is-hidden");
  car._sticker.classList.remove("is-open");
  car._sticker.hidden = true;
  if (returnFocus) car._g.focus({ preventScroll: true });
  openIndex = -1;
}

// 바깥 클릭 / ESC → 닫기, ← → → 다른 차량
document.addEventListener("click", () => closeSticker(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSticker(true);
  if (openIndex < 0) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = (openIndex + step + CARS.length) % CARS.length;
    openSticker(next, { scroll: true });
    CARS[next]._g.focus({ preventScroll: true });
  }
});

/* ============================================================
   배경 테마 고르기
   ============================================================ */
const photosEl = document.getElementById("photos");
const pickerEl = document.getElementById("themePicker");
const THEME_KEY = "odd-garage-theme";
const preloaded = new Set();
let currentTheme = THEMES[0];

function preload(theme) {
  if (preloaded.has(theme.id)) return;
  preloaded.add(theme.id);
  const img = new Image();
  img.src = theme.src;
}

function themeAlt(theme) {
  return t("g.photoAlt", { theme: theme.name });
}

function setTheme(id, { animate = true } = {}) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  if (theme === currentTheme && animate) return;
  currentTheme = theme;
  try { localStorage.setItem(THEME_KEY, theme.id); } catch {}

  pickerEl.querySelectorAll(".theme-btn").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.theme === theme.id));
  });
  layoutCars(theme);

  const oldImg = photosEl.querySelector(".garage-photo.is-current");
  if (!animate || reduceMotion) {
    oldImg.src = theme.src;
    oldImg.alt = themeAlt(theme);
    return;
  }
  // 새 사진을 위에 올리고, 다 불러오면 서서히 나타나게 한 뒤 예전 사진 제거
  const img = new Image();
  img.className = "garage-photo";
  img.width = IMAGE_SIZE.width;
  img.height = IMAGE_SIZE.height;
  img.alt = themeAlt(theme);
  img.decoding = "async";
  img.src = theme.src;
  img.decode().catch(() => {}).then(() => {
    if (currentTheme !== theme) return; // 그 사이 다른 테마를 골랐으면 취소
    photosEl.appendChild(img);
    requestAnimationFrame(() => {
      img.classList.add("is-current");
      oldImg?.classList.remove("is-current");
      setTimeout(() => {
        photosEl.querySelectorAll(".garage-photo:not(.is-current)").forEach((el) => el.remove());
      }, 1000);
    });
  });
}

THEMES.forEach((theme) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "theme-btn glow";
  btn.dataset.theme = theme.id;
  btn.setAttribute("role", "radio");
  btn.setAttribute("aria-checked", "false");
  btn.innerHTML = `<span class="theme-swatch" aria-hidden="true"></span><span class="theme-name"></span>`;
  btn.querySelector(".theme-swatch").style.background = theme.swatch;
  btn.querySelector(".theme-name").textContent = theme.name;
  btn.addEventListener("pointerenter", () => preload(theme));
  btn.addEventListener("focus", () => preload(theme));
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setTheme(theme.id);
  });
  pickerEl.appendChild(btn);
});

let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch {}
setTheme(savedTheme || THEMES[0].id, { animate: false });

/* ============================================================
   모바일: 가로 스크롤 (처음엔 가운데 차량, 선택 시 해당 차량으로 이동)
   ============================================================ */
const scroller = document.getElementById("garageScroll");
const firstPhoto = photosEl.querySelector(".garage-photo");

function scrollToCar(car) {
  if (scroller.scrollWidth <= scroller.clientWidth) return;
  const center = (car._box.cx / IMAGE_SIZE.width) * scroller.scrollWidth;
  scroller.scrollTo({ left: center - scroller.clientWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
}
function centerGarage() {
  if (scroller.scrollWidth > scroller.clientWidth) {
    scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
  }
}
if (firstPhoto.complete) centerGarage();
else firstPhoto.addEventListener("load", centerGarage, { once: true });

/* ============================================================
   마우스를 따라 차고가 아주 살짝 움직이는 효과 (PC만)
   ============================================================ */
const garage = document.getElementById("garage");
const stageInner = document.getElementById("stageInner");
if (finePointer && !reduceMotion) {
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  const tick = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    stageInner.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) scale(1.03)`;
    raf = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(tick) : null;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  stageInner.style.transform = "scale(1.03)";
  garage.addEventListener("mousemove", (e) => {
    const r = garage.getBoundingClientRect();
    tx = -((e.clientX - r.left) / r.width - 0.5) * 16;
    ty = -((e.clientY - r.top) / r.height - 0.5) * 8;
    kick();
  });
  garage.addEventListener("mouseleave", () => { tx = 0; ty = 0; kick(); });
}

/* ============================================================
   언어가 바뀌면 스티커·윤곽선 이름·사진 설명을 다시 씀
   (상단 메뉴·모바일 메뉴는 js/header.js 에서 처리)
   ============================================================ */
onLangChange(() => {
  CARS.forEach((car) => {
    fillSticker(car, car._sticker);
    car._g.setAttribute("aria-label", t("g.viewSpecs", { car: carName(car) }));
  });
  photosEl.querySelectorAll(".garage-photo").forEach((img) => { img.alt = themeAlt(currentTheme); });
});

/* ============================================================
   스크롤하면 아래 섹션이 부드럽게 나타남
   ============================================================ */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("is-visible");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.2 });
  revealEls.forEach((el, i) => {
    el.style.setProperty("--i", i % 4);
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}
