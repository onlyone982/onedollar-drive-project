// 메인 페이지: 드림 개러지 (빈 차고 + 자리마다 고른 차를 겹쳐 놓기)
// 데이터(테마·차량·기본 차고)는 js/garage-data.js 에 있습니다.
import { THEMES, CARS, DEFAULT_GARAGE, IMAGE_SIZE } from "./garage-data.js";
import { t, getLang, onLangChange, toast } from "./common.js";
import "./header.js";

// JS가 켜져 있다는 표시 (스크롤 등장 애니메이션 등에 사용)
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const params = new URLSearchParams(location.search);
const DEBUG = params.get("debug") === "1"; // 자리 위치 맞추기 도구 (?debug=1)

const SLOT_IDS = ["left", "center", "right"];
const URL_KEYS = { theme: "t", left: "l", center: "c", right: "r" };
const STORE_KEY = "odd-garage-v2";
const OLD_THEME_KEY = "odd-garage-theme";
const STAGE_RATIO = IMAGE_SIZE.width / IMAGE_SIZE.height;
const EMPTY_RATIO = 2.4; // 빈 자리 상자의 가로:세로

const $ = (id) => document.getElementById(id);
const L = (v) => (v == null ? "" : typeof v === "string" ? v : v[getLang()] ?? v.en ?? "");
const carById = (id) => CARS.find((c) => c.id === id) || null;
const themeById = (id) => THEMES.find((th) => th.id === id) || null;
const carName = (car) => `${car.brand} ${car.model}`;
const slotName = (slot) => t(`gar.slot.${slot}`);
const canPark = (car, slot) => !!car?.images?.[slot];

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  el.append(...kids.flat().filter((x) => x != null && x !== false));
  return el;
}

/* ============================================================
   상태: 테마 + 3자리 (주소 ?t=&l=&c=&r= > 저장값 > 기본 차고)
   ============================================================ */
function clean(s) {
  const out = { theme: themeById(s.theme) ? s.theme : (themeById(DEFAULT_GARAGE.theme) ? DEFAULT_GARAGE.theme : THEMES[0].id) };
  const used = new Set();
  for (const slot of SLOT_IDS) {
    const car = carById(s[slot]);
    out[slot] = car && canPark(car, slot) && !used.has(car.id) ? car.id : "";
    if (out[slot]) used.add(out[slot]);
  }
  return out;
}

function loadState() {
  if (Object.values(URL_KEYS).some((k) => params.has(k))) {
    const s = {};
    for (const [field, key] of Object.entries(URL_KEYS)) s[field] = params.get(key) || "";
    return { state: clean(s), fromUrl: true };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && typeof saved === "object") return { state: clean(saved), fromUrl: false };
  } catch {}
  let theme = DEFAULT_GARAGE.theme;
  try { theme = localStorage.getItem(OLD_THEME_KEY) || theme; } catch {}
  return { state: clean({ ...DEFAULT_GARAGE, theme }), fromUrl: false };
}

const loaded = loadState();
const state = loaded.state;
let urlSynced = loaded.fromUrl; // 주소에 차고가 들어 있으면 바꿀 때마다 주소도 갱신

function garageUrl() {
  const u = new URL(location.href);
  for (const [field, key] of Object.entries(URL_KEYS)) {
    if (state[field]) u.searchParams.set(key, state[field]);
    else u.searchParams.delete(key);
  }
  u.hash = "";
  return u;
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  urlSynced = true;
  history.replaceState(null, "", garageUrl());
}

/* ============================================================
   DOM 참조
   ============================================================ */
const garage = $("garage");
const stageInner = $("stageInner");
const photosEl = $("photos");
const slotsEl = $("slots");
const hotspotsEl = $("hotspots");
const pickerEl = $("themePicker");
const switchEl = $("carSwitch");
const scroller = $("garageScroll");

/* ============================================================
   블랙 스티커 (제원 + 바꾸기/빼기)
   ============================================================ */
const pick = (v) => (typeof v === "string" ? v : v?.[getLang()] ?? v?.en ?? "");
const specLabel = (k) => t(`spec.${k}`).replace(/^spec\./, "");

function fillSticker(slot) {
  const s = slots[slot];
  const car = carById(state[slot]);
  if (!car) { s.sticker.replaceChildren(); return; }
  s.sticker.setAttribute("aria-label", t("g.specsOf", { car: carName(car) }));

  const close = h("button", {
    type: "button", class: "sticker-close", "aria-label": t("common.close"), text: "×",
    onclick: (e) => { e.stopPropagation(); closeSticker(true); },
  });
  const stats = h("dl", { class: "sticker-stats" },
    car.headline.map(({ label, value, unit }) =>
      h("div", {}, h("dt", { text: specLabel(label) }), h("dd", {}, value, h("small", { text: unit })))));
  const rows = h("dl", { class: "sticker-rows" },
    car.specs.flatMap(([k, v]) => [h("dt", { text: specLabel(k) }), h("dd", { text: pick(v) })]));
  const actions = h("div", { class: "sticker-actions" },
    h("button", { type: "button", class: "sticker-btn", text: t("gar.change"), onclick: (e) => { e.stopPropagation(); closeSticker(false); openPicker(slot); } }),
    h("button", { type: "button", class: "sticker-btn is-ghost", text: t("gar.remove"), onclick: (e) => { e.stopPropagation(); removeCar(slot); } }));

  s.sticker.replaceChildren(
    h("div", { class: "sticker-head" }, h("p", { class: "sticker-brand", text: car.brand }), close),
    h("p", { class: "sticker-model", text: car.model }),
    stats, rows, actions,
    h("p", { class: "sticker-hint", text: t("g.arrowHint") }));
}

/* ============================================================
   자리 3개 만들기: 그림자 → 반사 → 차량(+색 보정) → 누르는 버튼
   ============================================================ */
const slots = {};

SLOT_IDS.forEach((slot, i) => {
  const img = h("img", { class: "car-img", alt: "", decoding: "async", draggable: "false" });
  const tint = h("span", { class: "car-tint", "aria-hidden": "true" });
  const reflectImg = h("img", { alt: "", decoding: "async", draggable: "false" });
  const add = h("span", { class: "slot-add", "aria-hidden": "true" }, h("b", { text: "+" }), h("span", { class: "slot-add-text" }));
  const btn = h("button", {
    type: "button", class: "slot-hit", "aria-expanded": "false", "aria-controls": `sticker-${slot}`,
    onclick: (e) => { e.stopPropagation(); onSlotPress(slot); },
  }, add);
  const el = h("div", { class: "slot is-empty", "data-slot": slot },
    h("span", { class: "slot-shadow", "aria-hidden": "true" }),
    h("div", { class: "slot-reflect", "aria-hidden": "true" }, reflectImg),
    h("div", { class: "slot-car" }, img, tint),
    h("span", { class: "slot-lines", "aria-hidden": "true" }),
    btn);
  slotsEl.appendChild(el);

  const pin = h("span", { class: "hotspot-pin", style: `animation-delay:${i * 0.4}s` });
  const label = h("span", { class: "hotspot-label" });
  const sticker = h("div", { class: "sticker", id: `sticker-${slot}`, role: "dialog", hidden: true, onclick: (e) => e.stopPropagation() });
  hotspotsEl.append(pin, label, sticker);

  const showLabel = (on) => label.classList.toggle("is-show", on && !!state[slot]);
  btn.addEventListener("pointerenter", () => showLabel(true));
  btn.addEventListener("pointerleave", () => showLabel(false));
  btn.addEventListener("focus", () => showLabel(true));
  btn.addEventListener("blur", () => showLabel(false));
  btn.addEventListener("pointerenter", () => { const c = carById(state[slot]); if (c) preloadImg(c.images[slot]); });

  const pill = h("button", {
    type: "button", class: "switch-btn glow", "aria-pressed": "false",
    onclick: (e) => { e.stopPropagation(); onSlotPress(slot, { scroll: true }); },
  }, h("span", { class: "switch-no", text: `0${i + 1}` }), h("span", { class: "switch-name" }));
  switchEl.appendChild(pill);

  slots[slot] = { el, img, tint, reflectImg, btn, add, pin, label, sticker, pill, ratio: EMPTY_RATIO, carId: null, token: 0 };
});

// 내 차고 공유 버튼 (차량 선택 버튼 줄 끝)
const shareBtn = h("button", {
  type: "button", class: "switch-btn share-btn glow",
  onclick: (e) => { e.stopPropagation(); shareGarage(); },
}, h("svg", {}), h("span", { class: "switch-name" }));
shareBtn.querySelector("svg").outerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5h14v-5"/></svg>`;
switchEl.appendChild(shareBtn);

/* ----- 위치 계산 (모두 사진 기준 %) ----- */
function layoutSlot(slot) {
  const s = slots[slot];
  const pos = currentTheme().slots[slot];
  s.el.style.left = `${pos.x}%`;
  s.el.style.top = `${pos.y}%`;
  s.el.style.width = `${pos.width}%`;
  s.el.style.setProperty("--ratio", String(s.ratio));
  // 차 높이를 사진 세로 % 로: 폭% × (세로/가로 비) × 사진 가로/세로
  const heightPct = (pos.width / s.ratio) * STAGE_RATIO;
  const cy = pos.y - heightPct / 2;
  s.pin.style.left = s.label.style.left = s.sticker.style.left = `${pos.x}%`;
  s.pin.style.top = `${pos.y - heightPct * 0.55}%`;
  s.label.style.top = `${pos.y - heightPct}%`;
  s.sticker.style.top = `${Math.max(cy, 26)}%`;
}
const layoutAll = () => SLOT_IDS.forEach(layoutSlot);

/* ----- 차 이미지 바꾸기 (부드럽게) ----- */
const preloaded = new Set();
function preloadImg(src) {
  if (!src || preloaded.has(src)) return;
  preloaded.add(src);
  const i = new Image();
  i.decoding = "async";
  i.src = src;
}

async function renderSlot(slot, { animate = true } = {}) {
  const s = slots[slot];
  const car = carById(state[slot]);
  const token = ++s.token;
  const fade = animate && !reduceMotion;

  if (fade && s.carId) { s.el.classList.add("is-swapping"); await wait(260); }
  if (token !== s.token) return;

  if (!car) {
    s.carId = null;
    s.ratio = EMPTY_RATIO;
    s.img.removeAttribute("src");
    s.reflectImg.removeAttribute("src");
    s.el.classList.add("is-empty");
  } else {
    const src = car.images[slot];
    const probe = new Image();
    probe.decoding = "async";
    probe.src = src;
    try { await probe.decode(); } catch {}
    if (token !== s.token) return;
    const w = probe.naturalWidth || 1200, hgt = probe.naturalHeight || 500;
    s.ratio = w / hgt;
    for (const im of [s.img, s.reflectImg]) { im.width = w; im.height = hgt; im.src = src; }
    s.img.alt = carName(car);
    s.tint.style.webkitMaskImage = s.tint.style.maskImage = `url("${src}")`;
    s.carId = car.id;
    s.el.classList.remove("is-empty");
  }
  refreshSlotText(slot);
  layoutSlot(slot);
  if (fade) { s.el.classList.add("is-swapping"); void s.el.offsetWidth; }
  s.el.classList.remove("is-swapping");
}

function refreshSlotText(slot) {
  const s = slots[slot];
  const car = carById(state[slot]);
  s.add.querySelector(".slot-add-text").textContent = t("gar.add").replace(/^\+\s*/, "");
  s.btn.setAttribute("aria-label", car
    ? t("gar.slotLabel", { slot: slotName(slot), car: carName(car) })
    : t("gar.slotEmptyLabel", { slot: slotName(slot) }));
  s.btn.setAttribute("aria-haspopup", car ? "false" : "dialog");
  s.label.textContent = car ? car.model : "";
  s.pin.hidden = !car;
  s.pill.querySelector(".switch-name").textContent = car ? car.model : `+ ${slotName(slot)}`;
  s.pill.classList.toggle("is-empty", !car);
  if (openSlot === slot) fillSticker(slot);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   스티커 열기/닫기, 자리 누르기
   ============================================================ */
let openSlot = null;

function onSlotPress(slot, { scroll = false } = {}) {
  if (DEBUG && dragMoved) return; // 위치 맞추기 중 드래그 직후 클릭 무시
  if (!state[slot]) { closeSticker(false); if (scroll) scrollToSlot(slot); openPicker(slot); return; }
  if (openSlot === slot) closeSticker(true);
  else openSticker(slot, { scroll });
}

function openSticker(slot, { scroll = false } = {}) {
  closeSticker(false);
  const s = slots[slot];
  openSlot = slot;
  fillSticker(slot);
  s.btn.setAttribute("aria-expanded", "true");
  s.el.classList.add("is-active");
  slotsEl.classList.add("has-active");
  hotspotsEl.classList.add("has-active");
  s.pill.setAttribute("aria-pressed", "true");
  s.pin.classList.add("is-hidden");
  s.sticker.hidden = false;
  requestAnimationFrame(() => s.sticker.classList.add("is-open"));
  if (scroll) scrollToSlot(slot);
}

function closeSticker(returnFocus) {
  if (!openSlot) return;
  const s = slots[openSlot];
  s.btn.setAttribute("aria-expanded", "false");
  s.el.classList.remove("is-active");
  slotsEl.classList.remove("has-active");
  hotspotsEl.classList.remove("has-active");
  s.pill.setAttribute("aria-pressed", "false");
  s.pin.classList.remove("is-hidden");
  s.sticker.classList.remove("is-open");
  s.sticker.hidden = true;
  if (returnFocus) s.btn.focus({ preventScroll: true });
  openSlot = null;
}

function setCar(slot, carId) {
  // 같은 차는 두 자리에 동시에 둘 수 없음
  if (carId && SLOT_IDS.some((o) => o !== slot && state[o] === carId)) return;
  state[slot] = carId;
  persist();
  renderSlot(slot);
}

function removeCar(slot) {
  closeSticker(false);
  setCar(slot, "");
  slots[slot].btn.focus({ preventScroll: true });
}

document.addEventListener("click", () => closeSticker(false));
document.addEventListener("keydown", (e) => {
  if (picker.isOpen()) return;
  if (e.key === "Escape") closeSticker(true);
  if (!openSlot) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    const filled = SLOT_IDS.filter((s) => state[s]);
    if (filled.length < 2) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = filled[(filled.indexOf(openSlot) + step + filled.length) % filled.length];
    openSticker(next, { scroll: true });
    slots[next].btn.focus({ preventScroll: true });
  }
});

/* ============================================================
   차량 선택 창 (데스크톱: 가운데 모달 / 모바일: 아래 시트)
   ============================================================ */
const picker = (() => {
  let slot = null, opener = null, query = "", cat = "all";
  const search = h("input", { type: "search", class: "picker-search", autocomplete: "off", spellcheck: "false" });
  const filters = h("div", { class: "picker-filters", role: "group" });
  const grid = h("ul", { class: "picker-grid" });
  const empty = h("p", { class: "picker-empty", hidden: true });
  const title = h("h2", { class: "picker-title", id: "pickerTitle" });
  const sub = h("p", { class: "picker-sub", id: "pickerSub" });
  const closeBtn = h("button", { type: "button", class: "picker-x", text: "×", onclick: () => close() });
  const dialog = h("div", { class: "picker", role: "dialog", "aria-modal": "true", "aria-labelledby": "pickerTitle", "aria-describedby": "pickerSub", tabindex: "-1" },
    h("div", { class: "picker-grab", "aria-hidden": "true" }),
    h("div", { class: "picker-head" }, h("div", {}, sub, title), closeBtn),
    search, filters, grid, empty);
  const backdrop = h("div", { class: "picker-backdrop", hidden: true, onclick: (e) => { if (e.target === backdrop) close(); } }, dialog);
  document.body.appendChild(backdrop);

  const categories = () => ["all", ...new Set(CARS.map((c) => c.category).filter(Boolean))];
  const norm = (s) => String(s || "").toLowerCase().normalize("NFKC").replace(/[\s\-_.]/g, "");

  function renderFilters() {
    filters.setAttribute("aria-label", t("gar.filter"));
    filters.replaceChildren(...categories().map((c) => h("button", {
      type: "button", class: "picker-chip", "aria-pressed": String(c === cat),
      text: t(`gar.cat.${c}`).replace(/^gar\.cat\./, c),
      onclick: () => { cat = c; renderFilters(); renderGrid(); },
    })));
  }

  function renderGrid() {
    const q = norm(query);
    const list = CARS.filter((c) => (cat === "all" || c.category === cat) && (!q || norm(`${c.brand}${c.model}`).includes(q)));
    empty.hidden = list.length > 0;
    empty.textContent = t("gar.noResults");
    grid.replaceChildren(...list.map((car) => {
      const where = SLOT_IDS.find((s) => state[s] === car.id);
      const here = where === slot;
      const noImg = !canPark(car, slot);
      const taken = !!where && !here;
      const note = noImg ? t("gar.noImage") : taken ? t(`gar.at.${where}`) : here ? t("gar.here") : "";
      const card = h("button", {
        type: "button", class: `picker-card glow${noImg || taken ? " is-off" : ""}${here ? " is-here" : ""}`,
        "aria-disabled": String(noImg || taken),
        onclick: () => {
          if (noImg || taken) return;
          const s = slot;
          close(false);
          if (!here) setCar(s, car.id);
          slots[s].btn.focus({ preventScroll: true });
        },
        onpointerenter: () => { if (!noImg) preloadImg(car.images[slot]); },
        onfocus: () => { if (!noImg) preloadImg(car.images[slot]); },
      },
        h("span", { class: "picker-thumb" },
          car.images.thumb ? h("img", { src: car.images.thumb, alt: "", width: "360", height: "200", loading: "lazy", decoding: "async" }) : null),
        h("span", { class: "picker-brand", text: car.brand }),
        h("span", { class: "picker-model", text: car.model }),
        note ? h("span", { class: "picker-note", text: note }) : null);
      return h("li", {}, card);
    }));
  }

  function open(forSlot) {
    slot = forSlot;
    opener = slots[forSlot].btn; // 닫으면 그 자리로 포커스를 돌려줌 (스티커의 [바꾸기] 버튼은 사라지므로)
    query = ""; cat = "all";
    search.value = "";
    search.placeholder = t("gar.search");
    search.setAttribute("aria-label", t("gar.search"));
    closeBtn.setAttribute("aria-label", t("common.close"));
    title.textContent = t("gar.pickTitle");
    sub.textContent = slotName(slot);
    renderFilters();
    renderGrid();
    backdrop.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    // 키보드 사용자는 검색창으로, 터치 기기는 키보드가 뜨지 않게 창 자체로 포커스
    (finePointer ? search : dialog).focus({ preventScroll: true });
  }

  function close(returnFocus = true) {
    if (backdrop.hidden) return;
    backdrop.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    const done = () => { backdrop.hidden = true; };
    if (reduceMotion) done(); else setTimeout(done, 250);
    if (returnFocus && opener?.focus) opener.focus({ preventScroll: true });
    slot = null;
  }

  search.addEventListener("input", () => { query = search.value; renderGrid(); });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    // 포커스가 창 밖으로 나가지 않게
    const items = [...dialog.querySelectorAll("button, input")].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  onLangChange(() => { if (!backdrop.hidden) { title.textContent = t("gar.pickTitle"); sub.textContent = slotName(slot); search.placeholder = t("gar.search"); renderFilters(); renderGrid(); } });
  return { open, close, isOpen: () => !backdrop.hidden };
})();

function openPicker(slot) { picker.open(slot); }

/* ============================================================
   테마 (배경 + 자리 위치 + 색 보정만 바뀌고 차는 그대로)
   ============================================================ */
const currentTheme = () => themeById(state.theme) || THEMES[0];
const bgAlt = (theme) => t("gar.bgAlt", { theme: L(theme.name) });

function applyGrade(theme) {
  const g = { brightness: 1, contrast: 1, saturate: 1, tint: "#000000", tintStrength: 0, ...(theme.grade || {}) };
  slotsEl.style.setProperty("--grade", `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturate})`);
  slotsEl.style.setProperty("--tint", g.tint);
  slotsEl.style.setProperty("--tint-strength", String(g.tintStrength));
  slotsEl.classList.toggle("has-reflection", theme.reflection !== false);
}

function setTheme(id, { animate = true, save = true } = {}) {
  const theme = themeById(id) || THEMES[0];
  const changed = theme.id !== state.theme;
  state.theme = theme.id;
  if (save && changed) persist();
  pickerEl.querySelectorAll(".theme-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.theme === theme.id)));
  applyGrade(theme);
  layoutAll();
  if (DEBUG) debug.update();

  const oldImg = photosEl.querySelector(".garage-photo.is-current");
  if (!animate || reduceMotion || !oldImg) {
    if (oldImg) { oldImg.src = theme.image; oldImg.alt = bgAlt(theme); }
    return;
  }
  if (!changed) return;
  const img = h("img", { class: "garage-photo", width: IMAGE_SIZE.width, height: IMAGE_SIZE.height, alt: bgAlt(theme), decoding: "async", src: theme.image });
  img.decode().catch(() => {}).then(() => {
    if (state.theme !== theme.id) return; // 그 사이 다른 테마를 골랐으면 취소
    photosEl.appendChild(img);
    requestAnimationFrame(() => {
      img.classList.add("is-current");
      oldImg.classList.remove("is-current");
      setTimeout(() => photosEl.querySelectorAll(".garage-photo:not(.is-current)").forEach((el) => el.remove()), 1000);
    });
  });
}

THEMES.forEach((theme) => {
  const btn = h("button", {
    type: "button", class: "theme-btn glow", "data-theme": theme.id, role: "radio", "aria-checked": "false",
    onclick: (e) => { e.stopPropagation(); setTheme(theme.id); },
    onpointerenter: () => preloadImg(theme.image),
    onfocus: () => preloadImg(theme.image),
  }, h("span", { class: "theme-swatch", "aria-hidden": "true" }), h("span", { class: "theme-name", text: L(theme.name) }));
  btn.querySelector(".theme-swatch").style.background = theme.swatch || "#333";
  pickerEl.appendChild(btn);
});

/* ============================================================
   공유 — Web Share API, 안 되면 주소 복사
   ============================================================ */
async function shareGarage() {
  const url = garageUrl().toString();
  const text = t("gar.shareText");
  window.gtag?.("event", "garage_share", { theme: state.theme });
  if (navigator.share) {
    try { await navigator.share({ title: "One Dollar Drive", text, url }); return; }
    catch (e) { if (e?.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast(t("gar.copied")); }
  catch { toast(t("common.copyFail")); }
}

/* ============================================================
   모바일: 가로 스크롤 (처음엔 가운데, 자리 선택 시 그 자리로 이동)
   ============================================================ */
function scrollToSlot(slot) {
  if (scroller.scrollWidth <= scroller.clientWidth) return;
  const center = (currentTheme().slots[slot].x / 100) * scroller.scrollWidth;
  scroller.scrollTo({ left: center - scroller.clientWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
}
function centerGarage() {
  if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
}

/* ============================================================
   마우스를 따라 차고가 아주 살짝 움직이는 효과 (PC만, 위치 맞추기 모드 제외)
   ============================================================ */
if (finePointer && !reduceMotion && !DEBUG) {
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
   자리 위치 맞추기 도구 (?debug=1 일 때만 만들어짐)
   - 자리를 끌면 위치(x, y), 오른쪽 아래 손잡이를 끌면 폭(width)
   - 아래 상자의 값을 [복사]해서 garage-data.js 의 slots 에 붙여넣기
   ============================================================ */
let dragMoved = false;
const debug = (() => {
  if (!DEBUG) return null;
  garage.classList.add("is-debug");
  const pre = h("pre", { class: "dbg-code" });
  const copy = h("button", { type: "button", class: "btn btn-sm", text: t("gar.copy") });
  const head = h("p", { class: "dbg-title" });
  const panel = h("div", { class: "dbg-panel" }, head, pre, copy);
  document.body.appendChild(panel);
  const r1 = (n) => Math.round(n * 10) / 10;

  const text = () => {
    const s = currentTheme().slots;
    const pad = (k) => `${k}:`.padEnd(8);
    return `slots: {\n${SLOT_IDS.map((k) => `  ${pad(k)}{ x: ${r1(s[k].x)}, y: ${r1(s[k].y)}, width: ${r1(s[k].width)} },`).join("\n")}\n},`;
  };
  const update = () => { head.textContent = `${t("gar.debugTitle")} — ${currentTheme().id}`; pre.textContent = text(); };
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(text()); toast(t("gar.copiedVals")); } catch { toast(t("common.copyFail")); }
  });

  SLOT_IDS.forEach((slot) => {
    const s = slots[slot];
    const handle = h("span", { class: "dbg-handle", "aria-hidden": "true" });
    const tag = h("span", { class: "dbg-tag", text: slot });
    s.el.append(handle, tag);
    const startDrag = (e, mode) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = stageInner.getBoundingClientRect();
      const pos = currentTheme().slots[slot];
      const start = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, pw: pos.width };
      dragMoved = false;
      const move = (ev) => {
        const dx = ((ev.clientX - start.x) / rect.width) * 100;
        const dy = ((ev.clientY - start.y) / rect.height) * 100;
        if (Math.abs(dx) + Math.abs(dy) > 0.2) dragMoved = true;
        if (mode === "move") { pos.x = start.px + dx; pos.y = start.py + dy; }
        else pos.width = Math.max(5, start.pw + dx * 2);
        layoutSlot(slot);
        update();
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setTimeout(() => { dragMoved = false; }, 0);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    s.btn.addEventListener("pointerdown", (e) => startDrag(e, "move"));
    handle.addEventListener("pointerdown", (e) => startDrag(e, "size"));
  });
  update();
  return { update };
})();

/* ============================================================
   언어가 바뀌면 글자 다시 쓰기 (상단 메뉴는 js/header.js)
   ============================================================ */
onLangChange(() => {
  SLOT_IDS.forEach(refreshSlotText);
  shareBtn.querySelector(".switch-name").textContent = t("gar.share");
  shareBtn.setAttribute("aria-label", t("gar.share"));
  pickerEl.querySelectorAll(".theme-btn").forEach((b) => { b.querySelector(".theme-name").textContent = L(themeById(b.dataset.theme).name); });
  photosEl.querySelectorAll(".garage-photo").forEach((img) => { img.alt = bgAlt(currentTheme()); });
  if (DEBUG) debug.update();
});

/* ============================================================
   시작
   ============================================================ */
setTheme(state.theme, { animate: false, save: false });
shareBtn.querySelector(".switch-name").textContent = t("gar.share");
shareBtn.setAttribute("aria-label", t("gar.share"));
SLOT_IDS.forEach((slot) => { refreshSlotText(slot); layoutSlot(slot); renderSlot(slot, { animate: false }); });
// 공유 주소로 들어오면 그 차고를 보여주기만 하고, 내 저장값은 덮어쓰지 않음 (직접 바꾸면 그때 저장)

const firstPhoto = photosEl.querySelector(".garage-photo");
if (firstPhoto.complete) centerGarage();
else firstPhoto.addEventListener("load", centerGarage, { once: true });

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
