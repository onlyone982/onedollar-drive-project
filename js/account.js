// 로그인(구글 / 이메일 링크), 연령 확인, 닉네임·아바타 프로필
import {
  onAuthStateChanged, signInWithPopup, signOut, sendSignInLinkToEmail,
  isSignInWithEmailLink, signInWithEmailLink, deleteUser,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { auth, provider, db } from "./firebase.js";
import { t, getLocale, openModal, toast, esc, applyI18n, onLangChange } from "./common.js";
import { AVATARS, avatarSvg } from "./avatars.js";

const AGE_BLOCK_KEY = "odd_age_block";
const AGE_BLOCK_DAYS = 30;
const EMAIL_KEY = "odd_email_for_signin";

/* =========================================================
   상태
   ========================================================= */
export const account = { ready: false, user: null, profile: null, isBuyer: false, isAdmin: false };
const listeners = [];
export function onAccount(fn) { listeners.push(fn); if (account.ready) fn(account); }
function emit() { listeners.forEach((fn) => fn(account)); renderHeader(); }

const skipOnboarding = document.body.hasAttribute("data-no-onboarding");

/* =========================================================
   연령 차단(13세 미만) — 이 기기에서 일정 기간 재가입 시도 차단
   ========================================================= */
function ageBlocked() {
  try {
    const v = Number(localStorage.getItem(AGE_BLOCK_KEY));
    return v && Date.now() - v < AGE_BLOCK_DAYS * 86400000;
  } catch { return false; }
}
function setAgeBlock() { try { localStorage.setItem(AGE_BLOCK_KEY, String(Date.now())); } catch {} }

function showAgeBlocked() {
  openModal(`<h2 class="modal-title" data-i18n="age.blockedTitle"></h2>
    <p class="muted" data-i18n="age.blockedBody"></p>
    <a class="btn btn-block" href="./community.html" data-i18n="age.keepBrowsing"></a>`);
}

/* =========================================================
   로그인
   ========================================================= */
export function openSignIn() {
  if (ageBlocked()) { showAgeBlocked(); return; }
  const m = openModal(`
    <h2 class="modal-title" data-i18n="signin.title"></h2>
    <p class="muted small" data-i18n="signin.sub"></p>
    <button class="btn btn-block btn-google" id="siGoogle">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      <span data-i18n="signin.google"></span>
    </button>
    <div class="divider"><span data-i18n="signin.or"></span></div>
    <form id="siEmailForm" class="stack">
      <input type="email" id="siEmail" required autocomplete="email" data-i18n-placeholder="signin.emailPh">
      <button class="btn btn-ghost btn-block" type="submit" data-i18n="signin.emailBtn"></button>
    </form>
    <div id="siMsg"></div>
    <p class="tiny muted" data-i18n="signin.legal"></p>`, { className: "modal-sm" });

  m.el.querySelector("#siGoogle").addEventListener("click", async () => {
    try { await signInWithPopup(auth, provider); m.close(); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") msg(m.el, "err", t("signin.fail")); }
  });

  m.el.querySelector("#siEmailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = m.el.querySelector("#siEmail").value.trim();
    if (!email) return;
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: location.origin + location.pathname,
        handleCodeInApp: true,
      });
      try { localStorage.setItem(EMAIL_KEY, email); } catch {}
      msg(m.el, "ok", t("signin.emailSent", { email }));
    } catch (err) {
      console.error(err);
      msg(m.el, "err", t("signin.fail"));
    }
  });
}

function msg(root, kind, text) {
  const box = root.querySelector("#siMsg, .js-msg");
  if (!box) return;
  box.innerHTML = "";
  const n = document.createElement("div");
  n.className = `notice ${kind}`;
  n.textContent = text;
  box.appendChild(n);
}

// 이메일 링크로 돌아왔을 때 로그인 완료
async function completeEmailLink() {
  if (!isSignInWithEmailLink(auth, location.href)) return;
  let email = "";
  try { email = localStorage.getItem(EMAIL_KEY) || ""; } catch {}
  if (!email) email = window.prompt(t("signin.confirmEmail")) || "";
  if (!email) return;
  try {
    await signInWithEmailLink(auth, email, location.href);
    try { localStorage.removeItem(EMAIL_KEY); } catch {}
  } catch (e) {
    console.error(e);
    toast(t("signin.linkExpired"));
  }
  history.replaceState(null, "", location.pathname + location.hash);
}

export async function logOut() { await signOut(auth); }

/* =========================================================
   온보딩: 생년월일(연령 확인) + 닉네임 + 아바타
   ========================================================= */
function openOnboarding(user) {
  const now = new Date();
  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 100; y--) years.push(y);
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(getLocale(), { month: "long" }));

  const m = openModal(`
    <h2 class="modal-title" data-i18n="onb.title"></h2>
    <p class="muted small" data-i18n="onb.sub"></p>
    <form id="onbForm" class="stack" novalidate>
      <div class="field">
        <label data-i18n="onb.birthday"></label>
        <div class="dob">
          <select id="dobM" required><option value="">—</option>${months.map((n, i) => `<option value="${i + 1}">${n}</option>`).join("")}</select>
          <select id="dobD" required><option value="">—</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select>
          <select id="dobY" required><option value="">—</option>${years.map((y) => `<option>${y}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field">
        <label for="nick" data-i18n="onb.nickname"></label>
        <input id="nick" required minlength="3" maxlength="20" autocomplete="off" spellcheck="false" placeholder="e.g. gt3_dreamer">
        <span class="tiny muted" data-i18n="onb.nickHelp"></span>
      </div>
      <div class="field">
        <label data-i18n="onb.avatar"></label>
        <div class="avatar-pick">${AVATARS.map((a) => `
          <label><input type="radio" name="av" value="${a.id}" ${a.id === 0 ? "checked" : ""}><span>${avatarSvg(a.id, 52)}</span></label>`).join("")}
        </div>
      </div>
      <div class="js-msg"></div>
      <button class="btn btn-block btn-lg" type="submit" data-i18n="onb.done"></button>
      <button class="link-btn" type="button" id="onbCancel" data-i18n="onb.cancel"></button>
    </form>`, {
    className: "modal-sm",
    onClose: () => { if (!account.profile) signOut(auth); },
  });

  m.el.querySelector("#onbCancel").addEventListener("click", () => m.close());

  m.el.querySelector("#onbForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const y = Number(m.el.querySelector("#dobY").value);
    const mo = Number(m.el.querySelector("#dobM").value);
    const d = Number(m.el.querySelector("#dobD").value);
    const nickname = m.el.querySelector("#nick").value.trim();
    const avatarId = Number(m.el.querySelector('input[name="av"]:checked')?.value ?? 0);

    if (!y || !mo || !d) { msg(m.el, "err", t("onb.errDob")); return; }
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(nickname)) { msg(m.el, "err", t("onb.errNick")); return; }

    // 만 나이 계산 (생년월일 자체는 저장하지 않음)
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;

    if (age < 13) {
      setAgeBlock();
      // 13세 미만: 계정과 정보를 남기지 않음
      try { await deleteUser(user); } catch { await signOut(auth); }
      m.close();
      showAgeBlocked();
      return;
    }

    const ageBand = age >= 18 ? "adult" : "teen";
    const lower = nickname.toLowerCase();
    const batch = writeBatch(db);
    batch.set(doc(db, "users", user.uid), {
      nickname, nicknameLower: lower, avatarId, ageBand, createdAt: serverTimestamp(),
    });
    batch.set(doc(db, "usernames", lower), { uid: user.uid });
    try {
      await batch.commit();
      account.profile = { nickname, nicknameLower: lower, avatarId, ageBand };
      m.close();
      toast(t("onb.welcome", { name: nickname }));
      emit();
    } catch (err) {
      console.error(err);
      msg(m.el, "err", err.code === "permission-denied" ? t("onb.errTaken") : t("signin.fail"));
    }
  });
}

/* =========================================================
   로그인 필요 동작 전에 호출: 프로필이 준비되면 true
   ========================================================= */
export function requireProfile() {
  if (account.profile) return true;
  if (account.user && !account.profile) openOnboarding(account.user);
  else openSignIn();
  return false;
}

/* =========================================================
   헤더
   ========================================================= */
function renderHeader() {
  const area = document.getElementById("accountArea");
  if (!area) return;
  area.innerHTML = "";
  if (!account.ready) return;

  // 로그인 전: 헤더의 다른 아이콘과 같은 모양의 사람 아이콘
  if (!account.user) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "icon-btn glow";
    b.setAttribute("aria-label", t("auth.login"));
    b.title = t("auth.login");
    b.innerHTML = PERSON_ICON;
    b.addEventListener("click", openSignIn);
    area.appendChild(b);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "acct";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "acct-btn glow";
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = account.profile
    ? `${avatarSvg(account.profile.avatarId, 30)}<span class="acct-name">${esc(account.profile.nickname)}</span>`
    : `${PERSON_ICON}<span class="acct-name">${esc(t("onb.finish"))}</span>`;
  if (account.profile) btn.setAttribute("aria-label", account.profile.nickname);
  const menu = document.createElement("div");
  menu.className = "acct-menu";
  menu.hidden = true;
  menu.innerHTML = `
    ${account.profile ? `<div class="acct-meta small muted">${account.isBuyer ? "✓ " + esc(t("acct.buyer")) : esc(t("acct.notBuyer"))}</div>` : ""}
    <a href="./community.html" data-i18n="nav.community"></a>
    ${account.isAdmin ? `<a href="./admin.html">Admin</a>` : ""}
    <button type="button" id="acctLogout" data-i18n="auth.logout"></button>`;
  applyI18n(menu);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!account.profile) { openOnboarding(account.user); return; }
    menu.hidden = !menu.hidden;
    btn.setAttribute("aria-expanded", String(!menu.hidden));
  });
  closeAcctMenu = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  menu.querySelector("#acctLogout").addEventListener("click", logOut);
  wrap.append(btn, menu);
  area.appendChild(wrap);
}

const PERSON_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`;
let closeAcctMenu = () => {};
document.addEventListener("click", () => closeAcctMenu());
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAcctMenu(); });

// 언어 메뉴는 common.js 가 #langBtn 에 연결합니다. 언어가 바뀌면 계정 영역 문구만 다시 그립니다.
onLangChange(renderHeader);

/* =========================================================
   부팅
   ========================================================= */
completeEmailLink();

onAuthStateChanged(auth, async (user) => {
  account.user = user && !user.isAnonymous ? user : null;
  account.profile = null;
  account.isBuyer = false;
  account.isAdmin = false;

  if (account.user) {
    const uid = account.user.uid;
    const email = (account.user.email || "").toLowerCase();
    const [p, b, a] = await Promise.all([
      getDoc(doc(db, "users", uid)).catch(() => null),
      email ? getDoc(doc(db, "buyers", email)).catch(() => null) : null,
      getDoc(doc(db, "admins", uid)).catch(() => null),
    ]);
    account.profile = p?.exists() ? p.data() : null;
    account.isBuyer = !!b?.exists() && account.user.emailVerified;
    account.isAdmin = !!a?.exists();
    if (!account.profile && !skipOnboarding) {
      if (ageBlocked()) { await signOut(auth); showAgeBlocked(); }
      else openOnboarding(account.user);
    }
  }
  account.ready = true;
  emit();
});
