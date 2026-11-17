// 모든 페이지 공통: 언어(번역), 언어 메뉴, 유틸, 모달 (로그인/계정은 account.js)
// ※ Firebase를 쓰지 않는 파일입니다. 메인 차고(main.js)도 이 파일만 불러옵니다.
import { STRINGS, LANGS, DEFAULT_LANG } from "./i18n.js";

/* =========================================================
   언어
   ========================================================= */
const LANG_KEY = "lang";
const isLang = (code) => LANGS.some((l) => l.code === code);

export function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {}
  return DEFAULT_LANG;
}

// 날짜·숫자 표기용 (예: "ko-KR")
export function getLocale() {
  return LANGS.find((l) => l.code === getLang())?.locale || "en-US";
}

export function t(key, vars = {}) {
  const lang = getLang();
  let s = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

const langListeners = [];
export function onLangChange(fn) { langListeners.push(fn); }

export function applyI18n(root = document) {
  if (root === document) document.documentElement.lang = getLang();
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    // data-i18n-html 이 있으면 HTML로(번역 문자열은 우리가 쓴 것이므로 안전), 없으면 텍스트로.
    const val = t(el.dataset.i18n, readVars(el));
    if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  if (root === document) langListeners.forEach((fn) => fn(getLang()));
}

function readVars(el) {
  const vars = {};
  for (const [k, v] of Object.entries(el.dataset)) {
    if (k.startsWith("var")) vars[k.slice(3).toLowerCase()] = v;
  }
  return vars;
}

export function setLang(lang) {
  if (!isLang(lang)) return;
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  applyI18n();
}

/* =========================================================
   언어 메뉴 (헤더의 #langBtn + 모바일 메뉴 안의 언어 목록)
   ========================================================= */
function initLangMenu() {
  const btn = document.getElementById("langBtn");
  const items = [];

  const makeItem = (l, onPick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.lang = l.code;
    b.dataset.lang = l.code;
    b.textContent = l.name;
    b.addEventListener("click", (e) => { e.stopPropagation(); setLang(l.code); onPick?.(); });
    items.push(b);
    return b;
  };

  if (btn) {
    const menu = document.createElement("div");
    menu.className = "lang-menu";
    menu.id = "langMenu";
    menu.hidden = true;
    const close = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    LANGS.forEach((l) => menu.appendChild(makeItem(l, () => { close(); btn.focus(); })));
    btn.after(menu);
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "langMenu");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) menu.querySelector('[aria-current="true"]')?.focus();
    });
    menu.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { close(); btn.focus(); }
    });
  }

  // 모바일 메뉴(햄버거) 안에도 언어 목록
  const nav = document.getElementById("mainNav");
  if (nav) {
    const row = document.createElement("div");
    row.className = "nav-lang";
    LANGS.forEach((l) => row.appendChild(makeItem(l)));
    nav.appendChild(row);
  }

  const sync = (lang) => {
    if (btn) btn.textContent = lang.toUpperCase();
    items.forEach((b) => b.setAttribute("aria-current", String(b.dataset.lang === lang)));
  };
  onLangChange(sync);
  sync(getLang());
}

/* =========================================================
   유틸
   ========================================================= */
export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function usd(n, opts = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(Number(n) || 0);
}

export function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2400);
}

export function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

// "3시간 전", "3 hours ago", "3時間前" … (현재 언어로)
export function timeAgo(d) {
  if (!d) return "";
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto", style: "short" });
  const units = [[31536000, "year"], [2592000, "month"], [604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [sec, unit] of units) {
    if (s >= sec) return rtf.format(-Math.floor(s / sec), unit);
  }
  return rtf.format(0, "second");
}

/* =========================================================
   모달
   ========================================================= */
export function openModal(html, { onClose, className = "" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true">
    <button class="modal-x" type="button" aria-label="${esc(t("common.close"))}">×</button>${html}</div>`;
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => {
    wrap.remove();
    document.body.classList.remove("no-scroll");
    document.removeEventListener("keydown", onKey);
    onClose?.();
  };
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector(".modal-x").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(wrap);
  document.body.classList.add("no-scroll");
  applyI18n(wrap);
  return { el: wrap.querySelector(".modal"), close };
}

/* =========================================================
   시작
   ========================================================= */
initLangMenu();
applyI18n();
