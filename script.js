// ✅ index.html에서 이미 initializeApp이 끝났다고 가정
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

/* ----------------- 공통 상태 ----------------- */
const db = getFirestore();
const auth = getAuth();
const provider = new GoogleAuthProvider();

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
let displayedTotal = 0;     // 게이지 애니메이션용 누적 표시값
let animTimer = null;

/* ----------------- 로그인 ----------------- */
window.signInWithGoogle = async () => {
  try { await signInWithPopup(auth, provider); }
  catch (e) { console.error("로그인 실패:", e); }
};
window.signOutFromGoogle = async () => {
  try { await signOut(auth); }
  catch (e) { console.error("로그아웃 실패:", e); }
};

onAuthStateChanged(auth, (user) => {
  const isLoggedIn = !!user;
  localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");

  if (isLoggedIn) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
  }

  const lang = localStorage.getItem("lang") || "ko";
  if (window.applyLang) window.applyLang(lang);
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
    timestamp: serverTimestamp(),
  });

  chatInput.value = "";
}
chatInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
});
sendMessageBtn?.addEventListener("click", sendMessage);

const qMessages = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(qMessages, (snapshot) => {
  if (!chatMessages) return;
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const wrap = document.createElement("div");
    wrap.className = "chat-message";
    wrap.innerHTML = `
      <img src="${msg.photoURL || 'default.png'}"
           class="chat-profile"
           style="border-color:${msg.color || '#7cfc00'};">
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
// 정렬: 금액 내림차순, 같은 금액이면 최신(timestamp desc)
const qDonations = query(
  collection(db, "donations"),
  orderBy("amount", "desc"),
  orderBy("timestamp", "desc")
);

onSnapshot(qDonations, (snapshot) => {
  const donations = [];
  let total = 0;
  let count = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    const amount = typeof d.amount === "number" ? d.amount : Number(d.amount) || 0;
    donations.push({ name: d.name || "Anonymous", amount });
    total += amount;
    count += 1;
  });

  // 🔄 삭제/수정도 자동 반영: 스냅샷에 남아있는 문서로 매번 재계산
  updateRanking(donations);
  renderDonorInfo(count, total);
  animateGauge(total);
});

/* ------------ 헬퍼들 ------------ */
function updateRanking(donations) {
  if (!rankingListEl) return;
  rankingListEl.innerHTML = "";
  donations.forEach((donor, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="rank">${idx + 1}</span>
      <span class="name">${escapeHtml(donor.name)}</span>
      <span class="amount">₩${(donor.amount||0).toLocaleString()}</span>`;
    rankingListEl.appendChild(li);
  });
  if (donations.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="name">아직 후원이 없습니다 😢</span>`;
    rankingListEl.appendChild(li);
  }
}

function renderDonorInfo(count, total) {
  if (donorCountEl) donorCountEl.textContent = `후원자 수: ${Number(count).toLocaleString()}`;
  if (supportAmountEl) {
    const tenPercent = Math.round(total * 0.1);
    supportAmountEl.textContent = `₩${tenPercent.toLocaleString()}`;
  }
}

function animateGauge(targetTotal) {
  if (!progressBarEl) return;

  // 이전 애니메이션 중지
  if (animTimer) { clearInterval(animTimer); animTimer = null; }

  const duration = 1200;
  const frameRate = 20;
  const frames = Math.max(1, Math.floor(duration / frameRate));
  const delta = (targetTotal - displayedTotal) / frames;
  let f = 0;

  animTimer = setInterval(() => {
    f++;
    displayedTotal += delta;

    if (f >= frames) {
      displayedTotal = targetTotal;
      clearInterval(animTimer);
      animTimer = null;
    }
    const percent = Math.min((displayedTotal / GOAL) * 100, 100);
    progressBarEl.style.width = `${percent}%`;
    progressBarEl.textContent =
      `₩${Math.floor(displayedTotal).toLocaleString()} / ₩${GOAL.toLocaleString()}`;
  }, frameRate);
}

// XSS 방지용
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
