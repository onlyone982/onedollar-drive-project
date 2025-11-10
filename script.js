// ✅ 1. Firebase SDK 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// ✅ 2. Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDTJFT5aBr2km6_Z-Q8gXdBvkKGxLVmOyo",
  authDomain: "onedollardrive-3bbee.firebaseapp.com",
  projectId: "onedollardrive-3bbee",
  storageBucket: "onedollardrive-3bbee.firebasestorage.app",
  messagingSenderId: "37980557245",
  appId: "1:37980557245:web:9c752ecf11cdb6ff270cd4",
  measurementId: "G-LWQCX5XZ9D"
};


// ✅ 3. Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ 4. HTML 요소
const loginBtn = document.querySelector(".login-button");
const logoutBtn = document.querySelector(".logout-button");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");

const placeholderBeforeLogin = "로그인 후 메시지를 입력하세요..."; 
const placeholderAfterLogin = "메시지를 남겨주세요!";

// ✅ 로그인 / 로그아웃
window.signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("로그인 실패:", e);
  }
};

window.signOutFromGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("로그아웃 실패:", e);
  }
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

  // ✅ 언어에 맞게 placeholder를 자동 반영
  const lang = localStorage.getItem("lang") || "ko";
  if (window.applyLang) window.applyLang(lang);
});


// ✅ 채팅 전송 기능
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

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
sendMessageBtn.addEventListener("click", sendMessage);

// ✅ 메시지 실시간 수신
const qMessages = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(qMessages, (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message");
    messageDiv.innerHTML = `
      <img src="${msg.photoURL || 'default.png'}"
           class="chat-profile"
           style="border-color: ${msg.color || '#7cfc00'};">
      <div>
        <span class="chat-username">${msg.name || 'Anonymous'}</span><br>
        <span>${msg.text}</span>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
});

// ✅ 후원 팝업
document.addEventListener("DOMContentLoaded", () => {
  const donateBtn = document.getElementById('donateBtn');
  const donatePopup = document.getElementById('donatePopup');
  const closePopup = document.getElementById('closePopup');

  if (donateBtn && donatePopup && closePopup) {
    donateBtn.addEventListener('click', () => {
      donatePopup.style.display = 'flex';
    });
    closePopup.addEventListener('click', () => {
      donatePopup.style.display = 'none';
      document.querySelectorAll(".account-text").forEach((acc) => (acc.textContent = ""));
      document.querySelectorAll(".cart-btn").forEach((btn) => btn.classList.remove("active"));
    });
  }
});


// ✅ 계좌번호 표시 토글
document.querySelectorAll('.cart-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.donate-card');
    const text = parent.querySelector('.account-text');

    if (text.style.display === 'block') {
      text.style.display = 'none';
      btn.classList.remove("active");
    } else {
      text.textContent = btn.dataset.account;
      text.style.display = 'block';
      btn.classList.add("active");
    }
  });
});

// ✅ 후원 게이지 + 랭킹
const donationGauge = document.querySelector("#donationGauge");
const rankingList = document.querySelector("#rankingList");
rankingList.innerHTML = "<p>Loading...</p>"; // ✅ 초기 로딩 메시지 표시
let totalDonation = 0;

// ✅ 실시간 후원 데이터 감시
const qDonations = query(
  collection(db, "donations"),
  orderBy("amount", "desc"),
  orderBy("timestamp", "desc")
);

onSnapshot(qDonations, (snapshot) => {
  const donations = [];
  let totalDonation = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    donations.push(data);
    totalDonation += data.amount;
  });

});
// ====== 상수 / 상태 ======
const GOAL_AMOUNT = 400000000; // 4억
let currentDisplayedTotal = 0; // 화면에 보여지는 총액(애니메이션용)
const progressBarEl = document.getElementById("progressBar");
const rankingListEl = document.getElementById("rankingList");

// ====== 실시간 후원 데이터 감시 (onSnapshot) ======
onSnapshot(qDonations, (snapshot) => {
  const donations = [];
  let totalDonation = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    // 안전하게 amount 확인
    const amount = (typeof data.amount === "number") ? data.amount : Number(data.amount) || 0;
    donations.push({ name: data.name || "Anonymous", amount, timestamp: data.timestamp || null });
    totalDonation += amount;
  });

  // 정렬(금액 내림차순, 동일 금액이면 timestamp 최신 우선)
  donations.sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    // timestamp 비교(없으면 0)
    const ta = a.timestamp ? a.timestamp.seconds || 0 : 0;
    const tb = b.timestamp ? b.timestamp.seconds || 0 : 0;
    return tb - ta;
  });

  // 화면 업데이트 호출
  animateProgressTo(totalDonation);
  renderRanking(donations);
  renderDonorInfo(donations.length, totalDonation);
});

// ====== 프로그레스바 자연스러운 애니메이션 함수 ======
function animateProgressTo(targetTotal) {
  if (!progressBarEl) return;
  // 멈춰 있는 애니메이션이 있다면 정리
  if (progressBarEl._animInterval) {
    clearInterval(progressBarEl._animInterval);
    progressBarEl._animInterval = null;
  }

  // 빠진 경우 방어
  targetTotal = Math.max(0, Number(targetTotal) || 0);

  // 애니메이션 설정
  const durationMs = 1200;         // 애니메이션 지속시간 (원하면 조정)
  const tickMs = 30;               // 업데이트 간격 (ms)
  const frames = Math.max(1, Math.round(durationMs / tickMs));
  const delta = (targetTotal - currentDisplayedTotal) / frames;
  let frame = 0;

  progressBarEl._animInterval = setInterval(() => {
    frame++;
    currentDisplayedTotal += delta;

    // 마지막 프레임이면 정확히 목표로 보정
    if (frame >= frames) {
      currentDisplayedTotal = targetTotal;
      clearInterval(progressBarEl._animInterval);
      progressBarEl._animInterval = null;
    }

    // 퍼센트 계산 및 DOM 반영
    const percent = Math.min((currentDisplayedTotal / GOAL_AMOUNT) * 100, 100);
    progressBarEl.style.width = percent + "%";
    progressBarEl.textContent = `₩${Math.floor(currentDisplayedTotal).toLocaleString()} / ₩${GOAL_AMOUNT.toLocaleString()}`;
  }, tickMs);
}

// ====== 랭킹 렌더링 ======
function renderRanking(donations) {
  if (!rankingListEl) return;
  rankingListEl.innerHTML = "";

  if (donations.length === 0) {
    rankingListEl.innerHTML = "<p>아직 후원이 없습니다 😢</p>";
    return;
  }

  donations.forEach((donor, index) => {
    const item = document.createElement("div");
    item.className = "ranking-item";
    item.innerHTML = `
      <span class="rank">${index + 1}</span>
      <span class="name">${escapeHtml(donor.name)}</span>
      <span class="amount">₩${donor.amount.toLocaleString()}</span>
    `;
    rankingListEl.appendChild(item);
  });
}

// ====== 후원자 수 + 10% 표시 ======
function renderDonorInfo(count, total) {
  const donorCountEl = document.getElementById("donorCount");
  const supportAmountEl = document.getElementById("supportAmount");

  if (donorCountEl) donorCountEl.textContent = `후원자 수: ${Number(count).toLocaleString()}`;
  if (supportAmountEl) {
    const tenPercent = Math.round(total * 0.1);
    supportAmountEl.textContent = `₩${tenPercent.toLocaleString()}`;
  }
}

// ====== 도우미: XSS 방지용 아주 간단한 escape ======
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

