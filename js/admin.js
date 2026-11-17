import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch, increment, serverTimestamp,
  Timestamp, addDoc, query, where, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { db, storage } from "./firebase.js";
import { ROUND_ID, ROUND_DEFAULTS, PRODUCTS } from "./config.js";
import { usd, toDate, timeAgo } from "./common.js";
import { onAccount, openSignIn } from "./account.js";

const $ = (id) => document.getElementById(id);
const roundRef = doc(db, "rounds", ROUND_ID);

function note(elId, kind, text) {
  const box = $(elId);
  box.innerHTML = "";
  if (!text) return;
  const n = document.createElement("div");
  n.className = `notice ${kind}`;
  n.textContent = text;
  box.appendChild(n);
}

/* ---------------- 권한 확인 ---------------- */
onAccount(async ({ user }) => {
  const gate = $("gate");
  $("panel").hidden = true;
  if (!user) {
    gate.hidden = false;
    gate.innerHTML = "<p>관리자 계정으로 로그인하세요.</p>";
    const b = document.createElement("button");
    b.className = "btn"; b.textContent = "로그인"; b.addEventListener("click", openSignIn);
    gate.appendChild(b);
    return;
  }
  const adminSnap = await getDoc(doc(db, "admins", user.uid)).catch(() => null);
  if (!adminSnap?.exists()) {
    gate.hidden = false;
    gate.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = "이 계정은 관리자가 아닙니다. Firebase 콘솔 → Firestore에서 admins 컬렉션에 아래 UID로 문서를 하나 만드세요.";
    const code = document.createElement("code");
    code.textContent = user.uid;
    gate.append(p, code);
    return;
  }
  gate.hidden = true;
  $("panel").hidden = false;
  $("roundIdLabel").textContent = `(${ROUND_ID})`;
  loadRound();
  loadSubs();
  loadReports();
});

/* ---------------- 회차 ---------------- */
function toLocalInput(v) {
  const d = toDate(v);
  if (!d) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 16);
}
function fromLocalInput(s) {
  return s ? Timestamp.fromDate(new Date(s)) : null;
}

async function loadRound() {
  const snap = await getDoc(roundRef);
  const r = { ...ROUND_DEFAULTS, raisedUsd: 0, supporterCount: 0, ...(snap.exists() ? snap.data() : {}) };
  $("r_number").value = r.number;
  $("r_status").value = r.status;
  $("r_carName").value = r.carName;
  $("r_prizeTitle").value = r.prizeTitle;
  $("r_prizeArvUsd").value = r.prizeArvUsd;
  $("r_milestoneUsd").value = r.milestoneUsd;
  $("r_startsAt").value = toLocalInput(r.startsAt);
  $("r_endsAt").value = toLocalInput(r.endsAt);
  $("r_drawAt").value = toLocalInput(r.drawAt);
  $("roundStats").textContent = `누적 ${usd(r.raisedUsd, { cents: true })} · 주문 ${r.supporterCount}건`;
}

$("roundForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const arv = Number($("r_prizeArvUsd").value) || 0;
  const data = {
    number: Number($("r_number").value) || 1,
    status: $("r_status").value,
    carName: $("r_carName").value.trim(),
    prizeTitle: $("r_prizeTitle").value.trim(),
    prizeArvUsd: arv,
    milestoneUsd: Number($("r_milestoneUsd").value) || 0,
    startsAt: fromLocalInput($("r_startsAt").value),
    endsAt: fromLocalInput($("r_endsAt").value),
    drawAt: fromLocalInput($("r_drawAt").value),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(roundRef, data, { merge: true });
    note("roundMsg", arv > 5000 ? "info" : "ok",
      arv > 5000
        ? "저장했습니다. 단, 상품 가치가 $5,000를 넘어 뉴욕·플로리다 등록/보증 대상일 수 있습니다."
        : "저장했습니다.");
    loadRound();
  } catch (err) {
    note("roundMsg", "err", `저장 실패: ${err.code || err.message}`);
  }
});

/* ---------------- 주문 기록 ---------------- */
const productSel = $("o_product");
productSel.innerHTML = PRODUCTS.map((p) => `<option value="${p.id}">${p.name.en} — $${p.priceUsd} / ${p.entries} entries</option>`).join("");

function fillFromProduct() {
  const p = PRODUCTS.find((x) => x.id === productSel.value);
  const qty = Math.max(1, Number($("o_qty").value) || 1);
  if (!p) return;
  $("o_amount").value = (p.priceUsd * qty).toFixed(2);
  $("o_entries").value = p.entries * qty;
}
productSel.addEventListener("change", fillFromProduct);
$("o_qty").addEventListener("input", fillFromProduct);
fillFromProduct();

$("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("o_email").value.trim().toLowerCase();
  const txn = $("o_txn").value.trim().replace(/[^A-Za-z0-9_-]/g, "");
  const p = PRODUCTS.find((x) => x.id === productSel.value);
  const amount = Number($("o_amount").value) || 0;
  const entries = Math.max(0, Math.floor(Number($("o_entries").value) || 0));
  if (!email || !txn || !p) { note("orderMsg", "err", "이메일, 상품, 거래 ID를 입력하세요."); return; }

  const batch = writeBatch(db);
  batch.set(doc(db, "rounds", ROUND_ID, "entries", `paypal_${txn}`), {
    email,
    name: $("o_name").value.trim(),
    productId: p.id,
    qty: Math.max(1, Number($("o_qty").value) || 1),
    amountUsd: amount,
    entries,
    paypalTxnId: txn,
    createdAt: serverTimestamp(),
  });
  batch.set(roundRef, { raisedUsd: increment(amount), supporterCount: increment(1) }, { merge: true });
  // 구매 이력 → 댓글 권한
  batch.set(doc(db, "buyers", email), { orders: increment(1), lastOrderAt: serverTimestamp() }, { merge: true });
  if ($("o_wall").checked && $("o_display").value.trim()) {
    batch.set(doc(collection(db, "rounds", ROUND_ID, "supporters")), {
      displayName: $("o_display").value.trim().slice(0, 40),
      item: p.name.en,
      createdAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
    note("orderMsg", "ok", `기록 완료: ${email} · 응모권 ${entries}장`);
    $("orderForm").reset();
    fillFromProduct();
    loadRound();
  } catch (err) {
    note("orderMsg", "err", err.code === "permission-denied"
      ? "저장 실패: 이미 기록된 거래 ID이거나 권한이 없습니다."
      : `저장 실패: ${err.code || err.message}`);
  }
});

/* ---------------- 응모 현황 / CSV / 추첨 ---------------- */
let pool = []; // { source, id, name, email, state, entries }

$("loadEntries").addEventListener("click", async () => {
  $("entrySummary").textContent = "불러오는 중…";
  const [paid, free] = await Promise.all([
    getDocs(collection(db, "rounds", ROUND_ID, "entries")),
    getDocs(collection(db, "rounds", ROUND_ID, "freeEntries")),
  ]);
  pool = [];
  paid.forEach((d) => { const x = d.data(); pool.push({ source: "purchase", id: d.id, name: x.name, email: x.email, state: "", entries: Number(x.entries) || 0 }); });
  free.forEach((d) => { const x = d.data(); pool.push({ source: "free", id: d.id, name: x.name, email: x.email, state: x.state, entries: Number(x.entries) || 0 }); });

  const total = pool.reduce((a, b) => a + b.entries, 0);
  const people = new Set(pool.map((x) => x.email)).size;
  $("entrySummary").textContent = `총 응모권 ${total.toLocaleString()}장 · 참여자 ${people}명 · 유료 기록 ${paid.size}건 · 무료 기록 ${free.size}건`;

  const table = $("entryTable");
  table.innerHTML = "<tr><th>구분</th><th>이름</th><th>이메일</th><th>주</th><th>응모권</th></tr>";
  for (const r of pool) {
    const tr = document.createElement("tr");
    for (const v of [r.source, r.name, r.email, r.state, r.entries]) {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  $("csvBtn").disabled = !pool.length;
  $("drawBtn").disabled = !total;
});

$("csvBtn").addEventListener("click", () => {
  const rows = [["source", "id", "name", "email", "state", "entries"], ...pool.map((r) => [r.source, r.id, r.name, r.email, r.state, r.entries])];
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  a.download = `${ROUND_ID}-entries.csv`;
  a.click();
});

// 암호학적으로 안전한 균등 난수 [0, max)
function secureRandomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

$("drawBtn").addEventListener("click", async () => {
  const total = pool.reduce((a, b) => a + b.entries, 0);
  if (!total) return;
  if (!confirm(`응모권 ${total}장 중에서 1장을 추첨합니다. 결과는 기록으로 남습니다. 진행할까요?`)) return;

  const ticket = secureRandomInt(total);
  let acc = 0;
  const winner = pool.find((r) => (acc += r.entries) > ticket);

  try {
    await addDoc(collection(db, "rounds", ROUND_ID, "draws"), {
      ticket, totalTickets: total,
      winnerEmail: winner.email, winnerName: winner.name, source: winner.source, recordId: winner.id,
      drawnAt: serverTimestamp(),
    });
  } catch (err) {
    note("drawResult", "err", `추첨 기록 저장 실패: ${err.code || err.message}`);
    return;
  }
  const box = $("drawResult");
  box.innerHTML = "";
  const w = document.createElement("div");
  w.className = "notice ok";
  w.innerHTML = `<div class="winner"></div><div class="small"></div>`;
  w.firstChild.textContent = `${winner.name} (${winner.email})`;
  w.lastChild.textContent = `당첨 응모권 #${ticket + 1} / ${total} · ${winner.source} · ${winner.id}. 당첨자 자격 확인 후 연락하세요.`;
  box.appendChild(w);
});

/* =========================================================
   탭
   ========================================================= */
document.querySelectorAll("#adminTabs button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#adminTabs button").forEach((x) => x.classList.toggle("is-on", x === b));
    document.querySelectorAll(".admin-sec").forEach((s) => { s.hidden = s.id !== b.dataset.sec; });
    if (b.dataset.sec === "secPosts") loadPosts();
    if (b.dataset.sec === "secSubs") loadSubs();
    if (b.dataset.sec === "secReports") loadReports();
  });
});

/* =========================================================
   이미지 처리 (EXIF 제거 + 리사이즈)
   ========================================================= */
async function cleanImage(blobOrFile, max = 1600) {
  const bmp = await createImageBitmap(blobOrFile, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.86));
  return { blob, w, h };
}

async function st() {
  const mod = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js");
  return { ...mod, s: await storage() };
}

// 게시물용 이미지 업로드 → [{url, path, w, h}]
async function uploadPostImages(postId, blobs) {
  const { ref, uploadBytes, getDownloadURL, s } = await st();
  const out = [];
  for (let i = 0; i < blobs.length; i++) {
    const { blob, w, h } = blobs[i];
    const path = `posts/${postId}/${i}.jpg`;
    const r = ref(s, path);
    await uploadBytes(r, blob, { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" });
    out.push({ url: await getDownloadURL(r), path, w, h });
  }
  return out;
}

function parseTags(v) {
  return [...new Set(String(v || "").split(",").map((x) => x.trim().toLowerCase().replace(/[^a-z0-9가-힣_-]/g, "")).filter(Boolean))].slice(0, 10);
}

/* =========================================================
   새 게시물
   ========================================================= */
$("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const files = [...$("p_files").files].slice(0, 10);
  if (!files.length) { note("postMsg", "err", "사진을 1장 이상 선택하세요."); return; }
  const btn = $("p_send");
  btn.disabled = true; btn.textContent = "업로드 중…";
  try {
    const postRef = doc(collection(db, "posts"));
    const blobs = [];
    for (const f of files) blobs.push(await cleanImage(f));
    const images = await uploadPostImages(postRef.id, blobs);
    await setDoc(postRef, {
      carName: $("p_car").value.trim(),
      caption: $("p_caption").value.trim(),
      tags: parseTags($("p_tags").value),
      images,
      featured: null,
      pinned: $("p_pinned").checked,
      hidden: false,
      likeCount: 0,
      createdAt: serverTimestamp(),
    });
    note("postMsg", "ok", "게시했습니다.");
    $("postForm").reset();
  } catch (err) {
    console.error(err);
    note("postMsg", "err", `실패: ${err.code || err.message}`);
  } finally {
    btn.disabled = false; btn.textContent = "게시하기";
  }
});

/* =========================================================
   차고 제출 승인 / 반려
   ========================================================= */
async function loadSubs() {
  const box = $("subList");
  box.textContent = "불러오는 중…";
  try {
    const snap = await getDocs(query(collection(db, "garageSubmissions"), where("status", "==", "pending"), limit(50)));
    $("subBadge").hidden = snap.empty;
    $("subBadge").textContent = snap.size;
    box.innerHTML = "";
    if (snap.empty) { box.innerHTML = '<p class="muted">대기 중인 제출이 없습니다.</p>'; return; }
    const { ref, getDownloadURL, s } = await st();
    for (const d of snap.docs) {
      const sub = { id: d.id, ...d.data() };
      const card = document.createElement("div");
      card.className = "sub-card";
      card.innerHTML = `
        <div class="sub-imgs"></div>
        <div>
          <div class="small muted"></div>
          <div class="grid2">
            <div class="field"><label>차량명</label><input class="f-car"></div>
            <div class="field"><label>태그</label><input class="f-tags" placeholder="porsche, gt3"></div>
          </div>
          <div class="field"><label>본문 (수정 가능)</label><textarea class="f-cap" rows="3"></textarea></div>
          <div class="row">
            <button class="btn f-ok">승인하고 게시</button>
            <input class="f-reason" placeholder="반려 사유 (제출자에게 표시)" style="flex:1; min-width:180px; background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:8px; padding:.55rem .7rem">
            <button class="btn btn-ghost f-no">반려</button>
          </div>
          <div class="f-msg" style="margin-top:.6rem"></div>
        </div>`;
      card.querySelector(".small.muted").textContent = `@${sub.nickname} · ${timeAgo(toDate(sub.createdAt))} · uid ${sub.uid}`;
      card.querySelector(".f-car").value = sub.carName || "";
      card.querySelector(".f-cap").value = sub.caption || "";
      const imgs = card.querySelector(".sub-imgs");
      for (const im of sub.images || []) {
        const img = document.createElement("img");
        img.alt = "";
        getDownloadURL(ref(s, im.path)).then((u) => { img.src = u; img.addEventListener("click", () => window.open(u, "_blank")); }).catch(() => {});
        imgs.appendChild(img);
      }
      const msgBox = card.querySelector(".f-msg");
      const say = (kind, text) => { msgBox.innerHTML = ""; const n = document.createElement("div"); n.className = `notice ${kind}`; n.textContent = text; msgBox.appendChild(n); };

      card.querySelector(".f-ok").addEventListener("click", async (e) => {
        e.target.disabled = true;
        try {
          const { getBytes } = await st();
          const postRef = doc(collection(db, "posts"));
          const blobs = [];
          for (const im of sub.images || []) {
            const bytes = await getBytes(ref(s, im.path));
            blobs.push(await cleanImage(new Blob([bytes], { type: "image/jpeg" })));
          }
          const images = await uploadPostImages(postRef.id, blobs);
          const batch = writeBatch(db);
          batch.set(postRef, {
            carName: card.querySelector(".f-car").value.trim(),
            caption: card.querySelector(".f-cap").value.trim(),
            tags: parseTags(card.querySelector(".f-tags").value),
            images,
            featured: { uid: sub.uid, nickname: sub.nickname, avatarId: sub.avatarId ?? 0 },
            pinned: false,
            hidden: false,
            likeCount: 0,
            createdAt: serverTimestamp(),
          });
          batch.update(doc(db, "garageSubmissions", sub.id), { status: "approved", postId: postRef.id, reviewedAt: serverTimestamp() });
          await batch.commit();
          say("ok", "게시했습니다.");
          setTimeout(() => card.remove(), 900);
        } catch (err) {
          console.error(err);
          say("err", `실패: ${err.code || err.message}`);
          e.target.disabled = false;
        }
      });

      card.querySelector(".f-no").addEventListener("click", async (e) => {
        if (!confirm("반려하고 사진을 삭제할까요?")) return;
        e.target.disabled = true;
        try {
          const { deleteObject } = await st();
          await updateDoc(doc(db, "garageSubmissions", sub.id), {
            status: "rejected", reason: card.querySelector(".f-reason").value.trim().slice(0, 200), reviewedAt: serverTimestamp(),
          });
          for (const im of sub.images || []) await deleteObject(ref(s, im.path)).catch(() => {});
          card.remove();
        } catch (err) {
          say("err", `실패: ${err.code || err.message}`);
          e.target.disabled = false;
        }
      });
      box.appendChild(card);
    }
  } catch (err) {
    console.error(err);
    box.textContent = `불러오기 실패: ${err.code || err.message}`;
  }
}

/* =========================================================
   게시물 관리 (숨김 / 삭제)
   ========================================================= */
async function loadPosts() {
  const box = $("postList");
  box.textContent = "불러오는 중…";
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50)));
  box.innerHTML = "";
  if (snap.empty) { box.innerHTML = '<p class="muted">게시물이 없습니다.</p>'; return; }
  snap.forEach((d) => {
    const p = { id: d.id, ...d.data() };
    const row = document.createElement("div");
    row.className = `list-row${p.hidden ? " is-hidden-post" : ""}`;
    row.innerHTML = `<img alt=""><div class="grow"><b></b><div class="small muted"></div></div>
      <a class="btn btn-ghost btn-sm" target="_blank">보기</a>
      <button class="btn btn-ghost btn-sm f-hide"></button>
      <button class="btn btn-ghost btn-sm f-del">삭제</button>`;
    row.querySelector("img").src = p.images?.[0]?.url || "";
    row.querySelector("b").textContent = p.carName || "(차량명 없음)";
    row.querySelector(".small").textContent = `${p.featured ? "@" + p.featured.nickname : "운영자"} · 레브 ${p.likeCount || 0} · ${timeAgo(toDate(p.createdAt))}`;
    row.querySelector("a").href = `./community.html?p=${p.id}`;
    const hideBtn = row.querySelector(".f-hide");
    hideBtn.textContent = p.hidden ? "공개" : "숨김";
    hideBtn.addEventListener("click", async () => {
      p.hidden = !p.hidden;
      await updateDoc(doc(db, "posts", p.id), { hidden: p.hidden });
      hideBtn.textContent = p.hidden ? "공개" : "숨김";
      row.classList.toggle("is-hidden-post", p.hidden);
    });
    row.querySelector(".f-del").addEventListener("click", async () => {
      if (!confirm("게시물을 삭제할까요? (댓글·좋아요 기록은 남지만 화면에서 사라집니다)")) return;
      try {
        const { ref, deleteObject, s } = await st();
        for (const im of p.images || []) await deleteObject(ref(s, im.path)).catch(() => {});
        await deleteDoc(doc(db, "posts", p.id));
        row.remove();
      } catch (err) { alert(`실패: ${err.code || err.message}`); }
    });
    box.appendChild(row);
  });
}

/* =========================================================
   신고 처리
   ========================================================= */
async function loadReports() {
  const box = $("reportList");
  box.textContent = "불러오는 중…";
  try {
    const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(100)));
    $("repBadge").hidden = snap.empty;
    $("repBadge").textContent = snap.size;
    box.innerHTML = "";
    if (snap.empty) { box.innerHTML = '<p class="muted">신고가 없습니다.</p>'; return; }
    snap.forEach((d) => {
      const r = { id: d.id, ...d.data() };
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `<div class="grow"><div class="r-text"></div><div class="small muted"></div></div>
        <a class="btn btn-ghost btn-sm" target="_blank">게시물</a>
        <button class="btn btn-sm f-del">댓글 삭제</button>
        <button class="btn btn-ghost btn-sm f-dismiss">무시</button>`;
      row.querySelector(".r-text").textContent = `“${r.commentText}”`;
      row.querySelector(".small").textContent = `작성자 uid ${r.commentUid} · 신고 ${timeAgo(toDate(r.createdAt))}`;
      row.querySelector("a").href = `./community.html?p=${r.postId}`;
      row.querySelector(".f-del").addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", r.postId, "comments", r.commentId)).catch(() => {});
        await deleteDoc(doc(db, "reports", r.id));
        row.remove();
      });
      row.querySelector(".f-dismiss").addEventListener("click", async () => {
        await deleteDoc(doc(db, "reports", r.id));
        row.remove();
      });
      box.appendChild(row);
    });
  } catch (err) {
    box.textContent = `불러오기 실패: ${err.code || err.message}`;
  }
}

/* =========================================================
   댓글 권한 수동 부여 / 회수
   ========================================================= */
$("buyerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("b_email").value.trim().toLowerCase();
  if (!email) return;
  try {
    await setDoc(doc(db, "buyers", email), { manual: true, grantedAt: serverTimestamp() }, { merge: true });
    note("buyerMsg", "ok", `${email} 에 댓글 권한을 부여했습니다.`);
  } catch (err) { note("buyerMsg", "err", `실패: ${err.code || err.message}`); }
});
$("b_revoke").addEventListener("click", async () => {
  const email = $("b_email").value.trim().toLowerCase();
  if (!email || !confirm(`${email} 의 댓글 권한을 회수할까요?`)) return;
  try {
    await deleteDoc(doc(db, "buyers", email));
    note("buyerMsg", "ok", "회수했습니다.");
  } catch (err) { note("buyerMsg", "err", `실패: ${err.code || err.message}`); }
});
