// The Garage — 인스타그램형 커뮤니티 피드
import {
  collection, doc, query, orderBy, limit, startAfter, where, getDocs, getDoc, addDoc, setDoc, deleteDoc,
  writeBatch, increment, serverTimestamp, getCountFromServer,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { db, storage } from "./firebase.js";
import { COMMUNITY } from "./config.js";
import { t, esc, toast, toDate, timeAgo, openModal, onLangChange, applyI18n } from "./common.js";
import { account, onAccount, requireProfile, openSignIn } from "./account.js";
import { avatarSvg } from "./avatars.js";

const $ = (id) => document.getElementById(id);
const PAGE = 24;          // 한 번에 불러오는 게시물 수
const RENDER_STEP = 8;    // 피드에 한 번에 그리는 수

/* =========================================================
   아이콘
   ========================================================= */
const ICON = {
  rev: `<svg class="ic-rev" viewBox="0 0 32 32" aria-hidden="true">
          <path class="tach-arc" d="M5 22a11 11 0 1 1 22 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
          <path class="tach-red" d="M24.5 13.5a11 11 0 0 1 2.5 8.5" fill="none" stroke="#e2232a" stroke-width="2.6" stroke-linecap="round"/>
          <g class="needle"><line x1="16" y1="22" x2="9" y2="15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></g>
          <circle cx="16" cy="22" r="2.6" fill="currentColor"/>
        </svg>`,
  comment: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 8h20v13H14l-6 5v-5H6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  share: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M27 5 13 19M27 5l-8 22-6-8-8-6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  dots: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="8" cy="16" r="2.4" fill="currentColor"/><circle cx="16" cy="16" r="2.4" fill="currentColor"/><circle cx="24" cy="16" r="2.4" fill="currentColor"/></svg>`,
  official: `<svg class="av" width="36" height="36" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#111"/><circle cx="32" cy="32" r="30" fill="none" stroke="#ffcc00" stroke-width="3"/><text x="32" y="41" text-anchor="middle" font-family="Orbitron, sans-serif" font-weight="800" font-size="26" fill="#ffcc00">$</text></svg>`,
};

/* =========================================================
   상태
   ========================================================= */
let posts = [];          // 불러온 게시물
let cursor = null;       // 페이지네이션 커서
let exhausted = false;
let tab = "foryou";
let rendered = 0;
const likedCache = new Map();  // postId -> boolean
const countCache = new Map();  // postId -> comment count

/* =========================================================
   개인화(로컬): 좋아요한 태그 / 본 게시물
   ========================================================= */
function readLS(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
const affinity = readLS("odd_tag_affinity", {});
const seen = new Set(readLS("odd_seen_posts", []));

function bumpAffinity(post, delta) {
  for (const tag of post.tags || []) affinity[tag] = Math.max(0, (affinity[tag] || 0) + delta);
  writeLS("odd_tag_affinity", affinity);
}
function markSeen(id) {
  if (seen.has(id)) return;
  seen.add(id);
  writeLS("odd_seen_posts", [...seen].slice(-400));
}

/* =========================================================
   랭킹 — For you
   점수 = 인기(레브) × 신선도 × 취향 가중치 × 본 글 감점
   ========================================================= */
function score(p) {
  const created = toDate(p.createdAt)?.getTime() ?? Date.now();
  const ageH = Math.max(0, (Date.now() - created) / 3600000);
  const pop = Math.pow((p.likeCount || 0) + 1, 0.8);
  const fresh = 1 / Math.pow(ageH + 2, 1.2);
  const aff = (p.tags || []).reduce((a, tg) => a + Math.min(affinity[tg] || 0, 5), 0);
  const taste = 1 + 0.25 * aff;
  const pin = p.pinned ? 4 : 1;
  const seenPenalty = seen.has(p.id) ? 0.55 : 1;
  return pop * fresh * taste * pin * seenPenalty;
}

function ordered() {
  const list = posts.filter((p) => !p.hidden);
  if (tab === "latest") return list;
  if (tab === "explore") return [...list].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  return [...list].sort((a, b) => score(b) - score(a));
}

/* =========================================================
   데이터 로드
   ========================================================= */
async function loadMore() {
  if (exhausted) return;
  let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(PAGE));
  if (cursor) q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE));
  try {
    const snap = await getDocs(q);
    if (snap.docs.length) cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < PAGE) exhausted = true;
    posts.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.warn("posts load failed", e.code);
    exhausted = true;
  }
}

/* =========================================================
   렌더 — 피처드 릴
   ========================================================= */
function renderReel() {
  const reel = $("featuredReel");
  reel.innerHTML = "";
  const feat = posts.filter((p) => !p.hidden && p.featured?.nickname).slice(0, 12);
  if (!feat.length) { reel.hidden = true; return; }
  reel.hidden = false;
  const label = document.createElement("div");
  label.className = "reel-label tiny muted";
  label.textContent = t("cm.featured");
  reel.appendChild(label);
  const row = document.createElement("div");
  row.className = "reel-row";
  for (const p of feat) {
    const b = document.createElement("button");
    b.className = `reel-item${seen.has(p.id) ? " is-seen" : ""}`;
    b.innerHTML = `<span class="reel-ring">${avatarSvg(p.featured.avatarId, 58)}</span><span class="reel-name"></span>`;
    b.querySelector(".reel-name").textContent = p.featured.nickname;
    b.addEventListener("click", () => openPost(p));
    row.appendChild(b);
  }
  reel.appendChild(row);
}

/* =========================================================
   렌더 — 피드
   ========================================================= */
function renderFeed(reset = true) {
  const feed = $("feed");
  const grid = $("grid");
  const list = ordered();

  if (tab === "explore") {
    feed.hidden = true; grid.hidden = false;
    grid.innerHTML = "";
    if (!list.length) grid.innerHTML = `<p class="muted">${esc(t("cm.empty"))}</p>`;
    for (const p of list) grid.appendChild(gridTile(p));
    $("moreBtn").hidden = exhausted;
    return;
  }

  feed.hidden = false; grid.hidden = true;
  if (reset) { feed.innerHTML = ""; rendered = 0; }
  if (!list.length) { feed.innerHTML = `<p class="muted empty">${esc(t("cm.empty"))}</p>`; $("moreBtn").hidden = true; return; }
  const next = list.slice(rendered, rendered + RENDER_STEP);
  for (const p of next) feed.appendChild(postCard(p));
  rendered += next.length;
  $("moreBtn").hidden = rendered >= list.length && exhausted;
}

function gridTile(p) {
  const a = document.createElement("button");
  a.className = "tile";
  a.innerHTML = `<img alt="" loading="lazy"><span class="tile-over"><span>${ICON.rev}<b></b></span></span>${(p.images?.length || 0) > 1 ? '<span class="tile-multi">❐</span>' : ""}`;
  a.querySelector("img").src = p.images?.[0]?.url || "";
  a.querySelector("img").alt = p.carName || "";
  a.querySelector("b").textContent = (p.likeCount || 0).toLocaleString();
  a.addEventListener("click", () => openPost(p));
  return a;
}

function authorBlock(p) {
  if (p.featured?.nickname) {
    return `${avatarSvg(p.featured.avatarId, 36)}
      <div class="who"><span class="who-name">${esc(p.featured.nickname)}</span>
      <span class="who-sub tiny muted">${esc(t("cm.featuredBy"))} · ${esc(timeAgo(toDate(p.createdAt)))}</span></div>`;
  }
  return `${ICON.official}
    <div class="who"><span class="who-name">${esc(t("cm.official"))} <span class="verified" title="Official">✓</span></span>
    <span class="who-sub tiny muted">${esc(timeAgo(toDate(p.createdAt)))}</span></div>`;
}

function carousel(p) {
  const imgs = p.images || [];
  const wrap = document.createElement("div");
  wrap.className = "media";
  wrap.innerHTML = `<div class="slides">${imgs.map(() => `<div class="slide"><img alt="" loading="lazy" draggable="false"></div>`).join("")}</div>
    ${imgs.length > 1 ? `<span class="media-count">1/${imgs.length}</span><div class="media-dots">${imgs.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>` : ""}
    <div class="burst" aria-hidden="true"><div class="burst-tach">${ICON.rev}</div><span>REV!</span></div>`;
  wrap.querySelectorAll(".slide img").forEach((img, i) => { img.src = imgs[i].url; img.alt = p.carName || ""; });

  const slides = wrap.querySelector(".slides");
  if (imgs.length > 1) {
    slides.addEventListener("scroll", () => {
      const i = Math.round(slides.scrollLeft / slides.clientWidth);
      wrap.querySelector(".media-count").textContent = `${i + 1}/${imgs.length}`;
      wrap.querySelectorAll(".media-dots i").forEach((d, j) => d.classList.toggle("on", j === i));
    }, { passive: true });
  }
  return wrap;
}

function postCard(p) {
  const card = document.createElement("article");
  card.className = "post";
  card.dataset.id = p.id;

  const head = document.createElement("header");
  head.className = "post-head";
  head.innerHTML = `<div class="author">${authorBlock(p)}</div>${p.carName ? `<span class="plate"></span>` : ""}`;
  if (p.carName) head.querySelector(".plate").textContent = p.carName;

  const media = carousel(p);
  // 더블 탭(더블 클릭)으로 레브
  let lastTap = 0;
  media.addEventListener("click", (e) => {
    const now = Date.now();
    if (now - lastTap < 320) { e.preventDefault(); revBurst(media); if (!likedCache.get(p.id)) toggleLike(p, card); }
    lastTap = now;
  });

  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.innerHTML = `
    <button class="act act-rev" aria-label="Rev">${ICON.rev}</button>
    <button class="act act-comment" aria-label="Comments">${ICON.comment}</button>
    <button class="act act-share" aria-label="Share">${ICON.share}</button>`;
  actions.querySelector(".act-rev").addEventListener("click", () => toggleLike(p, card));
  actions.querySelector(".act-comment").addEventListener("click", () => openPost(p, { focus: true }));
  actions.querySelector(".act-share").addEventListener("click", () => sharePost(p));

  const body = document.createElement("div");
  body.className = "post-body";
  body.innerHTML = `
    <div class="revs"></div>
    ${p.caption ? `<p class="caption"><b></b> <span class="cap-text"></span></p>` : ""}
    ${(p.tags || []).length ? `<div class="tags">${p.tags.map((tg) => `<span>#${esc(tg)}</span>`).join("")}</div>` : ""}
    <button class="link-btn view-comments" hidden></button>`;
  if (p.caption) {
    body.querySelector(".caption b").textContent = p.featured?.nickname || "onedollardrive";
    const capEl = body.querySelector(".cap-text");
    capEl.textContent = p.caption;
    if (p.caption.length > 140) {
      capEl.classList.add("clamp");
      capEl.addEventListener("click", () => capEl.classList.remove("clamp"));
    }
  }
  body.querySelector(".view-comments").addEventListener("click", () => openPost(p));

  card.append(head, media, actions, body);
  updateRevUI(p, card);
  hydrateCard(p, card);

  // 화면에 보이면 '본 글'로 기록
  io.observe(card);
  return card;
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting && e.intersectionRatio > 0.6) { markSeen(e.target.dataset.id); io.unobserve(e.target); }
  }
}, { threshold: [0.6] });

async function hydrateCard(p, card) {
  // 내가 레브했는지
  if (account.user && !likedCache.has(p.id)) {
    try {
      const s = await getDoc(doc(db, "posts", p.id, "likes", account.user.uid));
      likedCache.set(p.id, s.exists());
    } catch { likedCache.set(p.id, false); }
  }
  updateRevUI(p, card);
  // 댓글 수
  if (!countCache.has(p.id)) {
    try {
      const c = await getCountFromServer(collection(db, "posts", p.id, "comments"));
      countCache.set(p.id, c.data().count);
    } catch { countCache.set(p.id, 0); }
  }
  const n = countCache.get(p.id) || 0;
  const vc = card.querySelector(".view-comments");
  if (vc) {
    vc.hidden = n === 0;
    vc.textContent = n === 1 ? t("cm.viewComment1") : t("cm.viewComments", { n: n.toLocaleString() });
  }
}

function updateRevUI(p, root) {
  const on = !!likedCache.get(p.id);
  root.querySelectorAll(".act-rev").forEach((b) => { b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
  const n = p.likeCount || 0;
  root.querySelectorAll(".revs").forEach((r) => { r.textContent = n === 1 ? t("cm.rev1") : t("cm.revs", { n: n.toLocaleString() }); });
}

function revBurst(media) {
  const b = media.querySelector(".burst");
  b.classList.remove("go"); void b.offsetWidth; b.classList.add("go");
}

/* =========================================================
   레브(좋아요)
   ========================================================= */
const pendingLike = new Set();
async function toggleLike(p, ...roots) {
  if (!requireProfile()) return;
  if (pendingLike.has(p.id)) return;
  pendingLike.add(p.id);
  const was = !!likedCache.get(p.id);
  // 낙관적 업데이트
  likedCache.set(p.id, !was);
  p.likeCount = (p.likeCount || 0) + (was ? -1 : 1);
  syncAll(p, roots);
  const batch = writeBatch(db);
  const likeRef = doc(db, "posts", p.id, "likes", account.user.uid);
  if (was) batch.delete(likeRef);
  else batch.set(likeRef, { uid: account.user.uid, createdAt: serverTimestamp() });
  batch.update(doc(db, "posts", p.id), { likeCount: increment(was ? -1 : 1) });
  try {
    await batch.commit();
    bumpAffinity(p, was ? -1 : 1);
    if (!was) window.gtag?.("event", "rev", { post_id: p.id });
  } catch (e) {
    console.error(e);
    likedCache.set(p.id, was);
    p.likeCount += was ? 1 : -1;
    syncAll(p, roots);
  } finally {
    pendingLike.delete(p.id);
  }
}
function syncAll(p, roots) {
  document.querySelectorAll(`.post[data-id="${CSS.escape(p.id)}"], .detail[data-id="${CSS.escape(p.id)}"]`).forEach((el) => updateRevUI(p, el));
  roots.forEach((r) => r && updateRevUI(p, r));
}

/* =========================================================
   공유
   ========================================================= */
async function sharePost(p) {
  const url = `${location.origin}${location.pathname}?p=${encodeURIComponent(p.id)}`;
  const title = p.carName ? `${p.carName} – One Dollar Drive` : "One Dollar Drive";
  try {
    if (navigator.share) await navigator.share({ title, url });
    else { await navigator.clipboard.writeText(url); toast(t("cm.shared")); }
    window.gtag?.("event", "share", { method: navigator.share ? "native" : "copy", item_id: p.id });
  } catch (e) {
    if (e?.name !== "AbortError") toast(t("common.copyFail"));
  }
}

/* =========================================================
   게시물 상세 + 댓글
   ========================================================= */
function containsBlocked(text) {
  const lower = text.toLowerCase();
  return COMMUNITY.blockedWords.some((w) => {
    if (/^[a-z ]+$/.test(w)) return new RegExp(`(^|[^a-z])${w.replace(/ /g, "\\s+")}([^a-z]|$)`).test(lower);
    return lower.includes(w);
  });
}

async function openPost(p, { focus = false } = {}) {
  markSeen(p.id);
  history.replaceState(null, "", `?p=${encodeURIComponent(p.id)}`);
  const m = openModal(`<div class="detail" data-id="${esc(p.id)}">
      <div class="detail-media"></div>
      <div class="detail-side">
        <header class="post-head"><div class="author">${authorBlock(p)}</div></header>
        <div class="detail-scroll">
          ${p.caption ? `<div class="cmt is-caption"><span class="cmt-av"></span><div><b></b> <span class="cap-full"></span></div></div>` : ""}
          <div class="cmt-list"><p class="muted small">…</p></div>
        </div>
        <div class="post-actions">
          <button class="act act-rev" aria-label="Rev">${ICON.rev}</button>
          <button class="act act-share" aria-label="Share">${ICON.share}</button>
          <span class="revs"></span>
        </div>
        <div class="cmt-compose"></div>
      </div>
    </div>`, {
    className: "modal-detail",
    onClose: () => history.replaceState(null, "", location.pathname),
  });

  const root = m.el.querySelector(".detail");
  const media = carousel(p);
  let lastTap = 0;
  media.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 320) { revBurst(media); if (!likedCache.get(p.id)) toggleLike(p, root); }
    lastTap = now;
  });
  root.querySelector(".detail-media").appendChild(media);
  if (p.carName) {
    const plate = document.createElement("span");
    plate.className = "plate";
    plate.textContent = p.carName;
    root.querySelector(".post-head").appendChild(plate);
  }
  if (p.caption) {
    root.querySelector(".is-caption .cmt-av").innerHTML = p.featured ? avatarSvg(p.featured.avatarId, 32) : ICON.official.replace('width="36" height="36"', 'width="32" height="32"');
    root.querySelector(".is-caption b").textContent = p.featured?.nickname || "onedollardrive";
    root.querySelector(".cap-full").textContent = p.caption;
  }
  root.querySelector(".act-rev").addEventListener("click", () => toggleLike(p, root));
  root.querySelector(".act-share").addEventListener("click", () => sharePost(p));
  updateRevUI(p, root);
  if (account.user && !likedCache.has(p.id)) hydrateCard(p, root);

  renderCompose(p, root, focus);
  loadComments(p, root);
}

async function loadComments(p, root) {
  const list = root.querySelector(".cmt-list");
  try {
    const snap = await getDocs(query(collection(db, "posts", p.id, "comments"), orderBy("createdAt", "asc"), limit(200)));
    list.innerHTML = "";
    if (snap.empty) { list.innerHTML = `<p class="muted small">${esc(t("cm.noComments"))}</p>`; }
    snap.forEach((d) => list.appendChild(commentRow(p, { id: d.id, ...d.data() }, root)));
    countCache.set(p.id, snap.size);
  } catch (e) {
    console.warn(e);
    list.innerHTML = "";
  }
}

function commentRow(p, c, root) {
  const row = document.createElement("div");
  row.className = "cmt";
  row.innerHTML = `<span class="cmt-av">${avatarSvg(c.avatarId, 32)}</span>
    <div class="cmt-body"><div><b></b> <span class="cmt-text"></span></div>
    <div class="cmt-meta tiny muted"><span class="when"></span></div></div>`;
  row.querySelector("b").textContent = c.nickname || "";
  row.querySelector(".cmt-text").textContent = c.text || "";
  row.querySelector(".when").textContent = timeAgo(toDate(c.createdAt));
  const meta = row.querySelector(".cmt-meta");

  if (account.user && (c.uid === account.user.uid || account.isAdmin)) {
    const del = document.createElement("button");
    del.className = "link-btn tiny";
    del.textContent = t("cm.delete");
    del.addEventListener("click", async () => {
      if (!confirm(t("cm.deleteConfirm"))) return;
      try {
        await deleteDoc(doc(db, "posts", p.id, "comments", c.id));
        row.remove();
        countCache.set(p.id, Math.max(0, (countCache.get(p.id) || 1) - 1));
      } catch (e) { console.error(e); }
    });
    meta.appendChild(del);
  } else if (account.user) {
    const rep = document.createElement("button");
    rep.className = "link-btn tiny";
    rep.textContent = t("cm.report");
    rep.addEventListener("click", async () => {
      if (!requireProfile()) return;
      if (!confirm(t("cm.reportConfirm"))) return;
      try {
        // 같은 사람이 같은 댓글을 여러 번 신고하지 못하도록 문서 ID 고정
        await setDoc(doc(db, "reports", `${p.id}_${c.id}_${account.user.uid}`), {
          type: "comment", postId: p.id, commentId: c.id,
          commentUid: c.uid || "", commentText: (c.text || "").slice(0, 300),
          reporterUid: account.user.uid, createdAt: serverTimestamp(),
        });
        toast(t("cm.reported"));
        rep.remove();
      } catch (e) { console.error(e); toast(t("cm.reported")); }
    });
    meta.appendChild(rep);
  }
  return row;
}

function renderCompose(p, root, focus) {
  const box = root.querySelector(".cmt-compose");
  box.innerHTML = "";
  if (!account.user || !account.profile) {
    box.innerHTML = `<button class="btn btn-ghost btn-block btn-sm">${esc(t("cm.signinToComment"))}</button>`;
    box.querySelector("button").addEventListener("click", () => requireProfile());
    return;
  }
  if (!account.isBuyer) {
    box.innerHTML = `<div class="locked small"><span>🔒</span><span>${esc(t("cm.buyersOnly"))}</span><a href="./#shop">${esc(t("cm.shopLink"))}</a></div>`;
    return;
  }
  box.innerHTML = `<form class="compose">${avatarSvg(account.profile.avatarId, 30)}
    <input maxlength="${COMMUNITY.maxCommentLength}" autocomplete="off" placeholder="${esc(t("cm.addComment"))}">
    <button class="link-btn post-btn" type="submit" disabled>${esc(t("cm.post"))}</button></form>`;
  const form = box.querySelector("form");
  const input = form.querySelector("input");
  const btn = form.querySelector("button");
  input.addEventListener("input", () => { btn.disabled = !input.value.trim(); });
  if (focus) setTimeout(() => input.focus(), 50);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, COMMUNITY.maxCommentLength);
    if (!text) return;
    if (containsBlocked(text)) { toast(t("cm.blocked")); return; }
    if (/(https?:\/\/|www\.)/i.test(text)) { toast(t("cm.blocked")); return; }
    btn.disabled = true;
    try {
      const data = {
        uid: account.user.uid,
        nickname: account.profile.nickname,
        avatarId: account.profile.avatarId,
        text,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "posts", p.id, "comments"), data);
      const list = root.querySelector(".cmt-list");
      if (list.querySelector("p.muted")) list.innerHTML = "";
      list.appendChild(commentRow(p, { id: ref.id, ...data, createdAt: new Date() }, root));
      input.value = "";
      countCache.set(p.id, (countCache.get(p.id) || 0) + 1);
      bumpAffinity(p, 1);
      const scroll = root.querySelector(".detail-scroll");
      scroll.scrollTop = scroll.scrollHeight;
      window.gtag?.("event", "comment", { post_id: p.id });
    } catch (err) {
      console.error(err);
      toast(t("signin.fail"));
    } finally {
      btn.disabled = !input.value.trim();
    }
  });
}

/* =========================================================
   Garage 제출
   ========================================================= */
// 사진을 다시 그려서 EXIF(위치 정보 포함)를 제거하고 크기를 줄입니다.
async function cleanImage(file, max = 1600) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.86));
  return { blob, w, h };
}

function openSubmit() {
  if (!requireProfile()) return;
  const m = openModal(`
    <h2 class="modal-title" data-i18n="sub.title"></h2>
    <p class="muted small" data-i18n="sub.sub"></p>
    <form id="subForm" class="stack" novalidate>
      <div class="field"><label for="subCar" data-i18n="sub.car"></label><input id="subCar" maxlength="60" required placeholder="Porsche 911 GT3 RS"></div>
      <div class="field"><label for="subCap" data-i18n="sub.caption"></label><textarea id="subCap" rows="3" maxlength="600"></textarea></div>
      <div class="field">
        <label for="subFiles">${esc(t("sub.photos", { n: COMMUNITY.maxSubmissionPhotos }))}</label>
        <input id="subFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple>
        <div class="thumbs" id="subThumbs"></div>
      </div>
      <p class="tiny muted" data-i18n="sub.rules"></p>
      <label class="check"><input type="checkbox" id="subAgree"> <span data-i18n="sub.agree"></span></label>
      <div class="js-msg"></div>
      <button class="btn btn-block" type="submit" id="subSend" data-i18n="sub.send"></button>
    </form>`, { className: "modal-sm" });

  const el = m.el;
  let files = [];
  el.querySelector("#subFiles").addEventListener("change", (e) => {
    files = [...e.target.files].slice(0, COMMUNITY.maxSubmissionPhotos);
    const th = el.querySelector("#subThumbs");
    th.innerHTML = "";
    files.forEach((f) => { const i = document.createElement("img"); i.src = URL.createObjectURL(f); th.appendChild(i); });
  });

  el.querySelector("#subForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const car = el.querySelector("#subCar").value.trim();
    const caption = el.querySelector("#subCap").value.trim();
    const box = el.querySelector(".js-msg");
    const note = (kind, text) => { box.innerHTML = ""; const n = document.createElement("div"); n.className = `notice ${kind}`; n.textContent = text; box.appendChild(n); };
    if (!car || !files.length || !el.querySelector("#subAgree").checked) { note("err", t("sub.err")); return; }
    if (containsBlocked(`${car} ${caption}`)) { note("err", t("cm.blocked")); return; }

    const send = el.querySelector("#subSend");
    send.disabled = true;
    send.textContent = t("sub.sending");
    try {
      const { ref: sref, uploadBytes } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js");
      const st = await storage();
      const subRef = doc(collection(db, "garageSubmissions"));
      const uid = account.user.uid;
      const images = [];
      for (let i = 0; i < files.length; i++) {
        const { blob, w, h } = await cleanImage(files[i]);
        const path = `submissions/${uid}/${subRef.id}/${i}.jpg`;
        await uploadBytes(sref(st, path), blob, { contentType: "image/jpeg" });
        images.push({ path, w, h });
      }
      await setDoc(subRef, {
        uid,
        nickname: account.profile.nickname,
        avatarId: account.profile.avatarId,
        carName: car,
        caption,
        images,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      note("ok", t("sub.done"));
      window.gtag?.("event", "garage_submit");
      setTimeout(m.close, 1400);
      loadMySubs();
    } catch (err) {
      console.error(err);
      note("err", t("signin.fail"));
      send.disabled = false;
      send.textContent = t("sub.send");
    }
  });
}

async function loadMySubs() {
  const box = $("mySubs");
  box.innerHTML = "";
  if (!account.user) return;
  try {
    const snap = await getDocs(query(collection(db, "garageSubmissions"), where("uid", "==", account.user.uid), limit(20)));
    if (snap.empty) return;
    const rows = snap.docs.map((d) => d.data()).sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0));
    const h = document.createElement("div");
    h.className = "tiny muted";
    h.textContent = t("sub.mine");
    box.appendChild(h);
    for (const s of rows) {
      const r = document.createElement("div");
      r.className = "sub-row small";
      r.innerHTML = `<span class="sub-car"></span><span class="sub-status is-${esc(s.status)}"></span>`;
      r.querySelector(".sub-car").textContent = s.carName;
      r.querySelector(".sub-status").textContent = t(`sub.status.${s.status}`);
      box.appendChild(r);
    }
  } catch (e) { console.warn("my subs", e.code); }
}

/* =========================================================
   부팅
   ========================================================= */
document.querySelectorAll(".shifter button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".shifter button").forEach((x) => x.classList.toggle("is-on", x === b));
    tab = b.dataset.tab;
    renderFeed(true);
  });
});

$("moreBtn").addEventListener("click", async () => {
  const list = ordered();
  if (rendered >= list.length || tab === "explore") { await loadMore(); renderReel(); renderFeed(tab === "explore"); }
  else renderFeed(false);
});

$("submitBtnTop").addEventListener("click", openSubmit);
$("submitBtnSide").addEventListener("click", openSubmit);

let booted = false;
onAccount(() => {
  if (!booted) return;
  likedCache.clear();
  renderFeed(true);
  loadMySubs();
  $("commentRuleCard").hidden = account.isBuyer;
});

onLangChange(() => { if (booted) { renderReel(); renderFeed(true); loadMySubs(); } });

(async function boot() {
  await loadMore();
  booted = true;
  renderReel();
  renderFeed(true);
  if (account.ready) { loadMySubs(); $("commentRuleCard").hidden = account.isBuyer; }

  // 공유 링크(?p=)로 들어온 경우 해당 게시물 열기
  const pid = new URLSearchParams(location.search).get("p");
  if (pid) {
    let p = posts.find((x) => x.id === pid);
    if (!p) {
      try { const s = await getDoc(doc(db, "posts", pid)); if (s.exists()) { p = { id: s.id, ...s.data() }; posts.push(p); } } catch {}
    }
    if (p && !p.hidden) openPost(p);
  }
})();
