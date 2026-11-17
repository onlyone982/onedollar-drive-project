import {
  doc, collection, addDoc, onSnapshot, query, orderBy, limit, limitToLast, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  ref, set, remove, onValue, onDisconnect, serverTimestamp as rtdbTs,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

import { db, auth, rtdb } from "./firebase.js";
import { SITE, ROUND_ID, ROUND_DEFAULTS, PRODUCTS, MIN_VISIBLE_COUNT, FREE_ENTRIES_PER_DAY } from "./config.js";
import { t, getLang, onLangChange, onUser, isRealUser, usd, toast, toDate, esc } from "./common.js";

const $ = (id) => document.getElementById(id);

/* =========================================================
   Video
   ========================================================= */
$("heroVideo").src = SITE.youtubeEmbed;

$("copyLinkBtn").addEventListener("click", async () => {
  const url = "https://onedollardrive.com/";
  try {
    if (navigator.share) await navigator.share({ title: SITE.name, url });
    else { await navigator.clipboard.writeText(url); toast(t("common.copied")); }
  } catch (e) {
    if (e?.name !== "AbortError") toast(t("common.copyFail"));
  }
});

/* =========================================================
   Round (rounds/{ROUND_ID})
   ========================================================= */
let round = { ...ROUND_DEFAULTS, raisedUsd: 0, supporterCount: 0 };

onSnapshot(
  doc(db, "rounds", ROUND_ID),
  (snap) => {
    round = { ...ROUND_DEFAULTS, raisedUsd: 0, supporterCount: 0, ...(snap.exists() ? snap.data() : {}) };
    renderRound();
  },
  (err) => console.warn("round load failed:", err.code),
);

function fmtDate(d) {
  if (!d) return t("round.tbd");
  return d.toLocaleString(getLang() === "ko" ? "ko-KR" : "en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

function renderRound() {
  const n = round.number ?? 1;
  const eyebrow = $("heroEyebrow");
  eyebrow.dataset.varN = n;
  eyebrow.textContent = t("hero.eyebrow", { n });

  const status = ["upcoming", "open", "closed", "drawn"].includes(round.status) ? round.status : "upcoming";
  const pill = $("roundStatus");
  pill.textContent = t(`round.status.${status}`);
  pill.className = `status-pill is-${status}`;

  $("prizeTitle").textContent = round.prizeTitle;
  $("carName").textContent = round.carName;
  $("prizeArv").textContent = usd(round.prizeArvUsd);
  $("drawDate").textContent = fmtDate(toDate(round.drawAt));

  const raised = Number(round.raisedUsd) || 0;
  const goal = Number(round.milestoneUsd) || 1;
  const pct = Math.min(100, (raised / goal) * 100);
  $("milestoneBar").style.width = `${pct}%`;
  $("milestoneText").textContent = `${usd(raised)} / ${usd(goal)}`;

  const count = Number(round.supporterCount) || 0;
  $("supporterLine").textContent = count >= MIN_VISIBLE_COUNT
    ? t("round.supporters", { n: count.toLocaleString() })
    : t("round.firstSupporter", { n });

  tickCountdown();
}

function tickCountdown() {
  const el = $("countdown");
  const end = toDate(round.endsAt);
  if (!end) { el.textContent = t("round.tbd"); return; }
  let ms = end - Date.now();
  if (ms <= 0) { el.textContent = t("round.status.closed"); return; }
  const d = Math.floor(ms / 86400000); ms %= 86400000;
  const h = Math.floor(ms / 3600000); ms %= 3600000;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (x) => String(x).padStart(2, "0");
  el.textContent = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}
setInterval(tickCountdown, 1000);

/* =========================================================
   Shop
   ========================================================= */
function renderProducts() {
  const lang = getLang();
  const grid = $("productGrid");
  grid.innerHTML = "";
  for (const p of PRODUCTS) {
    const card = document.createElement("article");
    card.className = "product";

    const media = document.createElement("div");
    media.className = "product-media";
    if (p.image) {
      const img = document.createElement("img");
      img.src = p.image; img.alt = p.name.en; img.loading = "lazy";
      media.appendChild(img);
    } else {
      media.textContent = p.icon || "🏁";
    }

    const entries = p.entries === 1 ? t("shop.entry") : t("shop.entries", { n: p.entries });
    const body = document.createElement("div");
    body.className = "product-body";
    body.innerHTML = `
      <div class="product-top">
        <h3>${esc(p.name[lang] ?? p.name.en)}</h3>
        <span class="price">${esc(usd(p.priceUsd))}</span>
      </div>
      <p class="muted small">${esc(p.desc[lang] ?? p.desc.en)}</p>
      <span class="entries-pill">+ ${esc(entries)}</span>`;

    const buy = document.createElement(p.paypalLink ? "a" : "button");
    buy.className = "btn btn-block";
    if (p.paypalLink) {
      buy.href = p.paypalLink; buy.target = "_blank"; buy.rel = "noopener";
      buy.textContent = t("shop.buy");
      buy.addEventListener("click", () => window.gtag?.("event", "begin_checkout", { item_id: p.id, value: p.priceUsd, currency: "USD" }));
    } else {
      buy.disabled = true;
      buy.textContent = t("shop.soon");
    }
    body.appendChild(buy);

    card.append(media, body);
    grid.appendChild(card);
  }
}

/* =========================================================
   Supporters wall (rounds/{ROUND_ID}/supporters) — 관리자만 작성
   ========================================================= */
const wall = $("supporterWall");
let wallDocs = [];
onSnapshot(
  query(collection(db, "rounds", ROUND_ID, "supporters"), orderBy("createdAt", "desc"), limit(30)),
  (snap) => { wallDocs = snap.docs.map((d) => d.data()); renderWall(); },
  (err) => { console.warn("wall load failed:", err.code); renderWall(); },
);

function renderWall() {
  wall.innerHTML = "";
  if (!wallDocs.length) {
    const li = document.createElement("li");
    li.className = "wall-empty muted";
    li.textContent = t("wall.empty");
    wall.appendChild(li);
    return;
  }
  for (const s of wallDocs) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "wall-name";
    name.textContent = s.displayName || "Anonymous";
    const item = document.createElement("span");
    item.className = "wall-item muted";
    item.textContent = s.item || "";
    li.append(name, item);
    wall.appendChild(li);
  }
}

/* =========================================================
   Chat (messages)
   ========================================================= */
const chatBox = $("chatMessages");
const chatForm = $("chatForm");
const chatInput = $("chatInput");
const chatSend = $("chatSend");

function colorFor(uid = "") {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 80%, 60%)`;
}

onSnapshot(
  query(collection(db, "messages"), orderBy("timestamp", "asc"), limitToLast(50)),
  (snap) => {
    const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 60;
    chatBox.innerHTML = "";
    snap.forEach((d) => {
      const m = d.data();
      const row = document.createElement("div");
      row.className = "msg";

      const avatar = document.createElement("img");
      avatar.className = "avatar";
      avatar.alt = "";
      avatar.referrerPolicy = "no-referrer";
      avatar.style.borderColor = colorFor(m.uid);
      // 구글 프로필 이미지(https)만 허용
      if (typeof m.photoURL === "string" && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(m.photoURL)) {
        avatar.src = m.photoURL;
      } else {
        avatar.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23333'/%3E%3C/svg%3E";
      }

      const body = document.createElement("div");
      const name = document.createElement("div");
      name.className = "msg-name";
      name.style.color = colorFor(m.uid);
      name.textContent = m.name || "Anonymous";
      const text = document.createElement("div");
      text.className = "msg-text";
      text.textContent = m.text ?? "";
      body.append(name, text);

      row.append(avatar, body);
      chatBox.appendChild(row);
    });
    if (nearBottom) chatBox.scrollTop = chatBox.scrollHeight;
  },
  (err) => console.warn("chat load failed:", err.code),
);

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const text = chatInput.value.trim();
  if (!isRealUser(user) || !text) return;
  chatSend.disabled = true;
  try {
    await addDoc(collection(db, "messages"), {
      text: text.slice(0, 300),
      uid: user.uid,
      name: (user.displayName || "Anonymous").slice(0, 40),
      photoURL: user.photoURL || "",
      timestamp: serverTimestamp(),
    });
    chatInput.value = "";
  } catch (err) {
    console.error("send failed:", err);
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
});

function updateChatInput(user) {
  const real = isRealUser(user);
  chatInput.disabled = !real;
  chatSend.disabled = !real;
  chatInput.placeholder = t(real ? "chat.placeholderIn" : "chat.placeholderOut");
}

/* =========================================================
   Presence (Realtime Database) — 게스트는 익명 로그인으로 집계
   ========================================================= */
let presenceRef = null;

window.addEventListener("odd:before-auth-change", () => {
  if (presenceRef) { remove(presenceRef).catch(() => {}); presenceRef = null; }
});

onUser((user) => {
  updateChatInput(user);
  if (user === null && auth.currentUser === null) {
    // 게스트 → 익명 로그인 (Firebase 콘솔에서 Anonymous 공급자를 켜야 합니다)
    signInAnonymously(auth).catch(() => {});
    return;
  }
  if (!user) return;
  try {
    presenceRef = ref(rtdb(), `presence/${user.uid}`);
    onDisconnect(presenceRef).remove();
    set(presenceRef, { ts: rtdbTs() }).catch(() => {});
  } catch (e) { console.warn("presence unavailable", e); }
});

try {
  onValue(ref(rtdb(), "presence"), (snap) => {
    const n = snap.exists() ? Object.keys(snap.val()).length : 0;
    $("onlineCount").textContent = n;
    $("onlineBadge").hidden = n < MIN_VISIBLE_COUNT;
  }, () => {});
} catch {}

/* =========================================================
   Language re-render
   ========================================================= */
function rerender() {
  renderProducts();
  renderRound();
  renderWall();
  updateChatInput(auth.currentUser);
  const free = $("freeBody");
  free.textContent = t("free.body", { n: FREE_ENTRIES_PER_DAY });
  $("faqA5").textContent = t("faq.a5", { email: SITE.contactEmail });
}
onLangChange(rerender);
rerender();
