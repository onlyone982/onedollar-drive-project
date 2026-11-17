// 모든 페이지 공통: 언어, 로그인 버튼, 푸터, 유틸
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { auth, provider } from "./firebase.js";
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
  langListeners.forEach((fn) => fn(getLang()));
}

function readVars(el) {
  const vars = {};
  for (const [k, v] of Object.entries(el.dataset)) {
    if (k.startsWith("var")) vars[k.slice(3).toLowerCase()] = v;
  }
  return vars;
}

function setLang(lang) {
  try { localStorage.setItem("lang", lang); } catch {}
  applyI18n();
}

/* ---------- auth ---------- */
export let currentUser = null;
let authReady = false;
const authListeners = [];
// 로그인 상태가 확정된 뒤에만 호출됩니다(새로고침 직후 잘못된 null 방지).
export function onUser(fn) { authListeners.push(fn); if (authReady) fn(currentUser); }

export function isRealUser(user) {
  return !!user && !user.isAnonymous;
}

// 계정이 바뀌기 직전에 알림(접속자 표시 정리용)
function beforeAuthChange() {
  window.dispatchEvent(new Event("odd:before-auth-change"));
}

export async function signIn() {
  beforeAuthChange();
  try { await signInWithPopup(auth, provider); }
  catch (e) { console.error("Sign-in failed:", e); }
}

export async function logOut() {
  beforeAuthChange();
  await signOut(auth);
}

function wireHeader() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const langBtn = document.getElementById("langBtn");

  loginBtn?.addEventListener("click", signIn);
  logoutBtn?.addEventListener("click", logOut);
  langBtn?.addEventListener("click", () => setLang(getLang() === "en" ? "ko" : "en"));

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    authReady = true;
    const real = isRealUser(user);
    if (loginBtn) loginBtn.hidden = real;
    if (logoutBtn) logoutBtn.hidden = !real;
    authListeners.forEach((fn) => fn(user));
  });
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
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

export function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

/* ---------- boot ---------- */
renderFooter();
wireHeader();
applyI18n();
