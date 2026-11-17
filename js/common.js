// 모든 페이지 공통: 언어, 푸터, 유틸 (로그인/계정은 account.js)
import { STRINGS } from "./i18n.js";
import { SITE } from "./config.js";

/* ---------- language ---------- */
export function getLang() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "ko" || saved === "en") return saved;
  } catch {}
  return "en";
}

export function t(key, vars = {}) {
  const lang = getLang();
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

const langListeners = [];
export function onLangChange(fn) { langListeners.push(fn); }

export function applyI18n(root = document) {
  document.documentElement.lang = getLang();
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    // data-i18n-html 이 있으면 HTML로(번역 문자열은 우리가 쓴 것이므로 안전), 없으면 텍스트로.
    const val = t(el.dataset.i18n, readVars(el));
    if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
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
  try { localStorage.setItem("lang", lang); } catch {}
  applyI18n();
}

/* ---------- footer ---------- */
function renderFooter() {
  const el = document.getElementById("siteFooter");
  if (!el) return;
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="footer-grid">
      <div>
        <div class="footer-brand">ONE DOLLAR DRIVE</div>
        <p class="muted small" data-i18n="footer.void"></p>
      </div>
      <div class="small">
        <div><span data-i18n="footer.contact"></span>: <a href="mailto:${esc(SITE.contactEmail)}">${esc(SITE.contactEmail)}</a></div>
        <div><span data-i18n="footer.sponsor"></span>: ${esc(SITE.sponsorName)} · ${esc(SITE.sponsorRepresentative)}</div>
        <div>${esc(SITE.sponsorAddress)}</div>
        <div><span data-i18n="footer.biz"></span>: ${esc(SITE.businessLicense)} · <span data-i18n="footer.ecom"></span>: ${esc(SITE.onlineBusinessLicense)}</div>
      </div>
      <nav class="footer-links small">
        <a href="./community.html" data-i18n="nav.community"></a>
        <a href="./official-rules.html" data-i18n="footer.rules"></a>
        <a href="${esc(SITE.privacyUrl)}" target="_blank" rel="noopener" data-i18n="footer.privacy"></a>
        <a href="${esc(SITE.termsUrl)}" target="_blank" rel="noopener" data-i18n="footer.terms"></a>
      </nav>
    </div>
    <div class="muted small copyright">© ${year} ${esc(SITE.sponsorName)}. One Dollar Drive. All rights reserved.</div>`;
}

/* ---------- utils ---------- */
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

export function timeAgo(d) {
  if (!d) return "";
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  const ko = getLang() === "ko";
  const units = ko
    ? [[31536000, "년"], [2592000, "개월"], [604800, "주"], [86400, "일"], [3600, "시간"], [60, "분"]]
    : [[31536000, "y"], [2592000, "mo"], [604800, "w"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [sec, label] of units) {
    if (s >= sec) return ko ? `${Math.floor(s / sec)}${label} 전` : `${Math.floor(s / sec)}${label}`;
  }
  return ko ? "방금" : "now";
}

/* ---------- modal helper ---------- */
export function openModal(html, { onClose, className = "" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true">
    <button class="modal-x" aria-label="Close">×</button>${html}</div>`;
  const close = () => { wrap.remove(); document.body.classList.remove("no-scroll"); onClose?.(); };
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector(".modal-x").addEventListener("click", close);
  document.addEventListener("keydown", function k(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); }
  });
  document.body.appendChild(wrap);
  document.body.classList.add("no-scroll");
  applyI18n(wrap);
  return { el: wrap.querySelector(".modal"), close };
}

/* ---------- boot ---------- */
renderFooter();
applyI18n();
