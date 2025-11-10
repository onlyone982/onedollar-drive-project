// ✅ Firestore - serverTimestamp에 별칭
import {
  getFirestore, collection, addDoc, serverTimestamp as fsServerTimestamp,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ✅ Auth
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// ✅ Realtime Database - serverTimestamp에 별칭
import {
  getDatabase, ref, onDisconnect, set, onValue, serverTimestamp as rtdbServerTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ----------------- 공통 상태 ----------------- */
const db = getFirestore();
const auth = getAuth();
const provider = new GoogleAuthProvider();
const rtdb = getDatabase();

const loginBtn = document.querySelector(".login-button");
const logoutBtn = document.querySelector(".logout-button");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");

const progressBarEl = document.getElementById("progressBar");
const donorCountEl = document.getElementById("donorCount");
const supportAmountEl = document.getElementById("supportAmount");
const rankingListEl = document.getElementById("rankingList");

const GOAL = 400_000_000;
let displayedTotal = 0;
let animTimer = null;

/* ----------------- 로그인 ----------------- */
window.signInWithGoogle = async () => { await signInWithPopup(auth, provider); };
window.signOutFromGoogle = async () => { await signOut(auth); };

onAuthStateChanged(auth, (user) => {
  const isLoggedIn = !!user;
  localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");

  loginBtn.style.display = isLoggedIn ? "none" : "inline-block";
  logoutBtn.style.display = isLoggedIn ? "inline-block" : "none";
  chatInput.disabled = !isLoggedIn;
  sendMessageBtn.disabled = !isLoggedIn;

  // ✅ 다국어 placeholder 갱신
  const lang = localStorage.getItem("lang") || "ko";
  if (window.applyLang) window.applyLang(lang);

  // ✅ 현재 접속자 표시 (Presence)
  const uid = user ? user.uid : "guest_" + Date.now();
  const onlineRef = ref(rtdb, "presence/" + uid);

  set(onlineRef, { online: true, ts: rtdbServerTimestamp() });
  onDisconnect(onlineRef).remove();
});

/* ✅ 실시간 접속자 카운트 표시 */
const presenceListRef = ref(rtdb, "presence");
onValue(presenceListRef, (snap) => {
  const count = snap.exists() ? Object.keys(snap.val()).length : 0;
  const countEl = document.getElementById("onlineCount");
  if (countEl) countEl.textContent = count;
});

/* ----------------- 채팅 ----------------- */
const messagesRef = collection(db, "messages");

async function sendMessage() {
  const user = auth.currentUser;
  const text = chatInput.value.trim();
  if (!user || !text) return;

  const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
  await addDoc(messagesRef, {
    text,
    uid: user.uid,
    name: user.displayName,
    photoURL: user.photoURL,
    color: randomColor,
    timestamp: fsServerTimestamp(), // ✅ 오타 수정됨
  });

  chatInput.value = "";
}

chatInput?.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
sendMessageBtn?.addEventListener("click", sendMessage);

const qMessages = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(qMessages, (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const wrap = document.createElement("div");
    wrap.className = "chat-message";
    wrap.innerHTML = `
      <img src="${msg.photoURL || 'default.png'}" class="chat-profile" style="border-color:${msg.color}">
      <div>
        <span class="chat-username">${msg.name || 'Anonymous'}</span><br>
        <span>${escapeHtml(msg.text ?? '')}</span>
      </div>`;
    chatMessages.appendChild(wrap);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
/* ----------------- 팝업 ----------------- */
document.addEventListener("DOMContentLoaded", () => {
  const donateBtn = document.getElementById('donateBtn');
  const donatePopup = document.getElementById('donatePopup');
  const closePopup = document.getElementById('closePopup');

  if (donateBtn && donatePopup && closePopup) {
    donateBtn.addEventListener('click', () => donatePopup.style.display = 'flex');
    closePopup.addEventListener('click', () => {
      donatePopup.style.display = 'none';
      document.querySelectorAll(".account-text").forEach((acc) => (acc.textContent = ""));
      document.querySelectorAll(".cart-btn").forEach((btn) => btn.classList.remove("active"));
    });
  }

  document.querySelectorAll('.cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.donate-card');
      const text = parent.querySelector('.account-text');
      const show = text.style.display === 'block';
      text.style.display = show ? 'none' : 'block';
      if (!show) text.textContent = btn.dataset.account || "";
      btn.classList.toggle("active", !show);
    });
  });
});

/* ----------------- 후원 랭킹 & 게이지 ----------------- */
const qDonations = query(collection(db, "donations"), orderBy("amount", "desc"), orderBy("timestamp", "desc"));

onSnapshot(qDonations, (snapshot) => {
  const donations = [];
  let total = 0;
  let count = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    const amount = Number(d.amount) || 0;
    donations.push({ name: d.name || "Anonymous", amount });
    total += amount;
    count += 1;
  });

  updateRanking(donations);
  renderDonorInfo(count, total);
  animateGauge(total);
});

function updateRanking(donations) {
  rankingListEl.innerHTML = "";
  donations.forEach((donor, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="rank">${idx + 1}</span>
      <span class="name">${escapeHtml(donor.name)}</span>
      <span class="amount">₩${(donor.amount || 0).toLocaleString()}</span>`;
    rankingListEl.appendChild(li);
  });
}

function renderDonorInfo(count, total) {
  donorCountEl.textContent = `후원자 수: ${count}`;
  supportAmountEl.textContent = `₩${Math.round(total * 0.1).toLocaleString()}`;
}

function animateGauge(targetTotal) {
  if (animTimer) clearInterval(animTimer);
  const duration = 1200;
  const frameRate = 20;
  const frames = duration / frameRate;
  const delta = (targetTotal - displayedTotal) / frames;
  let f = 0;
  animTimer = setInterval(() => {
    f++; displayedTotal += delta;
    if (f >= frames) { displayedTotal = targetTotal; clearInterval(animTimer); }
    const percent = Math.min((displayedTotal / GOAL) * 100, 100);
    progressBarEl.style.width = `${percent}%`;
    progressBarEl.textContent = `₩${Math.floor(displayedTotal).toLocaleString()} / ₩${GOAL.toLocaleString()}`;
  }, frameRate);
}
// 채팅 헤더 오른쪽에 배지 삽입 (중복 생성 방지)
(() => {
  const header = document.querySelector(".chat-header");
  if (!header || header.querySelector(".online-badge")) return;

  const badge = document.createElement("span");
  badge.className = "online-badge";
  const lang = (localStorage.getItem("lang") || "ko") === "en";
  badge.innerHTML =
    `<span class="label" id="onlineLabel">${lang ? "Users Online: " : "현재 접속자수: "}</span>
     <span class="dot"></span>
     <span id="onlineCount">0</span>`;
  header.appendChild(badge);
})();

// XSS 방지용
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
