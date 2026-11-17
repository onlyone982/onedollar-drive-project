import {
  doc, getDoc, setDoc, collection, getDocs, writeBatch, increment, serverTimestamp, Timestamp, addDoc,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { ROUND_ID, ROUND_DEFAULTS, PRODUCTS } from "./config.js";
import { onUser, isRealUser, usd, toDate } from "./common.js";

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
onUser(async (user) => {
  const gate = $("gate");
  $("panel").hidden = true;
  if (!isRealUser(user)) {
    gate.hidden = false;
    gate.textContent = "관리자 계정으로 로그인하세요.";
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
