import {
  doc, collection, onSnapshot, query, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { SITE, ROUND_ID, ROUND_DEFAULTS, PRODUCTS, MIN_VISIBLE_COUNT, FREE_ENTRIES_PER_DAY } from "./config.js";
import { t, getLang, onLangChange, usd, toast, toDate, esc } from "./common.js";

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
   Community preview (최근 게시물 6개)
   ========================================================= */
let previewPosts = [];
onSnapshot(
  query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(6)),
  (snap) => { previewPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.hidden); renderPreview(); },
  (err) => { console.warn("posts load failed:", err.code); renderPreview(); },
);

function renderPreview() {
  const box = $("garagePreview");
  box.innerHTML = "";
  if (!previewPosts.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("home.garageEmpty");
    box.appendChild(p);
    return;
  }
  for (const p of previewPosts) {
    const a = document.createElement("a");
    a.className = "gp-tile";
    a.href = `./community.html?p=${encodeURIComponent(p.id)}`;
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = p.carName || "";
    img.src = p.images?.[0]?.url || "";
    const cap = document.createElement("span");
    cap.className = "gp-cap";
    cap.textContent = p.carName || "";
    a.append(img, cap);
    box.appendChild(a);
  }
}

/* =========================================================
   Language re-render
   ========================================================= */
function rerender() {
  renderProducts();
  renderRound();
  renderWall();
  renderPreview();
  const free = $("freeBody");
  free.textContent = t("free.body", { n: FREE_ENTRIES_PER_DAY });
  $("faqA5").textContent = t("faq.a5", { email: SITE.contactEmail });
}
onLangChange(rerender);
rerender();
