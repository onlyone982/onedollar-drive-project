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

// ✅ 로그인 상태 감시
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;

    // ✅ [수정] 로그인 후 placeholder 변경
    chatInput.placeholder = placeholderAfterLogin;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;

    // ✅ [수정] 로그인 전 placeholder 변경
    chatInput.placeholder = placeholderBeforeLogin;
  }
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

// 실시간 수신 (자동 정렬: 금액 desc + 최신순)
const qDonations = query(
  collection(db, "donations"),
  orderBy("amount", "desc"),
  orderBy("timestamp", "desc")
);

onSnapshot(qDonations, (snapshot) => {
  const donations = [];
  totalDonation = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    donations.push(data);
    totalDonation += data.amount;
  });

  updateDonationGauge(totalDonation);
  updateRanking(donations);
});

function updateDonationGauge(total) {
  const goal = 1000000; // 목표 금액 (원 단위)
  const percent = Math.min((total / goal) * 100, 100);
  donationGauge.style.width = `${percent}%`;
  donationGauge.textContent = `${percent.toFixed(1)}%`;
}

// ✅ 중복 금액 시 최신 후원자 우선 순위
function updateRanking(donations) {
  rankingList.innerHTML = "";

  donations.forEach((donor, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="rank">${index + 1}</span>
      <span class="name">${donor.name}</span>
      <span class="amount">₩${donor.amount.toLocaleString()}</span>
    `;
    rankingList.appendChild(li);
  });
}
