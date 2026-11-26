// Pit Stop — What if... / Carscope
// 모든 계산은 브라우저 안에서만 합니다. 입력값은 서버·Firestore·localStorage 어디에도 저장하지 않습니다.
import { QUESTIONS, DREAM_CARS, PITSTOP_LINKS, KRW_PER_USD } from "./pitstop-data.js";
import { t, getLang, getLocale, onLangChange, toast, usd } from "./common.js";

const $ = (id) => document.getElementById(id);
// { en: "...", ko: "..." } → 현재 언어 문구 (없으면 영어)
const L = (v) => (v == null ? "" : typeof v === "string" ? v : v[getLang()] ?? v.en ?? "");
const track = (name, params) => { try { window.gtag?.("event", name, params); } catch {} };
const num = (n, digits = 0) => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: digits }).format(n);

// 작은 DOM 도우미: 글자는 항상 textContent 로 넣음 (입력값이 HTML로 해석되지 않게)
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

/* =========================================================
   금액 표시 — USD, 한국어일 때만 원화 대략값을 괄호로
   ========================================================= */
function krwText(usdAmount) {
  const won = usdAmount * KRW_PER_USD;
  if (won >= 1e8) {
    const eok = Math.floor(won / 1e8);
    const man = Math.round((won % 1e8) / 1e4);
    return `약 ${eok}억${man ? ` ${num(man)}만` : ""}원`;
  }
  if (won >= 1e4) return `약 ${num(Math.round(won / 1e4))}만원`;
  return `약 ${num(Math.round(won))}원`;
}
function money(n) {
  const s = usd(n, { cents: n % 1 !== 0 });
  return getLang() === "ko" ? `${s} (${krwText(n)})` : s;
}

/* =========================================================
   공유 — Web Share API, 안 되면 클립보드 복사
   ========================================================= */
async function shareResult(type, text) {
  const url = `${location.origin}${location.pathname}#${type}`;
  track("pitstop_share", { type });
  if (navigator.share) {
    try { await navigator.share({ title: "One Dollar Drive · Pit Stop", text, url }); return; }
    catch (e) { if (e?.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast(t("pit.copied")); }
  catch { toast(t("common.copyFail")); }
}

const SILHOUETTE = `<svg class="ps-silhouette" viewBox="0 0 240 90" aria-hidden="true">
  <path d="M10 66c0-7 5-11 12-12l34-6c12-11 30-21 58-22 26-1 46 4 64 14l20 10c12 2 22 7 26 14v9H10z" stroke-linejoin="round"/>
  <path d="M74 46c10-9 24-15 42-16 16-1 30 2 42 8l8 8H74z" opacity=".55"/>
  <circle cx="62" cy="70" r="13"/><circle cx="184" cy="70" r="13"/>
</svg>`;

function carVisual(car) {
  const box = h("div", { class: "ps-visual" });
  if (car.image) box.append(h("img", { src: car.image, alt: car.name, loading: "lazy", decoding: "async" }));
  else box.innerHTML = SILHOUETTE;
  return box;
}

/* =========================================================
   탭 (#whatif / #carscope)
   ========================================================= */
const TABS = ["whatif", "carscope"];
function selectTab(name, { focus = false, updateHash = true } = {}) {
  if (!TABS.includes(name)) name = TABS[0];
  for (const id of TABS) {
    const on = id === name;
    const tab = $(`tab-${id}`);
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    $(`panel-${id}`).hidden = !on;
    if (on && focus) tab.focus();
  }
  if (updateHash && location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
}
document.querySelectorAll('[role="tab"]').forEach((tab, i, all) => {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  tab.addEventListener("keydown", (e) => {
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = all[(map[e.key] + all.length) % all.length];
    selectTab(next.dataset.tab, { focus: true });
  });
});
window.addEventListener("hashchange", () => selectTab(location.hash.slice(1), { updateHash: false }));

/* =========================================================
   What if...
   단계: 질문 0..N-1 → 드림카 입력(N) → 결과(N+1)
   ========================================================= */
const stage = $("wiStage");
const wi = { step: 0, answers: QUESTIONS.map(() => null), car: null, carText: "", tracked: false };
const CAR_STEP = QUESTIONS.length;
const TOTAL_STEPS = QUESTIONS.length + 1;

function go(step) {
  wi.step = step;
  renderWi(true);
}

function progress(n) {
  return h("div", { class: "ps-progress", "aria-hidden": "true" },
    h("span", { style: `width:${(n / TOTAL_STEPS) * 100}%` }));
}

function parseAmount(s) {
  const clean = String(s).replace(/[$,\s]/g, "");
  if (!clean) return null;
  const v = Number(clean);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}

function renderQuestion(i) {
  const q = QUESTIONS[i];
  const input = h("input", {
    id: "wiAmount", type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "0",
    "aria-describedby": "wiHint wiErr", "aria-invalid": "false",
  });
  if (wi.answers[i] != null) input.value = String(wi.answers[i]);
  const krw = h("span", { class: "ps-krw" });
  const err = h("p", { class: "ps-error", id: "wiErr" });
  const updateKrw = () => {
    const v = parseAmount(input.value);
    krw.textContent = getLang() === "ko" && v > 0 ? krwText(v) : "";
  };
  input.addEventListener("input", () => { err.textContent = ""; input.setAttribute("aria-invalid", "false"); updateKrw(); });
  updateKrw();

  const form = h("form", {
    class: "ps-step", novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      const v = parseAmount(input.value);
      if (v == null || Number.isNaN(v) || v < 0 || v > q.maxUsd) {
        err.textContent = t("wi.errAmount", { max: usd(q.maxUsd) });
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      wi.answers[i] = v;
      go(i + 1);
    },
  },
    h("p", { class: "ps-step-no", text: t("wi.step", { n: i + 1, total: TOTAL_STEPS }) }),
    progress(i + 1),
    h("label", { class: "ps-q", for: "wiAmount", text: L(q.question) }),
    h("div", { class: "ps-amount" }, h("span", { class: "ps-cur", "aria-hidden": "true", text: "$" }), input),
    h("p", { class: "ps-hint", id: "wiHint" }, h("span", { text: t("wi.perMonth") }), krw),
    err,
    h("div", { class: "ps-actions" },
      i > 0 && h("button", { type: "button", class: "btn btn-ghost glow", text: t("wi.back"), onclick: () => go(i - 1) }),
      h("button", { type: "button", class: "btn btn-ghost glow", text: t("wi.skip"), onclick: () => { wi.answers[i] = null; go(i + 1); } }),
      h("button", { type: "submit", class: "btn glow", text: t("wi.next") })),
  );
  return { el: form, focusEl: input };
}

/* ----- 드림카 자동완성 ----- */
const norm = (s) => String(s || "").toLowerCase().normalize("NFKC").replace(/[\s\-_.·]/g, "");
const carKeys = (car) => [car.name, ...(car.aliases || [])].map(norm);
function findCars(query) {
  const q = norm(query);
  if (!q) return DREAM_CARS.slice(0, 8);
  return DREAM_CARS.filter((car) => carKeys(car).some((k) => k.includes(q)));
}
function exactCar(query) {
  const q = norm(query);
  return q ? DREAM_CARS.find((car) => carKeys(car).includes(q)) : null;
}

function renderCar() {
  const input = h("input", {
    id: "wiCar", type: "text", role: "combobox", autocomplete: "off", spellcheck: "false",
    "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "wiCarList",
    "aria-describedby": "wiCarHelp", placeholder: t("wi.carPh"),
  });
  input.value = wi.car ? wi.car.name : wi.carText;
  const list = h("ul", { class: "ps-options", id: "wiCarList", role: "listbox", hidden: true });
  const note = h("div", { class: "ps-note" });
  let active = -1;
  let matches = [];

  const choose = (car) => {
    wi.car = car;
    wi.carText = car.name;
    input.value = car.name;
    close();
    note.replaceChildren();
  };
  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; };
  const open = () => {
    matches = findCars(input.value);
    list.replaceChildren(...matches.map((car, idx) =>
      h("li", {
        id: `wiOpt${idx}`, role: "option", "aria-selected": "false",
        onmousedown: (e) => e.preventDefault(), // 입력칸 포커스 유지
        onclick: () => choose(car),
      }, h("span", { text: car.name }), h("small", { text: usd(car.priceUsd) }))));
    const show = matches.length > 0;
    list.hidden = !show;
    input.setAttribute("aria-expanded", String(show));
    active = -1;
  };
  const highlight = (idx) => {
    const items = [...list.children];
    if (!items.length) return;
    active = (idx + items.length) % items.length;
    items.forEach((li, j) => li.setAttribute("aria-selected", String(j === active)));
    input.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  };

  input.addEventListener("input", () => {
    wi.carText = input.value;
    if (wi.car && input.value !== wi.car.name) wi.car = null;
    note.replaceChildren();
    open();
  });
  input.addEventListener("focus", open);
  input.addEventListener("blur", () => setTimeout(close, 120));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) open(); highlight(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Enter" && !list.hidden && active >= 0) { e.preventDefault(); choose(matches[active]); }
    else if (e.key === "Escape") close();
  });

  const showNotListed = () => {
    const kids = [h("p", { text: t("wi.notListed") })];
    if (PITSTOP_LINKS.carRequestForm) {
      kids.push(h("a", { class: "btn btn-ghost btn-sm glow", href: PITSTOP_LINKS.carRequestForm, target: "_blank", rel: "noopener", text: t("wi.request") }));
    }
    note.replaceChildren(...kids);
  };

  const form = h("form", {
    class: "ps-step", novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      const car = wi.car || exactCar(input.value) || (findCars(input.value).length === 1 && input.value.trim() ? findCars(input.value)[0] : null);
      if (car) { wi.car = car; go(CAR_STEP + 1); return; }
      close();
      if (!input.value.trim() || findCars(input.value).length > 1) note.replaceChildren(h("p", { text: t("wi.pickCar") }));
      else showNotListed();
      input.focus();
    },
  },
    h("p", { class: "ps-step-no", text: t("wi.step", { n: TOTAL_STEPS, total: TOTAL_STEPS }) }),
    progress(TOTAL_STEPS),
    h("label", { class: "ps-q", for: "wiCar", text: t("wi.carQ") }),
    h("div", { class: "ps-combo" }, input, list),
    h("p", { class: "ps-hint", id: "wiCarHelp", text: t("wi.carHelp") }),
    note,
    h("div", { class: "ps-actions" },
      QUESTIONS.length > 0 ? h("button", { type: "button", class: "btn btn-ghost glow", text: t("wi.back"), onclick: () => go(CAR_STEP - 1) }) : null,
      h("button", { type: "submit", class: "btn glow", text: t("wi.showResult") })),
  );
  return { el: form, focusEl: input };
}

/* ----- 결과 ----- */
function timeText(months) {
  const y = Math.floor(months / 12), m = months % 12;
  const parts = [];
  if (y) parts.push(y === 1 ? t("wi.year1") : t("wi.years", { n: num(y) }));
  if (m) parts.push(m === 1 ? t("wi.month1") : t("wi.months", { n: num(m) }));
  return parts.join(" ");
}
function joke(months) {
  if (months <= 12) return t("wi.joke.fast");
  if (months <= 60) return t("wi.joke.soon");
  if (months <= 240) return t("wi.joke.long");
  return t("wi.joke.epic");
}

function renderResult() {
  const car = wi.car;
  const total = wi.answers.reduce((a, v) => a + (v || 0), 0);
  const kids = [];
  let shareText;

  if (total <= 0) {
    shareText = t("wi.shareZero", { car: car.name });
    kids.push(h("h2", { class: "ps-joke ps-joke-lg", tabindex: "-1", text: t("wi.zero") }));
  } else {
    const months = Math.max(1, Math.ceil(car.priceUsd / total));
    const time = timeText(months);
    shareText = t("wi.shareText", { car: car.name, time });
    const equiv = QUESTIONS.map((q, i) => {
      const v = wi.answers[i];
      if (!v) return null;
      const n = v / q.unitPriceUsd;
      return h("li", { text: t("wi.equiv", { amount: money(v), n: num(n, n < 10 ? 1 : 0), unit: L(q.unit), counter: L(q.counter) }) });
    }).filter(Boolean);
    kids.push(
      h("p", { class: "ps-result-pre", text: t("wi.resultPre", { car: car.name }) }),
      h("h2", { class: "ps-big", tabindex: "-1", text: time }),
      h("p", { class: "ps-joke", text: joke(months) }),
      equiv.length ? h("ul", { class: "ps-equiv" }, equiv) : null,
      h("p", { class: "ps-sum" },
        h("span", { text: t("wi.total", { amount: money(total) }) }),
        h("span", { text: t("wi.price", { amount: money(car.priceUsd) }) })),
    );
  }

  kids.push(
    h("div", { class: "ps-actions ps-actions-center" },
      h("button", { type: "button", class: "btn glow", text: t("pit.share"), onclick: () => shareResult("whatif", shareText) }),
      h("button", { type: "button", class: "btn btn-ghost glow", text: t("wi.retry"), onclick: resetWi })),
    h("a", { class: "ps-cta", href: "shop.html", text: t("wi.cta") }),
    h("p", { class: "ps-fine" },
      h("span", { text: t("wi.priceBasis", { note: L(car.priceNote), date: car.asOf }) }),
      h("br"),
      h("span", { text: t("wi.notSaved") })),
  );

  if (!wi.tracked) { track("whatif_complete", { car_id: car.id }); wi.tracked = true; }
  const el = h("div", { class: "ps-result" }, kids);
  return { el, focusEl: el.querySelector("h2") };
}

function resetWi() {
  wi.answers = QUESTIONS.map(() => null);
  wi.car = null;
  wi.carText = "";
  wi.tracked = false;
  go(0);
}

function renderWi(focus = false) {
  let view;
  if (wi.step < CAR_STEP) view = renderQuestion(wi.step);
  else if (wi.step === CAR_STEP || !wi.car) view = renderCar();
  else view = renderResult();
  stage.replaceChildren(view.el);
  stage.classList.toggle("is-result", wi.step > CAR_STEP);
  if (focus) view.focusEl?.focus({ preventScroll: false });
}

/* =========================================================
   Carscope — 이름 + 생일(월/일) → 항상 같은 차 (해시)
   ========================================================= */
const csForm = $("csForm"), csName = $("csName"), csMonth = $("csMonth"), csDay = $("csDay");
const csError = $("csError"), csResult = $("csResult");
let csLast = null; // 언어가 바뀌면 결과를 다시 그리기 위한 값 (메모리에만 있음)

// FNV-1a 32비트 해시 — 같은 글자면 항상 같은 숫자
function fnv1a(str) {
  let h32 = 0x811c9dc5;
  for (const ch of str) {
    h32 ^= ch.codePointAt(0);
    h32 = Math.imul(h32, 0x01000193) >>> 0;
  }
  return h32 >>> 0;
}
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function fillBirthday() {
  const m = csMonth.value, d = csDay.value;
  const monthName = (i) => new Date(2000, i, 1).toLocaleString(getLocale(), { month: "long" });
  csMonth.replaceChildren(
    h("option", { value: "", text: t("cs.month") }),
    ...Array.from({ length: 12 }, (_, i) => h("option", { value: i + 1, text: monthName(i) })));
  csMonth.value = m;
  fillDays(d);
}
function fillDays(keep = csDay.value) {
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][Number(csMonth.value) - 1] || 31;
  csDay.replaceChildren(
    h("option", { value: "", text: t("cs.day") }),
    ...Array.from({ length: max }, (_, i) => h("option", { value: i + 1, text: num(i + 1) })));
  csDay.value = Number(keep) <= max ? keep : "";
}
csMonth.addEventListener("change", () => { fillDays(); csError.textContent = ""; });
csDay.addEventListener("change", () => { csError.textContent = ""; });
csName.addEventListener("input", () => { csError.textContent = ""; });

function renderCarscope(focus = false) {
  if (!csLast) { csResult.replaceChildren(); return; }
  const { name, car, gear } = csLast;
  const gearText = t("cs.gearVal", { n: gear, ord: ordinal(gear) });
  const shareText = t("cs.shareText", { car: car.name, gear: gearText });
  const card = h("article", { class: "ps-card cs-card" },
    carVisual(car),
    h("p", { class: "ps-result-pre", text: t("cs.resultPre", { name }) }),
    h("h2", { class: "cs-car", tabindex: "-1", text: car.name }),
    h("p", { class: "cs-personality", text: L(car.personality) }),
    h("p", { class: "cs-gear" }, h("b", { "aria-hidden": "true", text: String(gear) }), h("span", { text: `${t("cs.gear")} · ${gearText}` })),
    h("div", { class: "ps-actions ps-actions-center" },
      h("button", { type: "button", class: "btn glow", text: t("pit.share"), onclick: () => shareResult("carscope", shareText) }),
      h("button", {
        type: "button", class: "btn btn-ghost glow", text: t("cs.again"),
        onclick: () => { csLast = null; csName.value = ""; renderCarscope(); csName.focus(); },
      })),
    h("p", { class: "ps-fine", text: t("cs.fine") }),
  );
  csResult.replaceChildren(card);
  if (focus) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.querySelector("h2").focus({ preventScroll: true });
  }
}

csForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = csName.value.trim();
  const key = name.toLowerCase().replace(/\s+/g, "");
  const m = Number(csMonth.value), d = Number(csDay.value);
  if (!key || !m || !d || !DREAM_CARS.length) { csError.textContent = t("cs.err"); return; }
  const seed = `${key}|${m}|${d}`;
  const car = DREAM_CARS[fnv1a(seed) % DREAM_CARS.length];
  const gear = 1 + (fnv1a(`gear|${seed}`) % 7); // 1~7단
  csLast = { name, car, gear };
  renderCarscope(true);
  track("carscope_complete", { car_id: car.id });
});

/* =========================================================
   시작 + 언어 변경
   ========================================================= */
fillBirthday();
renderWi();
selectTab(location.hash.slice(1), { updateHash: false });

onLangChange(() => {
  renderWi();
  fillBirthday();
  renderCarscope();
});
